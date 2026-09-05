// backend/src/services/aiService.js
// AI triage domain layer — advisory decision support only.
//
// Responsibilities:
//   * Run triage for a new/edited incident and persist the suggestion into the
//     frozen EmergencyIncident AI columns.
//   * Report a suggestion (with re-derived explainable signals) to operators.
//   * Accept (apply the AI suggestion) or Override (operator-selected values),
//     both as explicit, audited human decisions.
//   * Expose lightweight evaluation statistics derived from stored data.
//
// Resilience: every public entry point is guarded. A provider or persistence
// failure is logged and swallowed so the emergency reporting path can never be
// taken down by AI unavailability. AI never changes workflow status, ownership,
// availability, or assignments — it only suggests category and priority.
const prisma = require('../config/prisma');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const auditService = require('./auditService');
const events = require('../sockets/events');
const { createTriageProvider } = require('./ai/triageProvider');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMERGENCY_TYPES = ['MEDICAL', 'FIRE', 'ROAD_ACCIDENT', 'CRIME', 'NATURAL_DISASTER', 'OTHER'];
const EMERGENCY_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Provider is selected once at server start (defaults to the deterministic
// heuristic engine). AI_TRIAGE_PROVIDER=failing exercises graceful degradation.
const provider = createTriageProvider(env.triageProviderName);

// All fields needed to analyse an incident and report its suggestion.
const INCIDENT_ANALYSIS_FIELDS = {
  id: true,
  description: true,
  type: true,
  peopleAffected: true,
  sourceSos: true,
  locationAddress: true,
  priority: true,
  status: true,
  aiCategorySuggestion: true,
  aiPrioritySuggestion: true,
  aiConfidence: true,
  aiOverridden: true,
  aiProcessedAt: true,
};

async function loadIncidentForAnalysis(incidentId) {
  if (!UUID_RE.test(incidentId)) {
    throw new AppError(404, 'Incident not found.');
  }
  const incident = await prisma.emergencyIncident.findUnique({
    where: { id: incidentId },
    select: INCIDENT_ANALYSIS_FIELDS,
  });
  if (!incident) {
    throw new AppError(404, 'Incident not found.');
  }
  return incident;
}

function presentSuggestion(incident) {
  return {
    category: incident.aiCategorySuggestion,
    priority: incident.aiPrioritySuggestion,
    confidence: incident.aiConfidence,
    overridden: incident.aiOverridden,
    processedAt: incident.aiProcessedAt,
  };
}

// Audit mapping for human accept/override decisions. The frozen AuditAction
// enum has no dedicated "AI accepted/overridden" action; the closest valid
// actions are used and documented:
//   * priority application  -> INCIDENT_PRIORITY_CHANGED {from, to}
//   * category-only changes -> SYSTEM {decision, category}
async function recordHumanAiDecision({ incidentId, operatorId, ipAddress, kind, fromPriority, toPriority, appliedCategory }) {
  const priorityChanged = fromPriority !== toPriority;
  if (priorityChanged) {
    return auditService.record({
      action: 'INCIDENT_PRIORITY_CHANGED',
      actorId: operatorId,
      entityType: 'INCIDENT',
      entityId: incidentId,
      details: { from: fromPriority, to: toPriority },
      ipAddress,
    });
  }
  const categoryChanged = appliedCategory !== undefined;
  return auditService.record({
    action: 'SYSTEM',
    actorId: operatorId,
    entityType: 'INCIDENT',
    entityId: incidentId,
    details: categoryChanged ? { decision: kind, category: appliedCategory } : { decision: kind },
    ipAddress,
  });
}

// --- public API ----------------------------------------------------------------

// System-triggered triage after a new incident (or SOS) has committed.
async function processNewIncident(incidentId) {
  try {
    await triage(incidentId, { actorId: null, ipAddress: null });
  } catch (err) {
    console.error('[aiService] New-incident AI triage skipped:', err.message);
  }
}

// Shared triage pipeline: analyse -> persist -> audit -> emit (post-commit only).
async function triage(incidentId, { actorId, ipAddress }) {
  const incident = await loadIncidentForAnalysis(incidentId);

  const result = await provider.analyze({
    description: incident.description,
    type: incident.type,
    peopleAffected: incident.peopleAffected,
    sourceSos: incident.sourceSos,
    locationAddress: incident.locationAddress,
  });

  if (!EMERGENCY_TYPES.includes(result.category) || !EMERGENCY_PRIORITIES.includes(result.priority)) {
    throw new Error(`Provider returned an invalid suggestion: ${result.category}/${result.priority}`);
  }
  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
    throw new Error(`Provider returned an out-of-range confidence: ${result.confidence}`);
  }

  const now = new Date();
  await prisma.emergencyIncident.update({
    where: { id: incidentId },
    data: {
      aiCategorySuggestion: result.category,
      aiPrioritySuggestion: result.priority,
      aiConfidence: result.confidence,
      aiProcessedAt: now,
    },
  });

  await auditService.record({
    action: 'INCIDENT_AI_SUGGESTED',
    actorId,
    entityType: 'INCIDENT',
    entityId: incidentId,
    details: { category: result.category, priority: result.priority, confidence: result.confidence },
    ipAddress,
  });

  events.emitIncidentUpdatedToOperators(incidentId);

  // Return the fresh suggestion so the caller can respond with it.
  return getIncidentAi(incidentId);
}

