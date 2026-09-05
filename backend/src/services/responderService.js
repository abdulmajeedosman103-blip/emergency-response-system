// backend/src/services/responderService.js
// Responder management: operator-side (list/assign) and responder-side (me,
// assignments, accept, availability). Responder identity always derives from
// the authenticated user's JWT via the responder.userId relation.
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const { PUBLIC_INCIDENT_FIELDS } = require('./incidentService');
const { haversineKm } = require('../utils/haversine');
const events = require('../sockets/events');
const { emitToUser } = require('../sockets/socket');
const notificationService = require('./notificationService');
const auditService = require('./auditService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Assignment states that count as an active engagement (everything terminal is excluded).
const ACTIVE_ASSIGNMENT_STATUSES = ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'];

// Responder-initiated single-hop transitions. `from` is the only valid source
// state; incident sync keeps assignment and incident consistent atomically.
// COMPLETED has no incidentStatus — resolution is an operator/other-role
// workflow (schema exposes resolvedById/IncidentResolver for that).
const ASSIGNMENT_TRANSITIONS = {
  EN_ROUTE: {
    from: 'ACCEPTED',
    label: 'en route',
    incidentStatus: 'RESPONDER_EN_ROUTE',
    incidentAtField: 'enRouteAt',
  },
  ARRIVED: {
    from: 'EN_ROUTE',
    label: 'arrived',
    incidentStatus: 'RESPONDER_ARRIVED',
    incidentAtField: 'arrivedAt',
  },
  COMPLETED: {
    from: 'ARRIVED',
    label: 'completed',
    incidentStatus: null,
    assignmentAtField: 'completedAt',
  },
};

const RESPONDER_SUMMARY_FIELDS = {
  id: true,
  specialization: true,
  availability: true,
  currentLatitude: true,
  currentLongitude: true,
  lastLocationAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, fullName: true, email: true } },
  organization: { select: { id: true, name: true, type: true } },
};

const ASSIGNMENT_FIELDS = {
  id: true,
  status: true,
  responderId: true,
  distanceKmAtAssignment: true,
  assignedAt: true,
  respondedAt: true,
  completedAt: true,
  incident: { select: PUBLIC_INCIDENT_FIELDS },
};

async function getResponderByUserId(userId) {
  const responder = await prisma.responder.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!responder) {
    throw new AppError(404, 'Responder profile not found.');
  }
  return responder;
}

async function listResponders(filters) {
  const where = {};
  if (filters.availability) where.availability = filters.availability;
  if (filters.specialization) where.specialization = filters.specialization;
  if (filters.organization) where.organization = { name: filters.organization };

  const responders = await prisma.responder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: RESPONDER_SUMMARY_FIELDS,
  });

  const activeAssignments = await prisma.emergencyAssignment.findMany({
    where: { status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
    select: { id: true, status: true, responderId: true, createdAt: true },
  });
  const activeByResponder = {};
  for (const row of activeAssignments) {
    const current = activeByResponder[row.responderId];
    if (!current || current.createdAt < row.createdAt) {
      activeByResponder[row.responderId] = row;
    }
  }

  return responders.map((responder) => {
    const active = activeByResponder[responder.id];
    return {
      ...responder,
      activeAssignmentId: active ? active.id : null,
      activeAssignmentStatus: active ? active.status : null,
    };
  });
}

