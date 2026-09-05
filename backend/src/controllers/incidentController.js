// backend/src/controllers/incidentController.js
const incidentService = require('../services/incidentService');

async function create(req, res) {
  const incident = await incidentService.createIncident(req.user.id, req.body, req.ip);
  res.status(201).json({ data: incident });
}

async function my(req, res) {
  const incidents = await incidentService.getMyIncidents(req.user.id);
  res.status(200).json({ data: incidents });
}

async function detail(req, res) {
  const incident = await incidentService.getIncidentById(req.user.id, req.params.id);
  res.status(200).json({ data: incident });
}

module.exports = { create, my, detail };