// Re-run analysis on an existing incident on operator request. Suggestion
// fields are refreshed; aiOverridden is preserved (a standing operator decision
// is never silently erased). One new audit row per run.
async function reSuggest(incidentId, operatorId, ipAddress) {
  try {
    return await triage(incidentId, { actorId: operatorId, ipAddress });
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(
      503,
      'The AI triage provider is currently unavailable. The suggestion was not updated.'
    );
  }
}

// View the current suggestion. Signals are regenerated deterministically from
// the stored incident data (they are intentionally not persisted in the schema).
async function getIncidentAi(incidentId) {
  const incident = await loadIncidentForAnalysis(incidentId);

  let signals = [];
  let providerAvailable = true;
  try {
    const result = await provider.analyze({
      description: incident.description,
      type: incident.type,
      peopleAffected: incident.peopleAffected,
      sourceSos: incident.sourceSos,
      locationAddress: incident.locationAddress,
    });
    signals = Array.isArray(result.signals) ? result.signals.slice(0, 8) : [];
  } catch (err) {
    providerAvailable = false;
    console.error('[aiService] signal re-derivation failed:', err.message);
  }

  return {
    ...presentSuggestion(incident),
    signals,
    provider: { name: provider.name },
    providerAvailable,
  };
}

// Accept: apply the AI-suggested category and/or priority. Requires an existing
// suggestion; the human acceptance is audited and emitted post-commit.
async function acceptSuggestion(incidentId, operatorId, ipAddress) {
  const incident = await loadIncidentForAnalysis(incidentId);

  if (incident.aiCategorySuggestion == null && incident.aiPrioritySuggestion == null) {
    throw new AppError(409, 'No AI suggestion is available to accept yet.');
  }

  const nextType = incident.aiCategorySuggestion || incident.type;
  const nextPriority = incident.aiPrioritySuggestion || incident.priority;

  await prisma.emergencyIncident.update({
    where: { id: incidentId },
    data: { type: nextType, priority: nextPriority, aiOverridden: false },
  });

  await recordHumanAiDecision({
    incidentId,
    operatorId,
    ipAddress,
    kind: 'accept',
    fromPriority: incident.priority,
    toPriority: nextPriority,
    appliedCategory: nextType !== incident.type ? nextType : undefined,
  });

  events.emitIncidentUpdatedToOperators(incidentId);
  return getIncidentAi(incidentId);
}

// Override: operator-selected category/priority wins; the original AI
// suggestion fields are preserved untouched and aiOverridden is set to true.
async function overrideSuggestion(incidentId, operatorId, ipAddress, { category, priority }) {
  const incident = await loadIncidentForAnalysis(incidentId);

  const nextType = category || incident.type;
  const nextPriority = priority || incident.priority;

  await prisma.emergencyIncident.update({
    where: { id: incidentId },
    data: { type: nextType, priority: nextPriority, aiOverridden: true },
  });

  await recordHumanAiDecision({
    incidentId,
    operatorId,
    ipAddress,
    kind: 'override',
    fromPriority: incident.priority,
    toPriority: nextPriority,
    appliedCategory: nextType !== incident.type ? nextType : undefined,
  });

  events.emitIncidentUpdatedToOperators(incidentId);
  return getIncidentAi(incidentId);
}

// Lightweight evaluation metrics derived directly from stored incident data.
async function getStats(from, to) {
  const where = {
    createdAt: { gte: from, lte: to },
    aiProcessedAt: { not: null },
  };
  const incidents = await prisma.emergencyIncident.findMany({
    where,
    select: { priority: true, aiPrioritySuggestion: true, aiOverridden: true, type: true },
  });

  const total = incidents.length;
  const overridden = incidents.filter((i) => i.aiOverridden).length;
  const agreement = incidents.filter(
    (i) => i.aiPrioritySuggestion != null && i.priority === i.aiPrioritySuggestion
  ).length;
  const accepted = total - overridden;

  const byType = {};
  for (const type of EMERGENCY_TYPES) {
    byType[type] = 0;
  }
  for (const incident of incidents) {
    byType[incident.type] = (byType[incident.type] || 0) + 1;
  }

  const safeRate = (numerator) => (total === 0 ? 0 : Math.round((numerator / total) * 1000) / 1000);

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    totalProcessed: total,
    accepted,
    overridden,
    overrideRate: safeRate(overridden),
    agreementRate: safeRate(agreement),
    byType,
  };
}

function getMeta() {
  return {
    provider: { name: provider.name },
    categories: EMERGENCY_TYPES,
    priorities: EMERGENCY_PRIORITIES,
    confidence: { min: 0, max: 1 },
  };
}

module.exports = {
  processNewIncident,
  reSuggest,
  getIncidentAi,
  acceptSuggestion,
  overrideSuggestion,
  getStats,
  getMeta,
};