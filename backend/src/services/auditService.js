// backend/src/services/auditService.js
// Read-only audit trail backed by the frozen AuditLog model.
//
// Writes (record):
//   * Called by services ONLY after the primary write/transaction has committed.
//   * record() is awaited by callers and internally try/catch protected, so an
//     audit failure is logged but can never break or roll back the primary op.
// Reads (listAuditLogs):
//   * Filtered, paginated, newest-first; exposed read-only to OPERATOR/ADMIN.
const prisma = require('../config/prisma');

// Fails silently-safe write. Never throws to the caller.
async function record({ action, actorId, entityType, entityId, details, ipAddress } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId: actorId || null,
        entityType,
        entityId: entityId || null,
        details: details || undefined,
        ipAddress: ipAddress || null,
      },
    });
    return true;
  } catch (err) {
    console.error('[audit] failed to record audit entry:', action, err);
    return false;
  }
}

const AUDIT_SELECT = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  actorId: true,
  details: true,
  ipAddress: true,
  createdAt: true,
  actor: { select: { id: true, fullName: true, email: true } },
};

async function listAuditLogs(filters) {
  const where = {};
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: AUDIT_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    meta: { total, page: filters.page, limit: filters.limit, totalPages: Math.max(1, Math.ceil(total / filters.limit)) },
  };
}

module.exports = { record, listAuditLogs, AUDIT_SELECT };