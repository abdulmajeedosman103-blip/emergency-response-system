// backend/src/controllers/operatorController.js
const operatorService = require('../services/operatorService');
const auditService = require('../services/auditService');
const aiService = require('../services/aiService');
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../utils/auditConstants');

async function list(req, res) {
  const { incidents, meta } = await operatorService.listIncidents(req.operatorFilters);
  res.json({ data: incidents, meta });
}

async function detail(req, res) {
  const incident = await operatorService.getIncidentDetail(req.params.id);
  res.json({ data: incident });
}

async function verify(req, res) {
  const incident = await operatorService.verifyIncident(req.user.id, req.params.id, req.ip);
  res.json({ data: incident });
}

async function resolve(req, res) {
  const incident = await operatorService.resolveIncident(req.user.id, req.params.id, req.ip);
  res.json({ data: incident });
}

async function cancel(req, res) {
  const incident = await operatorService.cancelIncident(req.user.id, req.params.id, req.ip);
  res.json({ data: incident });
}

async function listAuditLogs(req, res) {
  const { logs, meta } = await auditService.listAuditLogs(req.auditFilters);
  res.json({ data: logs, meta });
}

async function auditMeta(req, res) {
  res.json({ data: { actions: AUDIT_ACTIONS, entityTypes: AUDIT_ENTITY_TYPES } });
}

// ── AI decision support (OPERATOR) ─────────────────────────────────────────
async function getIncidentAi(req, res) {
  const data = await aiService.getIncidentAi(req.params.id);
  res.json({ data });
}

async function reSuggestIncidentAi(req, res) {
  const data = await aiService.reSuggest(req.params.id, req.user.id, req.ip);
  res.json({ data });
}

async function acceptIncidentAi(req, res) {
  const data = await aiService.acceptSuggestion(req.params.id, req.user.id, req.ip);
  res.json({ data });
}

async function overrideIncidentAi(req, res) {
  const data = await aiService.overrideSuggestion(req.params.id, req.user.id, req.ip, {
    category: req.body.category,
    priority: req.body.priority,
  });
  res.json({ data });
}

async function aiStats(req, res) {
  const data = await aiService.getStats(req.aiStatsBounds.from, req.aiStatsBounds.to);
  res.json({ data });
}

async function aiMeta(req, res) {
  res.json({ data: aiService.getMeta() });
}

module.exports = {
  list,
  detail,
  verify,
  resolve,
  cancel,
  listAuditLogs,
  auditMeta,
  getIncidentAi,
  reSuggestIncidentAi,
  acceptIncidentAi,
  overrideIncidentAi,
  aiStats,
  aiMeta,
};