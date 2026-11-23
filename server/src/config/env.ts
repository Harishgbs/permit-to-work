import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 5001),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
};

export function requireJwtSecret(): string {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters');
  }

  return env.jwtSecret;
}
