// backend/src/services/ai/triageProvider.js
// AI provider contract, factory, and failure-injection provider.
//
// The domain layer (aiService) never depends on a concrete AI implementation.
// Providers are created through a single factory, so the future Python AI
// service can replace the deterministic heuristic engine by registering a new
// provider that implements the same contract — with zero changes to routes,
// controllers, incident services, or frontend contracts.
//
// A `failing` provider is selectable via AI_TRIAGE_PROVIDER=failing to verify
// graceful degradation: when the provider throws, emergency reporting must
// still succeed and no AI suggestion/audit/event may be produced.
const { heuristicProvider } = require('./heuristicProvider');

const TRIAGE_PROVIDER_NAMES = ['heuristic', 'failing'];

/**
 * Input descriptor passed to a triage provider for a single incident.
 *
 * @typedef {Object} TriageInput
 * @property {string} description - Free-text emergency description.
 * @property {import('@prisma/client').EmergencyType} type - Reported emergency type.
 * @property {number} peopleAffected - Number of people affected (>= 1).
 * @property {boolean} sourceSos - True when the incident came from an SOS alert.
 * @property {string|null} locationAddress - Optional reported address.
 */

/**
 * Output of a triage analysis.
 *
 * @typedef {Object} TriageResult
 * @property {import('@prisma/client').EmergencyType} category - Suggested emergency category.
 * @property {import('@prisma/client').EmergencyPriority} priority - Suggested priority.
 * @property {number} confidence - Advisory confidence in the suggestion, always 0..1.
 * @property {string[]} signals - Short, human-readable indicators that explain the suggestion.
 */

/**
 * A triage provider.
 *
 * @typedef {Object} TriageProvider
 * @property {string} name - Stable provider name (e.g. 'heuristic').
 * @property {(input: TriageInput) => Promise<TriageResult>} analyze - Analyse an incident.
 *
 * @async
 * @function analyze
 * @param {TriageInput} input
 * @returns {Promise<TriageResult>} A valid category/priority/confidence/signals result.
 * @throws {Error} Provider implementations may reject on failure; callers must
 *   degrade gracefully (never fail the emergency reporting path).
 */

/**
 * Deterministic provider used to simulate AI outage during resilience tests.
 *
 * @type {TriageProvider}
 */
const failingProvider = {
  name: 'failing',
  analyze: async () => {
    throw new Error('AI triage provider failure injected for resilience testing.');
  },
};

/**
 * Create a triage provider by name. Unknown names fall back to the heuristic
 * engine so the system always has a working provider by default.
 *
 * @param {string} name - Provider name ('heuristic' | 'failing').
 * @returns {TriageProvider}
 */
function createTriageProvider(name) {
  if (name === 'failing') {
    return failingProvider;
  }
  return heuristicProvider;
}

module.exports = { createTriageProvider, TRIAGE_PROVIDER_NAMES, failingProvider };