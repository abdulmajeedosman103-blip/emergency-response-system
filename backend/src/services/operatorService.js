// backend/src/services/operatorService.js
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const { PUBLIC_INCIDENT_FIELDS } = require('./incidentService');
const events = require('../sockets/events');
const { emitToUser } = require('../sockets/socket');
const notificationService = require('./notificationService');
const auditService = require('./auditService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Operational detail = public shape + every workflow field on the incident.
const OPERATOR_DETAIL_FIELDS = {
  ...PUBLIC_INCIDENT_FIELDS,
  // Decision-support AI fields are operator-only (never exposed to citizens).
  aiCategorySuggestion: true,
  aiPrioritySuggestion: true,
  aiConfidence: true,
  aiOverridden: true,
  aiProcessedAt: true,
  verifiedById: true,
  verifiedAt: true,
  resolvedById: true,
  resolvedAt: true,
  cancelledById: true,
  cancelledAt: true,
  cancelReason: true,
  assignedAt: true,
  enRouteAt: true,
  arrivedAt: true,
  resolvedBy: { select: { id: true, fullName: true } },
  cancelledBy: { select: { id: true, fullName: true } },
};

// List rows: public shape + the compact AI indicator for queue chips.
const OPERATOR_LIST_FIELDS = {
  ...PUBLIC_INCIDENT_FIELDS,
  aiCategorySuggestion: true,
  aiPrioritySuggestion: true,
  aiConfidence: true,
  aiOverridden: true,
  aiProcessedAt: true,
};

// Assignment states that count as an active engagement (mirrors
// responderService). Used to keep assignments consistent on cancellation.
const ACTIVE_ASSIGNMENT_STATUSES = ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'];

// Single source of truth for operator-driven incident closure. RESOLVE is the
// official closure after a responder has reached the scene; CANCEL is for
// false reports, invalid emergencies, and responses called off before arrival.
// Both terminal statuses are excluded from each other's allowed source states.
const INCIDENT_TRANSITIONS = {
  RESOLVE: {
    label: 'resolved',
    status: 'RESOLVED',
    actorIdField: 'resolvedById',
    actorAtField: 'resolvedAt',
    allowedFrom: ['RESPONDER_ARRIVED'],
  },
  CANCEL: {
    label: 'cancelled',
    status: 'CANCELLED',
    actorIdField: 'cancelledById',
    actorAtField: 'cancelledAt',
    allowedFrom: ['REPORTED', 'VERIFIED', 'RESPONDER_ASSIGNED', 'RESPONDER_EN_ROUTE'],
  },
};

// Only minimal operational identity is exposed. Phone contact is withheld
// unless the reporter gave citizenContactConsent.
const REPORTER_FIELDS = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
};

async function listIncidents(filters) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.type) where.type = filters.type;
  if (filters.sourceSos !== null && filters.sourceSos !== undefined) {
    where.sourceSos = filters.sourceSos;
  }

  const { page, limit } = filters;

  const [incidents, total] = await Promise.all([
    prisma.emergencyIncident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: OPERATOR_LIST_FIELDS,
    }),
    prisma.emergencyIncident.count({ where }),
  ]);

  return {
    incidents,
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function getIncidentByIdOrThrow(id) {
  if (!UUID_RE.test(id)) {
    throw new AppError(404, 'Incident not found.');
  }

  const incident = await prisma.emergencyIncident.findUnique({
    where: { id },
    select: { ...OPERATOR_DETAIL_FIELDS, reporter: { select: REPORTER_FIELDS } },
  });

  if (!incident) {
    throw new AppError(404, 'Incident not found.');
  }
  return incident;
}

function present(incident) {
  const { reporter, ...publicIncident } = incident;
  const reporterInfo = {
    id: reporter.id,
    fullName: reporter.fullName,
    email: reporter.email,
  };
  if (incident.citizenContactConsent && reporter.phone) {
    reporterInfo.phone = reporter.phone;
  }
  return { ...publicIncident, reporter: reporterInfo };
}

async function getIncidentDetail(id) {
  return present(await getIncidentByIdOrThrow(id));
}

async function verifyIncident(operatorId, id, ipAddress) {
  if (!UUID_RE.test(id)) {
    throw new AppError(404, 'Incident not found.');
  }

  const existing = await prisma.emergencyIncident.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new AppError(404, 'Incident not found.');
  }

  if (existing.status !== 'REPORTED') {
    throw new AppError(409, 'Only incidents in REPORTED status can be verified.', {
      currentStatus: existing.status,
    });
  }

  // Verifier identity and timestamp derive from the server/JWT — not the client.
  await prisma.emergencyIncident.update({
    where: { id },
    data: { status: 'VERIFIED', verifiedById: operatorId, verifiedAt: new Date() },
  });

  // Emitted after commit: operators monitor all verifications; the reporter is
  // notified persistently + in real time.
  const incident = await getIncidentByIdOrThrow(id).then(present);
  events.emitIncidentToOperators('incident:verified', id);
  events.emitIncidentToUser('incident:verified', incident.reporter.id, id);
  const notification = await notificationService.createNotification(incident.reporter.id, {
    type: 'INCIDENT_VERIFIED',
    title: 'Incident verified',
    message: 'Your emergency report has been verified.',
    data: { incidentId: id },
  });
  emitToUser(incident.reporter.id, 'notification:created', notification);

  // Audit only after the update committed.
  await auditService.record({
    action: 'INCIDENT_STATUS_CHANGED',
    actorId: operatorId,
    entityType: 'INCIDENT',
    entityId: id,
    details: { from: existing.status, to: 'VERIFIED' },
    ipAddress,
  });

  return incident;
}

