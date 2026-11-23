import { createApp } from './app';
import { env, requireJwtSecret } from './config/env';
import { expireDuePermits } from './modules/permits/lifecycle.service';

requireJwtSecret();

const app = createApp();

async function runExpiryScan(): Promise<void> {
  try {
    const expired = await expireDuePermits();

    if (expired > 0) {
      console.log(`Expired ${expired} permit(s)`);
    }
  } catch (error) {
    console.error('Permit expiry scan failed', error);
  }
}

void runExpiryScan();
setInterval(() => void runExpiryScan(), env.expiryScanIntervalMs).unref();

app.listen(env.port, () => {
  console.log(`Permit to Work API listening on port ${env.port}`);
});
