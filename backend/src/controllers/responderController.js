// backend/src/controllers/responderController.js
const responderService = require('../services/responderService');
const operatorService = require('../services/operatorService');

// ── OPERATOR side ──────────────────────────────────────────────────────────
async function listResponders(req, res) {
  const data = await responderService.listResponders(req.responderFilters);
  res.json({ data });
}

async function assign(req, res) {
  const assignment = await responderService.assignResponder(
    req.user.id,
    req.params.id,
    req.body.responderId,
    req.ip
  );
  const incident = await operatorService.getIncidentDetail(req.params.id);
  res.status(201).json({ data: { assignment, incident } });
}

// ── RESPONDER side ─────────────────────────────────────────────────────────
async function me(req, res) {
  const data = await responderService.getMyProfile(req.user.id);
  res.json({ data });
}

async function myAssignments(req, res) {
  const result = await responderService.listMyAssignments(req.user.id, req.assignmentFilters);
  res.json({ data: result.assignments, meta: result.meta });
}

async function assignmentDetail(req, res) {
  const data = await responderService.getAssignmentById(req.user.id, req.params.id);
  res.json({ data });
}

async function accept(req, res) {
  const data = await responderService.acceptAssignment(req.user.id, req.params.id, req.ip);
  res.json({ data });
}

async function enRoute(req, res) {
  const data = await responderService.markEnRoute(req.user.id, req.params.id, req.ip);
  res.json({ data });
}

async function arrive(req, res) {
  const data = await responderService.markArrived(req.user.id, req.params.id, req.ip);
  res.json({ data });
}

async function complete(req, res) {
  const data = await responderService.markCompleted(req.user.id, req.params.id, req.ip);
  res.json({ data });
}

async function availability(req, res) {
  const data = await responderService.updateAvailability(req.user.id, req.body.availability, req.ip);
  res.json({ data });
}

module.exports = {
  listResponders,
  assign,
  me,
  myAssignments,
  assignmentDetail,
  accept,
  enRoute,
  arrive,
  complete,
  availability,
};