async function assignResponder(operatorId, incidentId, responderId, ipAddress) {
  if (!UUID_RE.test(incidentId)) {
    throw new AppError(404, 'Incident not found.');
  }
  if (!UUID_RE.test(responderId)) {
    throw new AppError(404, 'Responder not found.');
  }

  const incident = await prisma.emergencyIncident.findUnique({
    where: { id: incidentId },
    select: { id: true, status: true, locationLatitude: true, locationLongitude: true, reporterId: true },
  });
  if (!incident) {
    throw new AppError(404, 'Incident not found.');
  }
  if (incident.status !== 'VERIFIED') {
    throw new AppError(409, 'Only VERIFIED incidents can be assigned to a responder.', {
      currentStatus: incident.status,
      allowedFrom: 'VERIFIED',
    });
  }

  const responder = await prisma.responder.findUnique({
    where: { id: responderId },
    select: { id: true, userId: true, availability: true, currentLatitude: true, currentLongitude: true },
  });
  if (!responder) {
    throw new AppError(404, 'Responder not found.');
  }
  if (responder.availability !== 'AVAILABLE') {
    throw new AppError(409, 'Responder is not currently available.', {
      availability: responder.availability,
    });
  }

  const activeForResponder = await prisma.emergencyAssignment.findFirst({
    where: { responderId, status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
    select: { id: true },
  });
  if (activeForResponder) {
    throw new AppError(409, 'Responder already has an active assignment.', {
      assignmentId: activeForResponder.id,
    });
  }

  const activeForIncident = await prisma.emergencyAssignment.findFirst({
    where: { incidentId, status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
    select: { id: true },
  });
  if (activeForIncident) {
    throw new AppError(409, 'Incident already has an active assignment.', {
      assignmentId: activeForIncident.id,
    });
  }

  // Distance is computed server-side (Haversine). Coords on the incident are
  // required by the schema; responder coords are nullable, so distance may be
  // null when the responder has no reported location.
  const distanceKmAtAssignment =
    responder.currentLatitude != null && responder.currentLongitude != null
      ? Math.round(
          haversineKm(
            incident.locationLatitude,
            incident.locationLongitude,
            responder.currentLatitude,
            responder.currentLongitude
          ) * 1000
        ) / 1000
      : null;

  const now = new Date();

  // Assignment creation + incident status update succeed or fail together.
  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.emergencyAssignment.create({
      data: {
        incidentId,
        responderId,
        assignedById: operatorId,
        status: 'PENDING',
        distanceKmAtAssignment,
        assignedAt: now,
      },
    });
    await tx.emergencyIncident.update({
      where: { id: incidentId },
      data: { status: 'RESPONDER_ASSIGNED', assignedAt: now },
    });
    return created;
  });

  // Emitted only after the transaction commits.
  events.emitAssignmentToResponder('assignment:created', assignment.id, responder.userId);
  events.emitIncidentUpdatedToOperators(incidentId);
  events.emitIncidentUpdatedToUser(incident.reporterId, incidentId);

  const responderNotification = await notificationService.createNotification(responder.userId, {
    type: 'RESPONDER_ASSIGNED',
    title: 'Responder assigned',
    message: 'You have been assigned to an emergency incident.',
    data: { incidentId, assignmentId: assignment.id },
  });
  emitToUser(responder.userId, 'notification:created', responderNotification);

  const citizenNotification = await notificationService.createNotification(incident.reporterId, {
    type: 'RESPONDER_ASSIGNED',
    title: 'Responder assigned',
    message: 'A responder has been assigned to your incident.',
    data: { incidentId },
  });
  emitToUser(incident.reporterId, 'notification:created', citizenNotification);

  // Audit only after the assignment transaction committed.
  await auditService.record({
    action: 'ASSIGNMENT_CREATED',
    actorId: operatorId,
    entityType: 'ASSIGNMENT',
    entityId: assignment.id,
    details: { incidentId, responderId },
    ipAddress,
  });

  return assignment;
}

async function getMyProfile(userId) {
  const responder = await prisma.responder.findUnique({
    where: { userId },
    select: RESPONDER_SUMMARY_FIELDS,
  });
  if (!responder) {
    throw new AppError(404, 'Responder profile not found.');
  }
  return responder;
}

async function listMyAssignments(userId, filters) {
  const responder = await getResponderByUserId(userId);
  const where = { responderId: responder.id };
  if (filters.status) where.status = filters.status;

  const { page, limit } = filters;
  const [assignments, total] = await Promise.all([
    prisma.emergencyAssignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: ASSIGNMENT_FIELDS,
    }),
    prisma.emergencyAssignment.count({ where }),
  ]);

  return {
    assignments,
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function getAssignmentById(userId, assignmentId) {
  const responder = await getResponderByUserId(userId);
  if (!UUID_RE.test(assignmentId)) {
    throw new AppError(404, 'Assignment not found.');
  }
  const assignment = await prisma.emergencyAssignment.findUnique({
    where: { id: assignmentId },
    select: ASSIGNMENT_FIELDS,
  });
  if (!assignment) {
    throw new AppError(404, 'Assignment not found.');
  }
  if (assignment.responderId !== responder.id) {
    throw new AppError(403, 'You can only view your own assignments.');
  }
  return assignment;
}

async function acceptAssignment(userId, assignmentId, ipAddress) {
  const responder = await getResponderByUserId(userId);
  if (!UUID_RE.test(assignmentId)) {
    throw new AppError(404, 'Assignment not found.');
  }
  const assignment = await prisma.emergencyAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      status: true,
      responderId: true,
      incidentId: true,
      responder: { select: { userId: true } },
    },
  });
  if (!assignment) {
    throw new AppError(404, 'Assignment not found.');
  }
  if (assignment.responderId !== responder.id) {
    throw new AppError(403, 'You can only accept your own assignments.');
  }
  if (assignment.status !== 'PENDING') {
    throw new AppError(409, 'Only PENDING assignments can be accepted.', {
      currentStatus: assignment.status,
    });
  }
  const updated = await prisma.emergencyAssignment.update({
    where: { id: assignmentId },
    data: { status: 'ACCEPTED', respondedAt: new Date() },
    select: ASSIGNMENT_FIELDS,
  });

  // Emitted only after the update commits.
  events.emitAssignmentToOperators('assignment:accepted', assignmentId);
  events.emitAssignmentToResponder('assignment:accepted', assignmentId, assignment.responder.userId);

  // Audit only after the update committed.
  await auditService.record({
    action: 'ASSIGNMENT_ACCEPTED',
    actorId: userId,
    entityType: 'ASSIGNMENT',
    entityId: assignmentId,
    details: { incidentId: assignment.incidentId },
    ipAddress,
  });

  return updated;
}

