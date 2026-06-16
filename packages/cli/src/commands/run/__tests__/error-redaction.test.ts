import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Level } from '@walkeros/core';
import type { Logger } from '@walkeros/core';
import { createCLILogger } from '../../../core/cli-logger.js';
import { ErrorRing } from '../../../runtime/index.js';
import { createHeartbeat } from '../../../runtime/heartbeat.js';
import { errorSinkPath } from '../error-sink.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'walkeros-redact-'));
}

/** Typed 200-OK fetch mock, matching the heartbeat suite's helper. */
function createFetchMock(): jest.Mock<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
> {
  return jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(() =>
    Promise.resolve(new Response(null, { status: 200 })),
  );
}

function silentLogger(): Logger.Instance {
  const logger: Logger.Instance = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: (message: string | Error): never => {
      throw new Error(typeof message === 'string' ? message : message.message);
    },
    json: jest.fn(),
    scope: (_name: string): Logger.Instance => logger,
  };
  return logger;
}

/**
 * Full path: logger.error(secret) → cli-logger handler (scrubSecrets) → onLine →
 * ErrorRing.add (durable jsonl append) → heartbeat sendOnce (redactErrors) → POST
 * body. Asserts NO PEM marker and NO private_key VALUE survives in EITHER the
 * flushed heartbeat body or the persisted jsonl line.
 */
describe('error redaction end-to-end (logger → ring → jsonl + heartbeat)', () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Silence the handler's chalk console.error so the test output stays clean.
    console.error = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    jest.restoreAllMocks();
  });

  it('redacts a PEM block and a private_key JSON field across the jsonl and the heartbeat body', async () => {
    const dir = tempDir();
    const sink = errorSinkPath(dir);

    const ring = new ErrorRing(20);
    ring.setSink(sink);

    // Build the runner logger with the SAME onLine ring tap the run command uses.
    const onLine = (level: Level, message: string) => {
      if (level === Level.ERROR) ring.add(message);
    };
    const logger = createCLILogger({ silent: true, onLine });

    // The realistic deployed shape: a destination logs the raw PEM as its own
    // message (BEGIN marker at line start). scrubSecrets removes the whole block
    // structurally, marker included.
    const pemKey =
      '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ\n-----END PRIVATE KEY-----';
    // A service-account blob with an embedded private_key field (\n-encoded PEM
    // body). The JSON-SA-field pass masks the field VALUE before any line split.
    const saJson =
      'GCP auth failed {"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEsecretsecretsecret\\n-----END PRIVATE KEY-----\\n","client_email":"x@y.iam.gserviceaccount.com"}';

    logger.error(pemKey);
    logger.error(saJson);

    // ── jsonl assertions ──────────────────────────────────────────────────
    const jsonl = readFileSync(sink, 'utf-8');
    // Line-start PEM block is removed wholesale (marker + body).
    expect(jsonl).not.toContain('-----BEGIN');
    expect(jsonl).not.toContain('MIIEvQIBAD'); // PEM body must not leak
    // The private_key field VALUE (the actual secret) must not survive. The bare
    // JSON field name is left as `"private_key":"***"`, so assert the VALUE, not
    // the field name.
    expect(jsonl).not.toContain('MIIEsecret'); // SA private_key body must not leak

    // ── heartbeat body assertions ─────────────────────────────────────────
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock;

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'bearer-test',
        projectId: 'proj_1',
        intervalMs: 60000,
        getErrors: () => ring.snapshot(),
      },
      silentLogger(),
    );

    await heartbeat.sendOnce();

    const init = fetchMock.mock.calls[0]?.[1];
    const body = init?.body;
    if (typeof body !== 'string') {
      throw new Error('expected a string request body');
    }
    expect(body).not.toContain('-----BEGIN');
    expect(body).not.toContain('MIIEvQIBAD');
    expect(body).not.toContain('MIIEsecret');
    // The private_key VALUE must be gone from the body too.
    expect(body).not.toContain('MIIEsecretsecretsecret');

    // Sanity: errors did egress (redacted), so the assertions above are real.
    const parsed: { recentErrors?: Array<{ message: string }> } =
      JSON.parse(body);
    expect(parsed.recentErrors && parsed.recentErrors.length).toBeGreaterThan(
      0,
    );
  });
});