// Generic operator-driven incident closure (RESOLVE/CANCEL). Identity and
// timestamps always derive from the JWT + server clock — never the request
// body. RESOLVE touches a single record; CANCEL may also update active
// assignments within the same transaction so no cancelled incident can keep a
// live PENDING/ACCEPTED/EN_ROUTE/ARRIVED assignment.
async function transitionIncident(operatorId, id, actionKey, ipAddress) {
  const rule = INCIDENT_TRANSITIONS[actionKey];

  if (!UUID_RE.test(id)) {
    throw new AppError(404, 'Incident not found.');
  }

  const existing = await prisma.emergencyIncident.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new AppError(404, 'Incident not found.');
  }

  if (!rule.allowedFrom.includes(existing.status)) {
    throw new AppError(
      409,
      `Only incidents in ${rule.allowedFrom.join(', ')} status can be ${rule.label}.`,
      { currentStatus: existing.status, allowedFrom: rule.allowedFrom }
    );
  }

  const now = new Date();
  const incidentData = {
    status: rule.status,
    [rule.actorIdField]: operatorId,
    [rule.actorAtField]: now,
  };

  if (actionKey === 'CANCEL') {
    // Cancel any live assignment for the incident (at most one exists because
    // assignResponder guards against a second active assignment). Responder
    // availability is intentionally NOT auto-flipped — it stays manual.
    await prisma.$transaction(async (tx) => {
      await tx.emergencyAssignment.updateMany({
        where: { incidentId: id, status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
        data: { status: 'CANCELLED' },
      });
      await tx.emergencyIncident.update({ where: { id }, data: incidentData });
    });
  } else {
    await prisma.emergencyIncident.update({ where: { id }, data: incidentData });
  }

  // Emitted only after the write/transaction has committed.
  const incident = await getIncidentByIdOrThrow(id).then(present);
  const isResolve = actionKey === 'RESOLVE';
  const eventName = isResolve ? 'incident:resolved' : 'incident:cancelled';
  events.emitIncidentToOperators(eventName, id);
  events.emitIncidentToUser(eventName, incident.reporter.id, id);

  const notification = await notificationService.createNotification(incident.reporter.id, {
    type: isResolve ? 'INCIDENT_RESOLVED' : 'INCIDENT_CANCELLED',
    title: isResolve ? 'Incident resolved' : 'Incident cancelled',
    message: isResolve
      ? 'Your emergency incident has been resolved.'
      : 'Your emergency incident has been cancelled.',
    data: { incidentId: id },
  });
  emitToUser(incident.reporter.id, 'notification:created', notification);

  // Audit only after the write/transaction committed. Exactly one row per op.
  await auditService.record({
    action: isResolve ? 'INCIDENT_STATUS_CHANGED' : 'INCIDENT_CANCELLED',
    actorId: operatorId,
    entityType: 'INCIDENT',
    entityId: id,
    details: { from: existing.status, to: rule.status },
    ipAddress,
  });

  return incident;
}

function resolveIncident(operatorId, id, ipAddress) {
  return transitionIncident(operatorId, id, 'RESOLVE', ipAddress);
}

function cancelIncident(operatorId, id, ipAddress) {
  return transitionIncident(operatorId, id, 'CANCEL', ipAddress);
}

module.exports = { listIncidents, getIncidentDetail, verifyIncident, resolveIncident, cancelIncident };