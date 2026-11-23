import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { authRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';
import { permitsRouter } from './routes/permits.routes';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/permits', permitsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
