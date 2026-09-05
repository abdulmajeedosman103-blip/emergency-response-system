// backend/src/validators/sos.js
const { AppError } = require('../middleware/errorHandler');

const EMERGENCY_TYPES = ['MEDICAL', 'FIRE', 'ROAD_ACCIDENT', 'CRIME', 'NATURAL_DISASTER', 'OTHER'];

// These may never be supplied by the client for an SOS — all are server-controlled.
const SOS_PRIVILEGED_FIELDS = [
  'reporterId',
  'status',
  'priority',
  'peopleAffected',
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
  'citizenContactConsent',
];

function validateSos(req, res, next) {
  const issues = [];
  const body = req.body || {};

  for (const field of SOS_PRIVILEGED_FIELDS) {
    if (body[field] !== undefined) {
      issues.push(`Field "${field}" is server-controlled and cannot be set by the client.`);
    }
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
    body.description !== undefined &&
    body.description !== null &&
    (typeof body.description !== 'string' || body.description.length > 500)
  ) {
    issues.push('description must be a string of at most 500 characters.');
  }

  if (body.type !== undefined && !EMERGENCY_TYPES.includes(body.type)) {
    issues.push('type must be one of: MEDICAL, FIRE, ROAD_ACCIDENT, CRIME, NATURAL_DISASTER, OTHER.');
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  return next();
}

module.exports = { validateSos };