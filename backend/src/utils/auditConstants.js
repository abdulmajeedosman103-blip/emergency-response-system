// backend/src/utils/auditConstants.js
// Audit domains shared between validation and the read API. Mirrors the frozen
// AuditAction enum (subset actually produced by the current feature set) and the
// AuditLog.entityType values the system currently writes.
const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_LOGGED_IN',
  'INCIDENT_CREATED',
  'INCIDENT_SOS_TRIGGERED',
  'INCIDENT_STATUS_CHANGED',
  'INCIDENT_PRIORITY_CHANGED',
  'INCIDENT_AI_SUGGESTED',
  'INCIDENT_CANCELLED',
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_ACCEPTED',
  'ASSIGNMENT_STATUS_CHANGED',
  'RESPONDER_AVAILABILITY_CHANGED',
  'SYSTEM',
];

const AUDIT_ENTITY_TYPES = ['USER', 'INCIDENT', 'ASSIGNMENT', 'RESPONDER'];

module.exports = { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES };