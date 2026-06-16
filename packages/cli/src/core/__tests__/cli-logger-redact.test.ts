import { Level } from '@walkeros/core';
import type { Logger } from '@walkeros/core';
import { createCLILogger, createCLILoggerConfig } from '../cli-logger.js';

// No-op default handler to satisfy the 5-arg Handler signature when calling the
// config handler directly. The handler under test ignores it.
const noopDefaultHandler: Logger.DefaultHandler = () => undefined;

/**
 * The CLI logger handler must redact secrets ONCE, before BOTH the `onLine`
 * ring tap and the `console.*` output, so stderr (shipped directly by
 * Cockpit/Loki) and the heartbeat ring are both scrubbed for every line.
 */
describe('createCLILogger handler redaction', () => {
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  function joinedConsoleOutput(): string {
    const calls: unknown[][] = [...errorSpy.mock.calls, ...logSpy.mock.calls];
    return calls.map((c) => c.map((a) => String(a)).join(' ')).join('\n');
  }

  it('redacts a PEM block in both console output and the onLine tap', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => captured.push(message),
    });

    const pem = [
      '-----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
      '-----END PRIVATE KEY-----',
    ].join('\n');
    logger.error(`init failed\n${pem}`);

    const body = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7';
    expect(captured.join('\n')).not.toContain(body);
    expect(captured.join('\n')).not.toContain('BEGIN PRIVATE KEY');
    expect(joinedConsoleOutput()).not.toContain(body);
    expect(joinedConsoleOutput()).not.toContain('BEGIN PRIVATE KEY');
  });

  it('redacts a private_key JSON value in both sinks', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => captured.push(message),
    });

    const secret = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw==';
    logger.error(
      `boom {"private_key":"-----BEGIN PRIVATE KEY-----\\n${secret}\\n-----END PRIVATE KEY-----\\n"}`,
    );

    expect(captured.join('\n')).not.toContain(secret);
    expect(joinedConsoleOutput()).not.toContain(secret);
  });

  it('redacts a client_email JSON value in both sinks', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => captured.push(message),
    });

    const email = 'svc@my-proj.iam.gserviceaccount.com';
    logger.error(`auth failed {"client_email":"${email}"}`);

    expect(captured.join('\n')).not.toContain(email);
    expect(joinedConsoleOutput()).not.toContain(email);
  });

  it('redacts a client_x509_cert_url JSON value in both sinks', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => captured.push(message),
    });

    const url =
      'https://www.googleapis.com/robot/v1/metadata/x509/svc%40my-proj.iam.gserviceaccount.com';
    logger.error(`cert error {"client_x509_cert_url":"${url}"}`);

    expect(captured.join('\n')).not.toContain(
      'svc%40my-proj.iam.gserviceaccount.com',
    );
    expect(joinedConsoleOutput()).not.toContain(
      'svc%40my-proj.iam.gserviceaccount.com',
    );
  });

  it('leaves a normal line unchanged in both sinks', () => {
    const captured: string[] = [];
    const logger = createCLILogger({
      onLine: (_level, message) => captured.push(message),
    });

    logger.info('Connected to BigQuery dataset analytics');

    expect(captured).toEqual(['Connected to BigQuery dataset analytics']);
    expect(joinedConsoleOutput()).toContain(
      'Connected to BigQuery dataset analytics',
    );
  });

  it('redaction runs before the onLine tap (ring snapshot is already scrubbed)', () => {
    // A credential routed through the collector path (D1 wiring): the deployed
    // bundle builds its logger from createCLILoggerConfig, so its destination
    // errors flow through the identical onLine tap. The snapshot must be clean.
    const ringMessages: string[] = [];
    const config = createCLILoggerConfig({
      verbose: false,
      silent: true,
      onLine: (level, message) => {
        if (level === Level.ERROR) ringMessages.push(message);
      },
    });

    // Drive the collector path exactly as the D1 tests do.
    const secret = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw==';
    config.handler?.(
      Level.ERROR,
      `BigQuery init failed: {"private_key":"-----BEGIN PRIVATE KEY-----\\n${secret}\\n-----END PRIVATE KEY-----\\n"}`,
      {},
      ['bq'],
      noopDefaultHandler,
    );

    expect(ringMessages).toHaveLength(1);
    expect(ringMessages[0]).not.toContain(secret);
    expect(ringMessages[0]).toContain('BigQuery init failed');
  });

  it('does not over-truncate a long non-secret message in console (legibility)', () => {
    const logger = createCLILogger({ verbose: true });
    const long = 'diagnostic detail '.repeat(40);
    logger.info(long);
    expect(joinedConsoleOutput()).toContain(long.trimEnd());
  });
});
