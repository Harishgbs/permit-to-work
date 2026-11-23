import { createApp } from './app';
import { env, requireJwtSecret } from './config/env';

requireJwtSecret();

const app = createApp();

app.listen(env.port, () => {
  console.log(`Permit to Work API listening on port ${env.port}`);
});
