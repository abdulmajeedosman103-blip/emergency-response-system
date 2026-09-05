// frontend/src/utils/audit.js
// Human-readable presentation for the audit trail (labels + badge styles).
export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_LOGGED_IN',
  'INCIDENT_CREATED',
  'INCIDENT_SOS_TRIGGERED',
  'INCIDENT_STATUS_CHANGED',
  'INCIDENT_CANCELLED',
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_ACCEPTED',
  'ASSIGNMENT_STATUS_CHANGED',
  'RESPONDER_AVAILABILITY_CHANGED',
];

export const AUDIT_ENTITY_TYPES = ['USER', 'INCIDENT', 'ASSIGNMENT', 'RESPONDER'];

export const AUDIT_ACTION_LABELS = {
  USER_CREATED: 'User registered',
  USER_LOGGED_IN: 'User logged in',
  INCIDENT_CREATED: 'Incident reported',
  INCIDENT_SOS_TRIGGERED: 'SOS triggered',
  INCIDENT_STATUS_CHANGED: 'Incident status changed',
  INCIDENT_CANCELLED: 'Incident cancelled',
  ASSIGNMENT_CREATED: 'Responder assigned',
  ASSIGNMENT_ACCEPTED: 'Assignment accepted',
  ASSIGNMENT_STATUS_CHANGED: 'Assignment status changed',
  RESPONDER_AVAILABILITY_CHANGED: 'Availability changed',
};

export const AUDIT_ACTION_TONES = {
  USER_CREATED: 'bg-slate-100 text-slate-700',
  USER_LOGGED_IN: 'bg-slate-100 text-slate-700',
  INCIDENT_CREATED: 'bg-blue-50 text-blue-700',
  INCIDENT_SOS_TRIGGERED: 'bg-red-50 text-red-700',
  INCIDENT_STATUS_CHANGED: 'bg-indigo-50 text-indigo-700',
  INCIDENT_CANCELLED: 'bg-slate-100 text-slate-600',
  ASSIGNMENT_CREATED: 'bg-emerald-50 text-emerald-700',
  ASSIGNMENT_ACCEPTED: 'bg-emerald-50 text-emerald-700',
  ASSIGNMENT_STATUS_CHANGED: 'bg-emerald-50 text-emerald-700',
  RESPONDER_AVAILABILITY_CHANGED: 'bg-amber-50 text-amber-700',
};

export function formatAuditAction(action) {
  return AUDIT_ACTION_LABELS[action] || action;
}