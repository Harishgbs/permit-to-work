import type { RequestHandler } from 'express';
import { env } from '../config/env';

function allowedOrigins(): string[] {
  const configured =
    env.corsOrigin ?? (env.nodeEnv === 'production' ? '' : 'http://localhost:5173');

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const corsMiddleware: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');

  if (!origin || !allowedOrigins().includes(origin)) {
    next();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};
