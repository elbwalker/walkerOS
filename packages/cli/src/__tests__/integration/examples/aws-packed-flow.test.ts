/**
 * Integration Test: the packed AWS destination package in a bundled JSON flow.
 *
 * - `npm pack` the built `@walkeros/server-destination-aws` and unpack it, so
 *   the flow uses exactly what a user installs (the published `files`).
 * - The flow JSON holds only what a user writes: both exports, `streamName`,
 *   `topicArn`, `settings.config.endpoint` and `config.credentials` as
 *   `$secret` references whose values come from `process.env`.
 * - The bundle runs in a plain Node child process: the AWS SDK loads parts of
 *   itself through dynamic `import()`, which Jest's CommonJS runtime rejects,
 *   and a child process is also how the runner executes a bundle.
 * - The real SDK talks to a fake AWS on 127.0.0.1 with dummy keys.
 */

import { execFile } from 'child_process';
import fs from 'fs-extra';
import http from 'http';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';
import type { Flow } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { bundle } from '../../../commands/bundle/index.js';

jest.setTimeout(180_000);

const run = promisify(execFile);

const packagesDir = path.resolve(__dirname, '../../../../..');
const awsDir = path.join(packagesDir, 'server/destinations/aws');

const STREAM = 'walkeros-events';
const TOPIC_ARN = 'arn:aws:sns:eu-west-1:123456789012:walkeros-events';
const KEY_ID = 'AKIDT4PACKED';
const SECRET = 't4-dummy-secret';

interface FakeRequest {
  target: string;
  authorization: string;
  body: string;
}

/**
 * The fake answers both protocols: Firehose speaks JSON 1.1 (`x-amz-target`
 * header, JSON body, base64 `Data`), SNS speaks the query protocol (form
 * body with `Action`, XML response).
 */
function startFakeAws(requests: FakeRequest[]): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString('utf8')));
    req.on('end', () => {
      const header = req.headers['x-amz-target'];
      const target =
        typeof header === 'string'
          ? header
          : (new URLSearchParams(body).get('Action') ?? 'unknown');
      const authorization = req.headers.authorization ?? '';
      requests.push({ target, authorization, body });

      if (target.endsWith('.PutRecordBatch')) {
        const parsed: unknown = JSON.parse(body);
        const records =
          isObject(parsed) && Array.isArray(parsed.Records)
            ? parsed.Records
            : [];
        res.writeHead(200, { 'content-type': 'application/x-amz-json-1.1' });
        res.end(
          JSON.stringify({
            FailedPutCount: 0,
            Encrypted: false,
            RequestResponses: records.map((_, i) => ({ RecordId: `r-${i}` })),
          }),
        );
        return;
      }

      if (target === 'Publish') {
        res.writeHead(200, { 'content-type': 'text/xml' });
        res.end(
          '<PublishResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/"><PublishResult><MessageId>m-1</MessageId></PublishResult><ResponseMetadata><RequestId>r</RequestId></ResponseMetadata></PublishResponse>',
        );
        return;
      }

      res.writeHead(400, { 'content-type': 'application/x-amz-json-1.1' });
      res.end(JSON.stringify({ __type: 'UnknownOperationException' }));
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(server)),
  );
}

/** Imports the bundle, pushes one event, shuts down, prints the status. */
const RUNNER = `
const { default: factory } = await import(process.argv[2]);
const { collector } = await factory({});
await collector.push({ name: 'order complete', data: { id: 'o-1', total: 42 } });
await collector.command('shutdown');
process.stdout.write(JSON.stringify(collector.status.destinations));
`;

function decodeRecord(body: string): string {
  const parsed: unknown = JSON.parse(body);
  if (!isObject(parsed) || !Array.isArray(parsed.Records))
    throw new Error('PutRecordBatch body has no Records');
  expect(parsed.DeliveryStreamName).toBe(STREAM);
  expect(parsed.Records).toHaveLength(1);
  const record: unknown = parsed.Records[0];
  if (!isObject(record) || typeof record.Data !== 'string')
    throw new Error('record has no base64 Data');
  return Buffer.from(record.Data, 'base64').toString('utf8');
}

function readCount(status: unknown, id: string, key: string): unknown {
  if (!isObject(status)) return undefined;
  const dest = status[id];
  return isObject(dest) ? dest[key] : undefined;
}

