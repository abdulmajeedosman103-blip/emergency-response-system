// backend/src/routes/operator.js
const express = require('express');

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
  validateIncidentListQuery,
  rejectVerifyBody,
  validateAuditLogListQuery,
  validateAiOverrideBody,
  validateAiStatsQuery,
} = require('../validators/operator');
const { rejectBody } = require('../validators/responder');
const {
  validateResponderListQuery,
  validateAssignBody,
} = require('../validators/responder');
const operatorController = require('../controllers/operatorController');
const responderController = require('../controllers/responderController');

const router = express.Router();

router.get('/incidents', authenticate, requireRole('OPERATOR'), validateIncidentListQuery, operatorController.list);
router.get('/incidents/:id', authenticate, requireRole('OPERATOR'), operatorController.detail);
router.patch('/incidents/:id/verify', authenticate, requireRole('OPERATOR'), rejectVerifyBody, operatorController.verify);
router.patch(
  '/incidents/:id/resolve',
  authenticate,
  requireRole('OPERATOR'),
  rejectBody,
  operatorController.resolve
);
router.patch(
  '/incidents/:id/cancel',
  authenticate,
  requireRole('OPERATOR'),
  rejectBody,
  operatorController.cancel
);
router.post(
  '/incidents/:id/assign',
  authenticate,
  requireRole('OPERATOR'),
  validateAssignBody,
  responderController.assign
);
router.get(
  '/responders',
  authenticate,
  requireRole('OPERATOR'),
  validateResponderListQuery,
  responderController.listResponders
);

// Read-only audit trail — OPERATOR and ADMIN (reused existing role, no new
// auth architecture). No write/mutation endpoints exist on audit logs.
router.get(
  '/audit-logs',
  authenticate,
  requireRole('OPERATOR', 'ADMIN'),
  validateAuditLogListQuery,
  operatorController.listAuditLogs
);
router.get(
  '/audit-logs/meta',
  authenticate,
  requireRole('OPERATOR', 'ADMIN'),
  operatorController.auditMeta
);

// ── AI decision support — advisory only, OPERATOR role ─────────────────────
// AI suggests category/priority; human operators remain authoritative. These
// routes never change workflow status, ownership, availability, or dispatch.
router.get(
  '/incidents/:id/ai',
  authenticate,
  requireRole('OPERATOR'),
  operatorController.getIncidentAi
);
router.post(
  '/incidents/:id/ai/re-suggest',
  authenticate,
  requireRole('OPERATOR'),
  rejectBody,
  operatorController.reSuggestIncidentAi
);
router.patch(
  '/incidents/:id/ai/accept',
  authenticate,
  requireRole('OPERATOR'),
  rejectBody,
  operatorController.acceptIncidentAi
);
router.patch(
  '/incidents/:id/ai/override',
  authenticate,
  requireRole('OPERATOR'),
  validateAiOverrideBody,
  operatorController.overrideIncidentAi
);
router.get('/ai/stats', authenticate, requireRole('OPERATOR'), validateAiStatsQuery, operatorController.aiStats);
router.get('/ai/meta', authenticate, requireRole('OPERATOR'), operatorController.aiMeta);

module.exports = router;