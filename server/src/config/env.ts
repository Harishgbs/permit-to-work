import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5001),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  expiryScanIntervalMs: Number(process.env.EXPIRY_SCAN_INTERVAL_MS ?? 60_000),
  corsOrigin: process.env.CORS_ORIGIN,
};

export function requireJwtSecret(): string {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters');
  }

  return env.jwtSecret;
}

export function requireDatabaseUrl(): string {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL must be set');
  }

  return env.databaseUrl;
}

export function requireProductionCorsOrigin(): void {
  if (env.nodeEnv === 'production' && !env.corsOrigin) {
    throw new Error('CORS_ORIGIN must be set in production');
  }
}
