import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';

const originalCorsOrigin = env.corsOrigin;
const originalNodeEnv = env.nodeEnv;

afterEach(() => {
  env.corsOrigin = originalCorsOrigin;
  env.nodeEnv = originalNodeEnv;
});

describe('CORS', () => {
  it('allows configured origins and answers preflight requests', async () => {
    env.corsOrigin = 'https://ptw.example.com, https://admin.example.com';

    const preflight = await request(createApp())
      .options('/api/permits')
      .set('Origin', 'https://admin.example.com');

    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('https://admin.example.com');
    expect(preflight.headers['access-control-allow-methods']).toContain('PATCH');

    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://ptw.example.com');

    expect(response.headers['access-control-allow-origin']).toBe('https://ptw.example.com');
  });

  it('does not allow unconfigured origins', async () => {
    env.nodeEnv = 'production';
    env.corsOrigin = 'https://ptw.example.com';

    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://unexpected.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
