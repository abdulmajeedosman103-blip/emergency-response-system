// backend/src/services/sosService.js
// SOS workflow — fast emergency alert with server-controlled privileged values.
//
// Duplicate/spam protection (in-process, no external infrastructure):
//   * Per-user sliding cooldown between successful SOS submissions.
//   * Default 60 seconds (configurable via SOS_COOLDOWN_SECONDS).
//   * Does not block indefinitely: the window always releases automatically.
//   * In-memory only — resets on server restart, which is acceptable for the
//     single-instance prototype architecture.
const prisma = require('../config/prisma');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const { PUBLIC_INCIDENT_FIELDS } = require('./incidentService');
const events = require('../sockets/events');
const auditService = require('./auditService');
const aiService = require('./aiService');

const lastSosByUser = new Map();

function retryDelaySeconds(userId) {
  const lastSentAt = lastSosByUser.get(userId);
  if (!lastSentAt) {
    return 0;
  }
  const cooldownMs = env.sosCooldownSeconds * 1000;
  const elapsedMs = Date.now() - lastSentAt;
  if (elapsedMs >= cooldownMs) {
    lastSosByUser.delete(userId);
    return 0;
  }
  return Math.ceil((cooldownMs - elapsedMs) / 1000);
}

function markSosSent(userId) {
  lastSosByUser.set(userId, Date.now());
}

async function createSos(userId, data, ipAddress) {
  const retryAfterSeconds = retryDelaySeconds(userId);
  if (retryAfterSeconds > 0) {
    throw new AppError(
      429,
      'You already sent an SOS recently. Please wait before sending another alert.',
      { retryAfterSeconds }
    );
  }

  const incident = await prisma.emergencyIncident.create({
    data: {
      reporterId: userId,
      type: data.type || 'OTHER',
      description: data.description
        ? data.description.trim()
        : 'Emergency SOS alert sent by the reporter.',
      locationLatitude: Number(data.locationLatitude),
      locationLongitude: Number(data.locationLongitude),
      locationAddress: data.locationAddress ? data.locationAddress.trim() : null,
      peopleAffected: 1,
      priority: 'CRITICAL',
      status: 'REPORTED',
      sourceSos: true,
      citizenContactConsent: false,
    },
    select: PUBLIC_INCIDENT_FIELDS,
  });

  markSosSent(userId);

  // Distinguishable high-priority event to all connected operators.
  events.emitIncidentToOperators('incident:sos', incident.id);

  // Audit only after the SOS committed. Minimal operational data only.
  await auditService.record({
    action: 'INCIDENT_SOS_TRIGGERED',
    actorId: userId,
    entityType: 'INCIDENT',
    entityId: incident.id,
    details: { type: incident.type, priority: incident.priority },
    ipAddress,
  });

  // AI triage after the SOS committed. Fully guarded — the SOS must never be
  // affected by AI availability; a failure is logged and the AI columns stay
  // null (no AI audit row, no AI event).
  await aiService.processNewIncident(incident.id);

  return incident;
}

module.exports = { createSos };