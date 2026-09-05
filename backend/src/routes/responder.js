// backend/src/routes/responder.js
const express = require('express');

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
  validateMyAssignmentsQuery,
  validateAvailabilityBody,
  rejectBody,
} = require('../validators/responder');
const responderController = require('../controllers/responderController');

const router = express.Router();

router.get('/me', authenticate, requireRole('RESPONDER'), responderController.me);
router.get(
  '/assignments',
  authenticate,
  requireRole('RESPONDER'),
  validateMyAssignmentsQuery,
  responderController.myAssignments
);
router.get('/assignments/:id', authenticate, requireRole('RESPONDER'), responderController.assignmentDetail);
router.patch(
  '/assignments/:id/accept',
  authenticate,
  requireRole('RESPONDER'),
  rejectBody,
  responderController.accept
);
router.patch(
  '/assignments/:id/en-route',
  authenticate,
  requireRole('RESPONDER'),
  rejectBody,
  responderController.enRoute
);
router.patch(
  '/assignments/:id/arrive',
  authenticate,
  requireRole('RESPONDER'),
  rejectBody,
  responderController.arrive
);
router.patch(
  '/assignments/:id/complete',
  authenticate,
  requireRole('RESPONDER'),
  rejectBody,
  responderController.complete
);
router.patch(
  '/availability',
  authenticate,
  requireRole('RESPONDER'),
  validateAvailabilityBody,
  responderController.availability
);

module.exports = router;