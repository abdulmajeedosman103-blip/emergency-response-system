// backend/src/routes/incidents.js
const express = require('express');

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validateCreateIncident } = require('../validators/incident');
const { validateSos } = require('../validators/sos');
const incidentController = require('../controllers/incidentController');
const sosController = require('../controllers/sosController');

const router = express.Router();

// Only citizens may open new public emergency reports.
router.post('/', authenticate, requireRole('CITIZEN'), validateCreateIncident, incidentController.create);
// SOS — fast emergency alert for citizens.
router.post('/sos', authenticate, requireRole('CITIZEN'), validateSos, sosController.create);
router.get('/my', authenticate, incidentController.my);
router.get('/:id', authenticate, incidentController.detail);

module.exports = router;