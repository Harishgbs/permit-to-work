import { spawnSync } from 'node:child_process';

const onRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_HOSTNAME);
const forced = process.env.RUN_MIGRATIONS === '1';

if (onRender && !forced) {
  console.log('Skipping Prisma migrations on Render startup. Run migrations locally with npm run prisma:migrate:deploy -w server.');
  process.exit(0);
}

const result = spawnSync('prisma', ['migrate', 'deploy'], { stdio: 'inherit' });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