// Generic responder-driven assignment transition. Validates ownership (403),
// UUID/missing (404), and the only allowed source state (409) before writing.
// EN_ROUTE/ARRIVED update the assignment AND the linked incident atomically.
async function transitionAssignment(userId, assignmentId, nextStatus, ipAddress) {
  const rule = ASSIGNMENT_TRANSITIONS[nextStatus];
  const responder = await getResponderByUserId(userId);
  if (!UUID_RE.test(assignmentId)) {
    throw new AppError(404, 'Assignment not found.');
  }

  const assignment = await prisma.emergencyAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, status: true, responderId: true, incidentId: true },
  });
  if (!assignment) {
    throw new AppError(404, 'Assignment not found.');
  }
  if (assignment.responderId !== responder.id) {
    throw new AppError(403, 'You can only update your own assignments.');
  }
  if (assignment.status !== rule.from) {
    throw new AppError(409, `Only ${rule.from} assignments can be marked ${rule.label}.`, {
      currentStatus: assignment.status,
      requiredStatus: rule.from,
    });
  }

  const now = new Date();
  const assignmentData = { status: nextStatus };
  if (rule.assignmentAtField) {
    assignmentData[rule.assignmentAtField] = now;
  }

  let updated;
  if (!rule.incidentStatus) {
    updated = await prisma.emergencyAssignment.update({
      where: { id: assignmentId },
      data: assignmentData,
      select: ASSIGNMENT_FIELDS,
    });
  } else {
    updated = await prisma.$transaction(async (tx) => {
      await tx.emergencyAssignment.update({
        where: { id: assignmentId },
        data: assignmentData,
      });
      await tx.emergencyIncident.update({
        where: { id: assignment.incidentId },
        data: { status: rule.incidentStatus, [rule.incidentAtField]: now },
      });
      // Re-select after both writes so the incident relation reflects the new state.
      return tx.emergencyAssignment.findUnique({
        where: { id: assignmentId },
        select: ASSIGNMENT_FIELDS,
      });
    });
  }

  // Emitted only after the update/transaction commits.
  const eventName = `assignment:${nextStatus.toLowerCase()}`;
  events.emitAssignmentToOperators(eventName, assignmentId);
  const reporter = await prisma.emergencyIncident.findUnique({
    where: { id: assignment.incidentId },
    select: { reporterId: true },
  });
  if (reporter) {
    events.emitIncidentUpdatedToUser(reporter.reporterId, assignment.incidentId);
  }

  // Audit only after the write/transaction committed.
  await auditService.record({
    action: 'ASSIGNMENT_STATUS_CHANGED',
    actorId: userId,
    entityType: 'ASSIGNMENT',
    entityId: assignmentId,
    details: { from: rule.from, to: nextStatus },
    ipAddress,
  });

  return updated;
}

function markEnRoute(userId, assignmentId, ipAddress) {
  return transitionAssignment(userId, assignmentId, 'EN_ROUTE', ipAddress);
}

function markArrived(userId, assignmentId, ipAddress) {
  return transitionAssignment(userId, assignmentId, 'ARRIVED', ipAddress);
}

function markCompleted(userId, assignmentId, ipAddress) {
  return transitionAssignment(userId, assignmentId, 'COMPLETED', ipAddress);
}

async function updateAvailability(userId, availability, ipAddress) {
  const responder = await prisma.responder.findUnique({
    where: { userId },
    select: { id: true, availability: true },
  });
  if (!responder) {
    throw new AppError(404, 'Responder profile not found.');
  }

  const updated = await prisma.responder.update({
    where: { id: responder.id },
    data: { availability },
    select: RESPONDER_SUMMARY_FIELDS,
  });

  // Audit only after the update committed.
  await auditService.record({
    action: 'RESPONDER_AVAILABILITY_CHANGED',
    actorId: userId,
    entityType: 'RESPONDER',
    entityId: responder.id,
    details: { from: responder.availability, to: availability },
    ipAddress,
  });

  return updated;
}

module.exports = {
  listResponders,
  assignResponder,
  getMyProfile,
  listMyAssignments,
  getAssignmentById,
  acceptAssignment,
  markEnRoute,
  markArrived,
  markCompleted,
  updateAvailability,
};