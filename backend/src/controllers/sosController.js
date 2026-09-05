// backend/src/controllers/sosController.js
const sosService = require('../services/sosService');

async function create(req, res) {
  const incident = await sosService.createSos(req.user.id, req.body, req.ip);
  res.status(201).json({ data: incident });
}

module.exports = { create };