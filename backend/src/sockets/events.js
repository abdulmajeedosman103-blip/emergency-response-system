// backend/src/sockets/events.js
// Post-commit real-time event helpers used by services.
//
// Every function re-reads the freshly committed record so payloads always
// reflect final database state — an event is only emitted after the
// underlying Prisma write/transaction has succeeded. Emitters are best-effort:
// a failure while reading/emitting must never break the already-committed
// workflow, so all helpers swallow and log errors rather than rejecting.
const prisma = require('../config/prisma');
const socket = require('./socket');

// Public incident shape mirrored locally to avoid a require cycle with the
// services (services import events.js, so events.js must not import services).
const INCIDENT_PUBLIC_FIELDS = {
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

// Incident payloads carry the reporter id so the citizen client can match
// "my incident". Operators already see reporter identity via REST.
const INCIDENT_EVENT_SELECT = {
  ...INCIDENT_PUBLIC_FIELDS,
  reporterId: true,
};

// Assignment payloads include the assignment summary plus responder identity
// and the incident's public shape for the responder/operator dashboards.
const ASSIGNMENT_EVENT_SELECT = {
  id: true,
  status: true,
  responderId: true,
  distanceKmAtAssignment: true,
  assignedAt: true,
  incidentId: true,
  responder: {
    select: {
      id: true,
      userId: true,
      specialization: true,
      user: { select: { id: true, fullName: true } },
    },
  },
  incident: { select: INCIDENT_PUBLIC_FIELDS },
};

async function getIncidentEventData(incidentId) {
  return prisma.emergencyIncident.findUnique({
    where: { id: incidentId },
    select: INCIDENT_EVENT_SELECT,
  });
}

async function getAssignmentEventData(assignmentId) {
  return prisma.emergencyAssignment.findUnique({
    where: { id: assignmentId },
    select: ASSIGNMENT_EVENT_SELECT,
  });
}

// Incident event sent to the operator room (all connected operators).
async function emitIncidentToOperators(event, incidentId) {
  try {
    const incident = await getIncidentEventData(incidentId);
    if (!incident) {
      return;
    }
    socket.emitToRole('OPERATOR', event, { incident });
  } catch (err) {
    console.error('[socket/events] emitIncidentToOperators failed:', err.message);
  }
}

// Incident event sent to a single user room (the reporting citizen).
async function emitIncidentToUser(event, userId, incidentId) {
  try {
    const incident = await getIncidentEventData(incidentId);
    if (!incident) {
      return;
    }
    socket.emitToUser(userId, event, { incident });
  } catch (err) {
    console.error('[socket/events] emitIncidentToUser failed:', err.message);
  }
}

// Uses the canonical "incident:updated" name for in-place status changes.
function emitIncidentUpdatedToUser(userId, incidentId) {
  return emitIncidentToUser('incident:updated', userId, incidentId);
}

function emitIncidentUpdatedToOperators(incidentId) {
  return emitIncidentToOperators('incident:updated', incidentId);
}

async function emitAssignmentToOperators(event, assignmentId) {
  try {
    const assignment = await getAssignmentEventData(assignmentId);
    if (!assignment) {
      return;
    }
    socket.emitToRole('OPERATOR', event, { assignment });
  } catch (err) {
    console.error('[socket/events] emitAssignmentToOperators failed:', err.message);
  }
}

async function emitAssignmentToResponder(event, assignmentId, responderUserId) {
  try {
    const assignment = await getAssignmentEventData(assignmentId);
    if (!assignment) {
      return;
    }
    socket.emitToUser(responderUserId, event, { assignment });
  } catch (err) {
    console.error('[socket/events] emitAssignmentToResponder failed:', err.message);
  }
}

module.exports = {
  emitIncidentToOperators,
  emitIncidentToUser,
  emitIncidentUpdatedToUser,
  emitIncidentUpdatedToOperators,
  emitAssignmentToOperators,
  emitAssignmentToResponder,
  getIncidentEventData,
  getAssignmentEventData,
};