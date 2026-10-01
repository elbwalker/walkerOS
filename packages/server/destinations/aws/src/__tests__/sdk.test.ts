// The real SDK against a fake AWS on 127.0.0.1, through the published
// exports and pure JSON configs: no env, no client, dummy keys.
jest.unmock('@aws-sdk/client-sns');
jest.unmock('@aws-sdk/client-sts');

import { mkdtempSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import type { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Destination } from '@walkeros/core';
import { createEvent, createMockContext, isObject } from '@walkeros/core';
import firehose, { destinationSNS } from '../index';
import type { DestinationFirehose } from '../index';
import { AwsDeliveryError } from '../lib/errors';

interface FakeRequest {
  target: string;
  body: string;
}

type Reply = (req: FakeRequest, res: ServerResponse) => void;

const KEYS = { accessKeyId: 'AKIDFAKE', secretAccessKey: 'fake-secret' };
const STREAM = 'walkeros-events';

let server: Server;
let endpoint: string;
let requests: FakeRequest[] = [];
let replies: Reply[] = [];
const sockets = new Set<Socket>();
const savedEnv = { ...process.env };

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/x-amz-json-1.1' });
  res.end(JSON.stringify(body));
}

function xml(res: ServerResponse, body: string): void {
  res.writeHead(200, { 'content-type': 'text/xml' });
  res.end(body);
}

/** Firehose: every record accepted. */
const accept: Reply = (req, res) => {
  const parsed: unknown = JSON.parse(req.body);
  const records =
    isObject(parsed) && Array.isArray(parsed.Records) ? parsed.Records : [];
  json(res, 200, {
    FailedPutCount: 0,
    Encrypted: false,
    RequestResponses: records.map((_, i) => ({ RecordId: `r-${i}` })),
  });
};

const unavailable: Reply = (_req, res) =>
  json(res, 500, { __type: 'ServiceUnavailableException', message: 'busy' });

const hang: Reply = () => undefined;

/** SNS and STS speak the query protocol. */
const query: Reply = (req, res) => {
  const action = new URLSearchParams(req.body).get('Action');
  if (action === 'GetCallerIdentity')
    return xml(
      res,
      '<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><GetCallerIdentityResult><Arn>arn:aws:iam::123456789012:user/fake</Arn><UserId>FAKE</UserId><Account>123456789012</Account></GetCallerIdentityResult><ResponseMetadata><RequestId>r</RequestId></ResponseMetadata></GetCallerIdentityResponse>',
    );
  xml(
    res,
    '<PublishResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/"><PublishResult><MessageId>m-1</MessageId></PublishResult><ResponseMetadata><RequestId>r</RequestId></ResponseMetadata></PublishResponse>',
  );
};

function handle(req: IncomingMessage, res: ServerResponse): void {
  let body = '';
  req.on('data', (chunk: Buffer) => (body += chunk.toString('utf8')));
  req.on('end', () => {
    const header = req.headers['x-amz-target'];
    const target =
      typeof header === 'string'
        ? header
        : (new URLSearchParams(body).get('Action') ?? 'unknown');
    const request = { target, body };
    requests.push(request);
    const reply = replies.length > 1 ? replies.shift() : replies[0];
    (reply ?? accept)(request, res);
  });
}

beforeAll(async () => {
  server = createServer(handle);
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('the fake server has no port');
  endpoint = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  process.env = savedEnv;
});

beforeEach(() => {
  requests = [];
  replies = [];
  // Nothing from the developer machine may leak in: no profile, no keys,
  // no instance metadata.
  const dir = mkdtempSync(join(tmpdir(), 'aws-sdk-test-'));
  writeFileSync(join(dir, 'config'), '');
  writeFileSync(join(dir, 'credentials'), '');
  for (const key of Object.keys(process.env))
    if (key.startsWith('AWS_')) delete process.env[key];
  process.env.AWS_CONFIG_FILE = join(dir, 'config');
  process.env.AWS_SHARED_CREDENTIALS_FILE = join(dir, 'credentials');
  process.env.AWS_EC2_METADATA_DISABLED = 'true';
});

const id = 'aws';

async function initFirehose(extra: object = {}) {
  const config = await firehose.init(
    createMockContext({
      config: JSON.parse(
        JSON.stringify({
          settings: {
            streamName: STREAM,
            region: 'eu-west-1',
            config: { endpoint },
          },
          credentials: KEYS,
          ...extra,
        }),
      ),
      id,
    }),
  );
  if (!config) throw new Error('init returned nothing');
  return config;
}

function sentRecords(request: FakeRequest): string[] {
  const parsed: unknown = JSON.parse(request.body);
  if (!isObject(parsed) || !Array.isArray(parsed.Records)) return [];
  return parsed.Records.map((record: unknown) =>
    isObject(record) && typeof record.Data === 'string'
      ? Buffer.from(record.Data, 'base64').toString('utf8')
      : '',
  );
}

function batchOf(
  count: number,
): Destination.Batch<DestinationFirehose.Mapping> {
  const events = Array.from({ length: count }, (_, i) =>
    createEvent({ id: `ev-${i}` }),
  );
  return {
    key: 'default',
    entries: events.map((event) => ({ event })),
    events,
    data: [],
  };
}

