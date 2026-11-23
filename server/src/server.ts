import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.port, () => {
  console.log(`Permit to Work API listening on port ${env.port}`);
});
