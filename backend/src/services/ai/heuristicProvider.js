// backend/src/services/ai/heuristicProvider.js
// Default deterministic, explainable triage provider.
//
// This is an advisory decision-support heuristic, never an autonomous decider.
// Scoring is fully deterministic so the same incident always yields the same
// suggestion:
//   * category  -> strongest keyword match against an emergency-specific
//                  lexicon, combined with the reported emergency type.
//   * priority  -> weighted severity keywords + people affected scaling, with
//                  a CRITICAL floor for SOS alerts.
//   * confidence-> scaled from the number of matched signals, the score gap to
//                  the runner-up category, and the SOS source.
//   * signals   -> the short explainable indicators behind the suggestion.
//
// The provider contract is defined in ./triageProvider.js.

const EMERGENCY_TYPES = ['MEDICAL', 'FIRE', 'ROAD_ACCIDENT', 'CRIME', 'NATURAL_DISASTER', 'OTHER'];
const EMERGENCY_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Category lexicons. Several indicative terms also appear in SEVERITY_KEYWORDS
// so a strong category signal simultaneously raises the suggested priority.
const CATEGORY_LEXICONS = {
  MEDICAL: [
    'unconscious',
    'bleeding',
    'injury',
    'injured',
    'seizure',
    'cardiac',
    'heart attack',
    'breathing',
    'hospital',
    'ambulance',
    'stroke',
    'overdose',
    'labour',
    'labor',
    'medical',
    'collapsed',
    'unresponsive',
    'accident',
  ],
  FIRE: [
    'fire',
    'smoke',
    'burning',
    'burn',
    'explosion',
    'explode',
    'flame',
    'flames',
    'blaze',
    'arson',
    'inferno',
  ],
  CRIME: [
    'robbery',
    'robber',
    'attack',
    'assault',
    'weapon',
    'gun',
    'knife',
    'violence',
    'violent',
    'shooting',
    'shot',
    'theft',
    'shoplifting',
    'stabbed',
  ],
  ROAD_ACCIDENT: [
    'crash',
    'collision',
    'vehicle',
    'car',
    'truck',
    'bike',
    'motorcycle',
    'highway',
    'collided',
    'road accident',
    'driver',
  ],
  NATURAL_DISASTER: [
    'flood',
    'storm',
    'earthquake',
    'landslide',
    'collapse',
    'tornado',
    'hurricane',
    'tsunami',
    'rising water',
    'wildfire',
    'damaged building',
  ],
  OTHER: [],
};

// Weighted severity indicators that push the suggested priority upward.
const SEVERITY_KEYWORDS = [
  { word: 'unconscious', weight: 3 },
  { word: 'unresponsive', weight: 3 },
  { word: 'bleeding', weight: 3 },
  { word: 'trapped', weight: 3 },
  { word: 'seizure', weight: 3 },
  { word: 'stroke', weight: 3 },
  { word: 'overdose', weight: 3 },
  { word: 'explosion', weight: 3 },
  { word: 'fire', weight: 2 },
  { word: 'flood', weight: 2 },
  { word: 'weapon', weight: 2 },
  { word: 'gun', weight: 2 },
  { word: 'collapse', weight: 2 },
  { word: 'shooting', weight: 3 },
  { word: 'stabbed', weight: 3 },
  { word: 'critical', weight: 2 },
  { word: 'burning', weight: 2 },
  { word: 'major', weight: 1 },
  { word: 'severe', weight: 1 },
  { word: 'heavy', weight: 1 },
  { word: 'spreading', weight: 1 },
];

// Type bonus applied to the reported emergency type so an ambiguous
// description defaults to the reporter's own classification.
const TYPE_BONUS = 1;

// Tie breaker order — the earlier a category appears, the more it is preferred
// when two categories score identically.
const TIE_ORDER = EMERGENCY_TYPES;

// Priority floor applied to SOS alerts (life-or-limb fast alerting).
const SOS_PRIORITY = 'CRITICAL';

