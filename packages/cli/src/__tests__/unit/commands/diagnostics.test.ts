import '../../helpers/setup-msw.js';
import { server } from '../../helpers/msw-server.js';
import { http, HttpResponse } from 'msw';
import {
  diagnostics,
  formatDiagnostics,
} from '../../../commands/diagnostics/index.js';

const APP = 'https://app.example.test';
const env = process.env;
beforeEach(() => {
  process.env = { ...env, WALKEROS_APP_URL: APP };
});
afterEach(() => {
  process.env = env;
});

describe('walkeros diagnostics', () => {
  it('reports the CLI version, the app URL with its source and a health ping, nothing else', async () => {
    let authorization: string | null = 'unset';
    server.use(
      http.get(`${APP}/api/health`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ status: 'ok', appVersion: 'abc123' });
      }),
    );
    const report = await diagnostics();
    expect(Object.keys(report).sort()).toEqual(['app', 'appUrl', 'cli']);
    expect(report.appUrl).toEqual({ resolved: APP, source: 'env' });
    expect(report.app).toEqual({
      reachable: true,
      status: 'ok',
      appVersion: 'abc123',
    });
    expect(authorization).toBeNull();
    expect(formatDiagnostics(report)).toHaveLength(3);
  });

  it('names an unreachable app', async () => {
    server.use(http.get(`${APP}/api/health`, () => HttpResponse.error()));
    const report = await diagnostics();
    expect(report.app.reachable).toBe(false);
    expect(formatDiagnostics(report)[2]).toMatch(/^health unreachable \(/);
  });
});