describe('packed AWS destinations in a bundled JSON flow', () => {
  let workDir: string;
  let server: http.Server;
  const requests: FakeRequest[] = [];

  beforeAll(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aws-packed-flow-'));
    server = await startFakeAws(requests);
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    delete process.env.T4_AWS_KEY_ID;
    delete process.env.T4_AWS_SECRET;
    await fs.remove(workDir);
  });

  it('delivers one PutRecordBatch and one Publish with $secret credentials', async () => {
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('the fake server has no port');
    const endpoint = `http://127.0.0.1:${address.port}`;

    // The package exactly as npm would install it.
    const packDir = path.join(workDir, 'pack');
    await fs.ensureDir(packDir);
    const { stdout: packed } = await run(
      'npm',
      ['pack', '--silent', '--pack-destination', packDir],
      { cwd: awsDir },
    );
    const tarball = path.join(packDir, packed.trim().split('\n').pop() ?? '');
    await run('tar', ['-xzf', tarball, '-C', packDir]);
    const awsPackage = path.join(packDir, 'package');

    const credentials = {
      accessKeyId: '$secret.T4_AWS_KEY_ID',
      secretAccessKey: '$secret.T4_AWS_SECRET',
    };
    const config: Flow.Json = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: {
              packages: {
                '@walkeros/collector': {
                  path: path.join(packagesDir, 'collector'),
                  imports: ['startFlow'],
                },
                '@walkeros/core': { path: path.join(packagesDir, 'core') },
                '@walkeros/server-core': {
                  path: path.join(packagesDir, 'server/core'),
                },
                '@walkeros/server-destination-aws': { path: awsPackage },
              },
            },
          },
          collector: { run: true },
          destinations: {
            firehose: {
              package: '@walkeros/server-destination-aws',
              import: 'destinationFirehose',
              config: {
                settings: {
                  streamName: STREAM,
                  region: 'eu-west-1',
                  config: { endpoint },
                },
                credentials,
              },
            },
            sns: {
              package: '@walkeros/server-destination-aws',
              import: 'destinationSNS',
              config: {
                settings: { topicArn: TOPIC_ARN, config: { endpoint } },
                credentials,
              },
            },
          },
        },
      },
    };

    const bundlePath = path.join(workDir, 'out', 'bundle.mjs');
    await bundle(config, {
      silent: true,
      buildOverrides: { output: bundlePath },
    });

    // The secret values exist only in the environment, never in the bundle.
    process.env.T4_AWS_KEY_ID = KEY_ID;
    process.env.T4_AWS_SECRET = SECRET;
    expect(await fs.readFile(bundlePath, 'utf8')).not.toContain(SECRET);

    // No profile, no instance metadata, no developer keys may leak in.
    const awsHome = path.join(workDir, 'aws-home');
    await fs.ensureDir(awsHome);
    await fs.writeFile(path.join(awsHome, 'config'), '');
    await fs.writeFile(path.join(awsHome, 'credentials'), '');
    const env: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env))
      if (!key.startsWith('AWS_')) env[key] = value;
    env.AWS_CONFIG_FILE = path.join(awsHome, 'config');
    env.AWS_SHARED_CREDENTIALS_FILE = path.join(awsHome, 'credentials');
    env.AWS_EC2_METADATA_DISABLED = 'true';

    const runner = path.join(workDir, 'runner.mjs');
    await fs.writeFile(runner, RUNNER);
    const { stdout } = await run(
      process.execPath,
      [runner, pathToFileURL(bundlePath).href],
      { cwd: path.dirname(bundlePath), env },
    );

    const firehoseCalls = requests.filter((r) =>
      r.target.endsWith('.PutRecordBatch'),
    );
    const snsCalls = requests.filter((r) => r.target === 'Publish');
    expect(firehoseCalls).toHaveLength(1);
    expect(snsCalls).toHaveLength(1);
    expect(requests).toHaveLength(2);

    // Both requests were signed with the keys the $secret references hold.
    for (const call of requests)
      expect(call.authorization).toContain(`Credential=${KEY_ID}/`);

    // Firehose: the full event as JSON, framed with a trailing newline.
    const data = decodeRecord(firehoseCalls[0].body);
    expect(data.endsWith('\n')).toBe(true);
    const record: unknown = JSON.parse(data);
    expect(record).toMatchObject({
      name: 'order complete',
      data: { id: 'o-1', total: 42 },
    });

    // SNS: the same event as the message, to the configured topic.
    const publish = new URLSearchParams(snsCalls[0].body);
    expect(publish.get('TopicArn')).toBe(TOPIC_ARN);
    const message: unknown = JSON.parse(publish.get('Message') ?? '');
    expect(message).toMatchObject({ name: 'order complete' });
    expect(isObject(message) && isObject(record) && message.id).toBe(
      isObject(record) && record.id,
    );

    // The collector counts both as delivered.
    const status: unknown = JSON.parse(stdout);
    expect(readCount(status, 'firehose', 'count')).toBe(1);
    expect(readCount(status, 'firehose', 'failed')).toBe(0);
    expect(readCount(status, 'sns', 'count')).toBe(1);
    expect(readCount(status, 'sns', 'failed')).toBe(0);
  });
});