const MAX_SIGNALS = 6;

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function countKeywordMatches(text, keywords) {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

function matchedKeywords(text, keywords) {
  return keywords.filter((keyword) => text.includes(keyword));
}

function pickBestCategory(scores, keywordCounts) {
  const entries = Object.keys(scores).map((category) => ({
    category,
    score: scores[category],
    keywords: keywordCounts[category] || 0,
  }));

  const maxScore = Math.max(...entries.map((e) => e.score), 0);
  if (maxScore === 0) {
    return { category: 'OTHER', score: 0, keywords: 0 };
  }

  // Highest score wins; ties prefer more matched keywords, then the enum order.
  const candidates = entries.filter((e) => e.score === maxScore);
  candidates.sort((a, b) => {
    if (b.keywords !== a.keywords) {
      return b.keywords - a.keywords;
    }
    return TIE_ORDER.indexOf(a.category) - TIE_ORDER.indexOf(b.category);
  });
  return candidates[0];
}

function mapScoreToPriority(score) {
  if (score >= 4) {
    return 'CRITICAL';
  }
  if (score >= 2) {
    return 'HIGH';
  }
  if (score >= 1) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function gcdStylePriority(severityScore, peopleFactor) {
  return mapScoreToPriority(severityScore + peopleFactor);
}

function buildSignals({ matchedCategoryKeywords, sourceSos, peopleAffected, reportedType }) {
  const signals = [];
  for (const keyword of matchedCategoryKeywords) {
    if (signals.length >= MAX_SIGNALS) {
      break;
    }
    signals.push(`Keyword: ${keyword}`);
  }
  if (sourceSos) {
    signals.push('SOS emergency source');
  }
  if (peopleAffected >= 5) {
    signals.push(`${peopleAffected} people affected`);
  }
  signals.push(`Reported as ${reportedType}`);
  return signals.slice(0, MAX_SIGNALS);
}

function computeConfidence({ keywordCount, secondScore, bestScore, sourceSos, peopleAffected }) {
  const sosSignal = sourceSos ? 1 : 0;
  const peopleSignal = peopleAffected >= 5 ? 1 : 0;
  const signalCount = Math.min(4, keywordCount + sosSignal + peopleSignal);

  // A large gap to the runner-up category means the signal is unambiguous.
  const gapFactor = Math.min(1, Math.max(0, bestScore - secondScore));

  let confidence = 0.2 + 0.18 * signalCount + 0.12 * gapFactor;
  if (sourceSos) {
    confidence += 0.05;
  }

  const bounded = Math.min(0.97, Math.max(0.05, confidence));
  return Math.round(bounded * 100) / 100;
}

/**
 * Deterministic heuristic analysis.
 *
 * @param {import('./triageProvider').TriageInput} input
 * @returns {Promise<import('./triageProvider').TriageResult>}
 */
async function analyze({ description, type, peopleAffected, sourceSos }) {
  const text = normalize(description);
  const people = Number(peopleAffected) >= 1 ? Number(peopleAffected) : 1;

  const scores = {};
  const keywordCounts = {};
  for (const category of EMERGENCY_TYPES) {
    const keywords = CATEGORY_LEXICONS[category] || [];
    const kwCount = countKeywordMatches(text, keywords);
    keywordCounts[category] = kwCount;
    scores[category] = kwCount + (category === type ? TYPE_BONUS : 0);
  }

  const { category, score } = pickBestCategory(scores, keywordCounts);

  const matchedCategoryKeywords = matchedKeywords(text, CATEGORY_LEXICONS[category] || []);

  const severityScore = SEVERITY_KEYWORDS.reduce((sum, { word, weight }) => {
    return text.includes(word) ? sum + weight : sum;
  }, 0);

  let peopleFactor = 0;
  if (people >= 30) {
    peopleFactor = 3;
  } else if (people >= 10) {
    peopleFactor = 2;
  } else if (people >= 4) {
    peopleFactor = 1;
  }

  let priority = gcdStylePriority(severityScore, peopleFactor);
  if (sourceSos) {
    // SOS is a CRITICAL floor — never below CRITICAL for a live SOS alert.
    priority = SOS_PRIORITY;
  }

  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const bestScore = sortedScores[0] || 0;
  const secondScore = sortedScores[1] || 0;

  const confidence = computeConfidence({
    keywordCount: keywordCounts[category] || 0,
    secondScore,
    bestScore,
    sourceSos,
    peopleAffected: people,
  });

  const signals = buildSignals({
    matchedCategoryKeywords,
    sourceSos,
    peopleAffected: people,
    reportedType: type,
  });

  return { category, priority, confidence, signals };
}

const heuristicProvider = {
  name: 'heuristic',
  analyze,
};

module.exports = {
  heuristicProvider,
  CATEGORY_LEXICONS,
  SEVERITY_KEYWORDS,
  EMERGENCY_TYPES,
  EMERGENCY_PRIORITIES,
  analyze,
};