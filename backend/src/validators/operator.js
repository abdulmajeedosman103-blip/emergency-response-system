// backend/src/validators/operator.js
const { AppError } = require('../middleware/errorHandler');
const { AUDIT_ACTIONS } = require('../utils/auditConstants');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMERGENCY_STATUSES = [
  'REPORTED',
  'VERIFIED',
  'RESPONDER_ASSIGNED',
  'RESPONDER_EN_ROUTE',
  'RESPONDER_ARRIVED',
  'RESOLVED',
  'CANCELLED',
];
const EMERGENCY_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const EMERGENCY_TYPES = [
  'MEDICAL',
  'FIRE',
  'ROAD_ACCIDENT',
  'CRIME',
  'NATURAL_DISASTER',
  'OTHER',
];

function validateIncidentListQuery(req, res, next) {
  const issues = [];
  const q = req.query || {};
  const filters = { page: 1, limit: 20, sourceSos: null };

  for (const field of ['status', 'priority', 'type']) {
    if (q[field] === undefined) {
      continue;
    }
    const allowed =
      field === 'status'
        ? EMERGENCY_STATUSES
        : field === 'priority'
          ? EMERGENCY_PRIORITIES
          : EMERGENCY_TYPES;
    if (!allowed.includes(q[field])) {
      issues.push(`Query "${field}" must be one of: ${allowed.join(', ')}.`);
    } else {
      filters[field] = q[field];
    }
  }

  if (q.sourceSos !== undefined) {
    if (q.sourceSos === 'true' || q.sourceSos === 'false') {
      filters.sourceSos = q.sourceSos === 'true';
    } else {
      issues.push('Query "sourceSos" must be "true" or "false".');
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

  req.operatorFilters = filters;
  return next();
}

function rejectVerifyBody(req, res, next) {
  if (req.body && Object.keys(req.body).length > 0) {
    return next(
      new AppError(400, 'This endpoint accepts no client payload; all workflow fields are server-controlled.', {
        issues: ['Request body must be empty.'],
      })
    );
  }
  return next();
}

// /ai/override accepts only { category?, priority? } — valid frozen enums only.
function validateAiOverrideBody(req, res, next) {
  const issues = [];
  const body = req.body || {};
  const keys = Object.keys(body);

  for (const key of keys) {
    if (key !== 'category' && key !== 'priority') {
      issues.push(`Unknown key "${key}" — override accepts only "category" and/or "priority".`);
    }
  }

  if (keys.length === 0) {
    issues.push('An override must set at least one of "category" or "priority".');
  }

  if (body.category !== undefined) {
    if (!EMERGENCY_TYPES.includes(body.category)) {
      issues.push(`category must be one of: ${EMERGENCY_TYPES.join(', ')}.`);
    }
  }

  if (body.priority !== undefined) {
    if (!EMERGENCY_PRIORITIES.includes(body.priority)) {
      issues.push(`priority must be one of: ${EMERGENCY_PRIORITIES.join(', ')}.`);
    }
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  return next();
}

// /ai/stats accepts only optional ISO-8601 "from"/"to" bounds.
function validateAiStatsQuery(req, res, next) {
  const issues = [];
  const q = req.query || {};
  const bounds = { from: null, to: null };

  for (const field of ['from', 'to']) {
    if (q[field] === undefined) {
      continue;
    }
    const parsed = new Date(q[field]);
    if (Number.isNaN(parsed.getTime())) {
      issues.push(`Query "${field}" must be an ISO-8601 date.`);
    } else {
      bounds[field] = new Date(parsed.toISOString());
    }
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  req.aiStatsBounds = {
    from: bounds.from || new Date(Date.now() - thirtyDaysMs),
    to: bounds.to || new Date(),
  };
  return next();
}

function validateAuditLogListQuery(req, res, next) {
  const issues = [];
  const q = req.query || {};
  const filters = { page: 1, limit: 20, action: null, entityType: null, entityId: null, actorId: null, from: null, to: null };

  if (q.action !== undefined) {
    if (!AUDIT_ACTIONS.includes(q.action)) {
      issues.push(`Query "action" must be one of: ${AUDIT_ACTIONS.join(', ')}.`);
    } else {
      filters.action = q.action;
    }
  }

  for (const field of ['entityType', 'entityId']) {
    if (q[field] === undefined) {
      continue;
    }
    const value = String(q[field]).trim();
    if (value.length === 0 || value.length > 60) {
      issues.push(`Query "${field}" must be between 1 and 60 characters.`);
    } else {
      filters[field] = value;
    }
  }

  if (q.actorId !== undefined) {
    if (!UUID_RE.test(q.actorId)) {
      issues.push('Query "actorId" must be a valid UUID.');
    } else {
      filters.actorId = q.actorId;
    }
  }

  for (const field of ['from', 'to']) {
    if (q[field] === undefined) {
      continue;
    }
    const parsed = new Date(q[field]);
    if (Number.isNaN(parsed.getTime())) {
      issues.push(`Query "${field}" must be an ISO-8601 date.`);
    } else {
      filters[field] = new Date(parsed.toISOString());
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

  req.auditFilters = filters;
  return next();
}

module.exports = {
  validateIncidentListQuery,
  rejectVerifyBody,
  validateAuditLogListQuery,
  validateAiOverrideBody,
  validateAiStatsQuery,
};