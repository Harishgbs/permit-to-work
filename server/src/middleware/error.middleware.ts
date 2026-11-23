import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Resource not found' });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = typeof error.status === 'number' ? error.status : 500;
  const message = status === 500 ? 'Internal server error' : error.message;

  if (status === 500) {
    console.error(error);
  }

  res.status(status).json({ error: message });
};
