// backend/src/validators/responder.js
const { AppError } = require('../middleware/errorHandler');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AVAILABILITIES = ['AVAILABLE', 'BUSY', 'OFFLINE'];
const SPECIALIZATIONS = [
  'MEDICAL',
  'FIRE',
  'ROAD_ACCIDENT',
  'CRIME',
  'NATURAL_DISASTER',
  'OTHER',
];
const ASSIGNMENT_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EN_ROUTE',
  'ARRIVED',
  'COMPLETED',
  'CANCELLED',
];

function validateResponderListQuery(req, res, next) {
  const issues = [];
  const q = req.query || {};
  const filters = {};

  if (q.availability !== undefined) {
    if (!AVAILABILITIES.includes(q.availability)) {
      issues.push(`Query "availability" must be one of: ${AVAILABILITIES.join(', ')}.`);
    } else {
      filters.availability = q.availability;
    }
  }

  if (q.specialization !== undefined) {
    if (!SPECIALIZATIONS.includes(q.specialization)) {
      issues.push(`Query "specialization" must be one of: ${SPECIALIZATIONS.join(', ')}.`);
    } else {
      filters.specialization = q.specialization;
    }
  }

  if (q.organization !== undefined) {
    if (typeof q.organization !== 'string' || q.organization.length > 160) {
      issues.push('Query "organization" must be a string of at most 160 characters.');
    } else {
      filters.organization = q.organization;
    }
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  req.responderFilters = filters;
  return next();
}

function validateAssignBody(req, res, next) {
  const issues = [];
  const b = req.body || {};
  const keys = Object.keys(b);

  if (keys.length !== 1 || !keys.includes('responderId')) {
    issues.push('Request body must contain exactly "responderId".');
  }
  if (b.responderId !== undefined && (typeof b.responderId !== 'string' || !UUID_RE.test(b.responderId))) {
    issues.push('responderId must be a valid UUID.');
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  return next();
}

function validateAvailabilityBody(req, res, next) {
  const issues = [];
  const b = req.body || {};
  const keys = Object.keys(b);

  if (keys.length !== 1 || !keys.includes('availability')) {
    issues.push('Request body must contain exactly "availability".');
  }
  if (b.availability !== undefined && !AVAILABILITIES.includes(b.availability)) {
    issues.push(`availability must be one of: ${AVAILABILITIES.join(', ')}.`);
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  return next();
}

function validateMyAssignmentsQuery(req, res, next) {
  const issues = [];
  const q = req.query || {};
  const filters = { page: 1, limit: 50 };

  if (q.status !== undefined && q.status !== '') {
    if (!ASSIGNMENT_STATUSES.includes(q.status)) {
      issues.push(`Query "status" must be one of: ${ASSIGNMENT_STATUSES.join(', ')}.`);
    } else {
      filters.status = q.status;
    }
  }

  if (q.page !== undefined) {
    const p = Number(q.page);
    if (!Number.isInteger(p) || p < 1) {
      issues.push('Query "page" must be a positive integer.');
    } else {
      filters.page = p;
    }
  }

  if (q.limit !== undefined) {
    const l = Number(q.limit);
    if (!Number.isInteger(l) || l < 1 || l > 100) {
      issues.push('Query "limit" must be an integer between 1 and 100.');
    } else {
      filters.limit = l;
    }
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  req.assignmentFilters = filters;
  return next();
}

function rejectBody(req, res, next) {
  if (req.body && Object.keys(req.body).length > 0) {
    return next(
      new AppError(400, 'This endpoint accepts no client payload; all workflow fields are server-controlled.', {
        issues: ['Request body must be empty.'],
      })
    );
  }
  return next();
}

module.exports = {
  validateResponderListQuery,
  validateAssignBody,
  validateAvailabilityBody,
  validateMyAssignmentsQuery,
  rejectBody,
};