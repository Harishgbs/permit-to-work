import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 5001),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  expiryScanIntervalMs: Number(process.env.EXPIRY_SCAN_INTERVAL_MS ?? 60_000),
};

export function requireJwtSecret(): string {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters');
  }

  return env.jwtSecret;
}
