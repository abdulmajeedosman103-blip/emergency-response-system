// backend/src/config/env.js
// Centralized, validated environment configuration.
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  sosCooldownSeconds: (() => {
    const raw = Number(process.env.SOS_COOLDOWN_SECONDS);
    return Number.isFinite(raw) && raw > 0 ? raw : 60;
  })(),
  // AI triage provider. 'heuristic' is the deterministic default engine.
  // 'failing' is a test-only provider that throws, to verify graceful
  // degradation (emergency reporting must never depend on AI availability).
  triageProviderName: process.env.AI_TRIAGE_PROVIDER || 'heuristic',
};

if (!env.databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and fill in the PostgreSQL connection string.'
  );
}

if (!env.jwtSecret) {
  throw new Error(
    'JWT_SECRET is not set. Copy .env.example to .env and set a long random secret.'
  );
}

module.exports = env;