describe('Firehose with the real SDK', () => {
  test('(a) one event is one PutRecordBatch of the event JSON plus \\n', async () => {
    const config = await initFirehose();
    const event = createEvent();
    await firehose.push(event, createMockContext({ config, id }));

    expect(requests.map((r) => r.target)).toEqual([
      'Firehose_20150804.PutRecordBatch',
    ]);
    expect(sentRecords(requests[0])).toEqual([`${JSON.stringify(event)}\n`]);
  });

  test('(b) a 200 with one record failed reports it retryable, one request', async () => {
    replies = [
      (req, res) => {
        const count = sentRecords(req).length;
        json(res, 200, {
          FailedPutCount: 1,
          RequestResponses: Array.from({ length: count }, (_, i) =>
            i === 1
              ? {
                  ErrorCode: 'ServiceUnavailableException',
                  ErrorMessage: 'Slow down.',
                }
              : { RecordId: `r-${i}` },
          ),
        });
      },
    ];
    const config = await initFirehose();
    const outcome = await firehose.pushBatch?.(
      batchOf(3),
      createMockContext({ config, id }),
    );

    expect(requests).toHaveLength(1);
    expect(outcome).toEqual({
      failed: [
        {
          index: 1,
          error: expect.objectContaining({
            code: 'ServiceUnavailableException',
            retryable: true,
          }),
        },
      ],
    });
  });

  test('(c) a 500 then a 200 is delivered in two requests', async () => {
    replies = [unavailable, accept];
    const config = await initFirehose();
    await firehose.push(createEvent(), createMockContext({ config, id }));
    expect(requests).toHaveLength(2);
  });

  test('(d) only 500s: exactly three requests, then a retryable throw', async () => {
    replies = [unavailable];
    const config = await initFirehose();
    const error = await Promise.resolve(
      firehose.push(createEvent(), createMockContext({ config, id })),
    ).catch((e: unknown) => e);

    expect(requests).toHaveLength(3);
    expect(error).toBeInstanceOf(AwsDeliveryError);
    expect(error).toMatchObject({
      code: 'ServiceUnavailableException',
      status: 500,
      retryable: true,
    });
  });

  test('(e) no answer: three requests, failed before config.timeout', async () => {
    replies = [hang];
    const config = await initFirehose({ timeout: 4000 });
    const started = Date.now();
    const error = await Promise.resolve(
      firehose.push(createEvent(), createMockContext({ config, id })),
    ).catch((e: unknown) => e);
    const elapsed = Date.now() - started;

    expect(requests).toHaveLength(3);
    expect(error).toMatchObject({ retryable: true });
    expect(elapsed).toBeLessThan(4000);
  }, 15_000);

  test('(g) no credentials anywhere: init resolves, the first push names the fix', async () => {
    const config = await firehose.init(
      createMockContext({
        config: {
          settings: {
            streamName: STREAM,
            region: 'eu-west-1',
            config: { endpoint },
          },
        },
        id,
      }),
    );
    if (!config) throw new Error('init returned nothing');

    const error = await Promise.resolve(
      firehose.push(createEvent(), createMockContext({ config, id })),
    ).catch((e: unknown) => e);

    expect(requests).toEqual([]);
    expect(error).toBeInstanceOf(AwsDeliveryError);
    expect(String(error)).toContain('config.credentials');
  }, 15_000);
});

describe('SNS with the real SDK', () => {
  async function initSns(settings: object) {
    const config = await destinationSNS.init?.(
      createMockContext({
        config: JSON.parse(
          JSON.stringify({
            settings: { ...settings, config: { endpoint } },
            credentials: KEYS,
          }),
        ),
        id: 'sns',
      }),
    );
    if (!config) throw new Error('init returned nothing');
    return config;
  }

  test('(f) Publish on a FIFO topic defaults the dedup id to the event id', async () => {
    replies = [query];
    const config = await initSns({
      topicArn: 'arn:aws:sns:eu-west-1:123456789012:orders.fifo',
    });
    await destinationSNS.push(
      createEvent({ id: 'ev-fifo' }),
      createMockContext({
        config,
        id: 'sns',
        rule: { settings: { messageGroupId: { value: 'g' } } },
      }),
    );

    expect(requests.map((r) => r.target)).toEqual(['Publish']);
    const params = new URLSearchParams(requests[0].body);
    expect(params.get('MessageDeduplicationId')).toBe('ev-fifo');
    expect(params.get('TopicArn')).toBe(
      'arn:aws:sns:eu-west-1:123456789012:orders.fifo',
    );
  });

  test('(f) a topicName-only config looks up the account at the first publish', async () => {
    replies = [query];
    process.env.AWS_ENDPOINT_URL_STS = endpoint;
    const config = await initSns({
      topicName: 'walkeros-events',
      region: 'eu-west-1',
    });
    expect(requests).toEqual([]);

    await destinationSNS.push(
      createEvent(),
      createMockContext({ config, id: 'sns' }),
    );
    await destinationSNS.push(
      createEvent(),
      createMockContext({ config, id: 'sns' }),
    );

    expect(requests.map((r) => r.target)).toEqual([
      'GetCallerIdentity',
      'Publish',
      'Publish',
    ]);
    expect(new URLSearchParams(requests[1].body).get('TopicArn')).toBe(
      'arn:aws:sns:eu-west-1:123456789012:walkeros-events',
    );
  });
});
