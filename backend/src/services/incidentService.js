// backend/src/services/incidentService.js
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const events = require('../sockets/events');
const auditService = require('./auditService');
const aiService = require('./aiService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PUBLIC_INCIDENT_FIELDS = {
  id: true,
  type: true,
  description: true,
  locationLatitude: true,
  locationLongitude: true,
  locationAddress: true,
  peopleAffected: true,
  priority: true,
  status: true,
  citizenContactConsent: true,
  sourceSos: true,
  createdAt: true,
  updatedAt: true,
};

async function createIncident(userId, data, ipAddress) {
  // Only citizen-submitted fields are consumed; everything else stays server-controlled.
  const incident = await prisma.emergencyIncident.create({
    data: {
      reporterId: userId,
      type: data.type,
      description: data.description.trim(),
      locationLatitude: Number(data.locationLatitude),
      locationLongitude: Number(data.locationLongitude),
      locationAddress: data.locationAddress ? data.locationAddress.trim() : null,
      peopleAffected: Number(data.peopleAffected ?? 1),
      priority: data.priority ?? 'MEDIUM',
      citizenContactConsent: data.citizenContactConsent ?? false,
      status: 'REPORTED',
      sourceSos: false,
    },
    select: PUBLIC_INCIDENT_FIELDS,
  });

  // Emitted only after the create has committed.
  events.emitIncidentToOperators('incident:created', incident.id);

  // Audit only after the create committed. Minimal operational data only.
  await auditService.record({
    action: 'INCIDENT_CREATED',
    actorId: userId,
    entityType: 'INCIDENT',
    entityId: incident.id,
    details: { type: incident.type, priority: incident.priority },
    ipAddress,
  });

  // AI triage runs only after the incident exists. It is fully guarded: a
  // provider or persistence failure is logged and swallowed, so emergency
  // reporting availability always wins over AI availability. Any AI fields
  // remain null when the AI path does not complete.
  await aiService.processNewIncident(incident.id);

  return incident;
}

async function getMyIncidents(userId) {
  return prisma.emergencyIncident.findMany({
    where: { reporterId: userId },
    orderBy: { createdAt: 'desc' },
    select: PUBLIC_INCIDENT_FIELDS,
  });
}

async function getIncidentById(userId, incidentId) {
  if (!UUID_RE.test(incidentId)) {
    throw new AppError(404, 'Incident not found.');
  }

  const incident = await prisma.emergencyIncident.findFirst({
    where: { id: incidentId, reporterId: userId },
    select: PUBLIC_INCIDENT_FIELDS,
  });

  if (!incident) {
    const exists = await prisma.emergencyIncident.count({ where: { id: incidentId } });
    if (exists === 0) {
      throw new AppError(404, 'Incident not found.');
    }
    throw new AppError(403, 'You do not have access to this incident.');
  }

  return incident;
}

module.exports = { createIncident, getMyIncidents, getIncidentById, PUBLIC_INCIDENT_FIELDS };