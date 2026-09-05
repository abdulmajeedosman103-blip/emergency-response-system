// backend/src/validators/incident.js
const { AppError } = require('../middleware/errorHandler');

const EMERGENCY_TYPES = ['MEDICAL', 'FIRE', 'ROAD_ACCIDENT', 'CRIME', 'NATURAL_DISASTER', 'OTHER'];
const EMERGENCY_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// These may never be supplied by the client for a new incident.
const PRIVILEGED_FIELDS = [
  'reporterId',
  'status',
  'verifiedById',
  'verifiedAt',
  'resolvedById',
  'resolvedAt',
  'cancelledById',
  'cancelledAt',
  'cancelReason',
  'assignedAt',
  'enRouteAt',
  'arrivedAt',
  'sourceSos',
];

function validateCreateIncident(req, res, next) {
  const issues = [];
  const body = req.body || {};

  for (const field of PRIVILEGED_FIELDS) {
    if (body[field] !== undefined) {
      issues.push(`Field "${field}" is server-controlled and cannot be set by the client.`);
    }
  }

  if (!EMERGENCY_TYPES.includes(body.type)) {
    issues.push('type must be one of: MEDICAL, FIRE, ROAD_ACCIDENT, CRIME, NATURAL_DISASTER, OTHER.');
  }

  if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
    issues.push('description is required.');
  }

  const lat = Number(body.locationLatitude);
  const lng = Number(body.locationLongitude);
  const latMissing = body.locationLatitude === undefined || body.locationLatitude === null;
  const lngMissing = body.locationLongitude === undefined || body.locationLongitude === null;

  if (latMissing || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    issues.push('locationLatitude must be a number between -90 and 90.');
  }
  if (lngMissing || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    issues.push('locationLongitude must be a number between -180 and 180.');
  }

  if (
    body.locationAddress !== undefined &&
    body.locationAddress !== null &&
    (typeof body.locationAddress !== 'string' || body.locationAddress.length > 255)
  ) {
    issues.push('locationAddress must be a string of at most 255 characters.');
  }

  if (
    body.peopleAffected !== undefined &&
    (Number(body.peopleAffected) !== Math.trunc(Number(body.peopleAffected)) ||
      Number(body.peopleAffected) < 1)
  ) {
    issues.push('peopleAffected must be an integer of at least 1.');
  }

  if (body.priority !== undefined && !EMERGENCY_PRIORITIES.includes(body.priority)) {
    issues.push('priority must be one of: LOW, MEDIUM, HIGH, CRITICAL.');
  }

  if (body.citizenContactConsent !== undefined && typeof body.citizenContactConsent !== 'boolean') {
    issues.push('citizenContactConsent must be a boolean.');
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  return next();
}

module.exports = { validateCreateIncident };