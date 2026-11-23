import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { authRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
