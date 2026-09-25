import { generateKeyPairSync } from 'crypto';
import type { Simulation } from '@walkeros/core';
import type { PushResult } from '../types';

jest.mock('../run', () => ({ runPushCommandWithSecrets: jest.fn() }));

import { runPushCommandWithSecrets } from '../run';
import { formatPushResult, pushCommand } from '../index';

const mockedRun = jest.mocked(runPushCommandWithSecrets);

const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs8', format: 'pem' })
  .toString();
const keyBody = privateKey.split('\n')[1];
const clientEmail = 'svc@my-proj.iam.gserviceaccount.com';
const privateKeyId = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
const metaToken =
  'EAABsbCS1iHgBAKZCZBqwZDZDq7xQ9kLmN3pRsT5vWyZ1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';
const bearerToken = 'a8Kf3Lq9Zx2Mv7Np4Rt6Yw1Bc5Hd0Gj8Sk3Tu9Ve';

function destination(
  name: string,
  fields: Partial<Simulation.Result>,
): Simulation.Result {
  return {
    step: 'destination',
    name,
    events: [],
    calls: [],
    duration: 1,
    ...fields,
  };
}

const secretResult: PushResult = {
  success: true,
  duration: 5,
  simulations: [
    destination('meta', {
      mappingKey: 'order complete',
      calls: [
        {
          fn: 'BigQuery',
          args: [
            {
              credentials: {
                type: 'service_account',
                private_key: privateKey,
                client_email: clientEmail,
                private_key_id: privateKeyId,
              },
            },
          ],
          ts: 1,
        },
        {
          fn: 'sendServer',
          args: [
            `https://graph.facebook.com/v19.0/1/events?access_token=${metaToken}`,
            '{"event_name":"order complete"}',
            { headers: { Authorization: `Bearer ${bearerToken}` } },
          ],
          ts: 2,
        },
      ],
    }),
  ],
};

const secrets = [keyBody, clientEmail, privateKeyId, metaToken, bearerToken];

class ExitCalled extends Error {}

async function runCommand(json: boolean): Promise<string> {
  mockedRun.mockResolvedValue({ result: secretResult, knownSecrets: [] });
  const written: string[] = [];
  jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    written.push(String(chunk));
    return true;
  });
  jest.spyOn(process, 'exit').mockImplementation(() => {
    throw new ExitCalled();
  });
  await expect(pushCommand({ event: '{}', json })).rejects.toThrow(ExitCalled);
  return written.join('');
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pushCommand output egresses through scrubSecrets', () => {
  it.each([
    ['--json', true],
    ['text', false],
  ])('%s output holds no secret and keeps the request', async (_l, json) => {
    const output = await runCommand(json);
    for (const secret of secrets) expect(output).not.toContain(secret);
    expect(output).not.toContain('PRIVATE KEY');
    expect(output).toContain('order complete');
    expect(output).toContain('graph.facebook.com/v19.0/1/events');
  });

  it('--json output carries the simulations', async () => {
    const parsed: unknown = JSON.parse(await runCommand(true));
    expect(parsed).toMatchObject({
      success: true,
      simulations: [{ step: 'destination', name: 'meta' }],
    });
  });
});

describe('formatPushResult', () => {
  it('prints one block per simulated destination', () => {
    const result: PushResult = {
      success: false,
      duration: 12,
      error: 'simulate destination.meta: boom',
      simulations: [
        destination('pubsub', {
          mappingKey: 'order complete',
          calls: [
            {
              fn: 'PubSub.topic.publishMessage',
              args: [{ data: Buffer.from('{"name":"order complete"}') }],
              ts: 1,
            },
          ],
        }),
        destination('piwikpro', {}),
        destination('meta', { error: new Error('boom') }),
      ],
    };

    expect(formatPushResult(result)).toBe(
      [
        'success: false',
        '  destination.pubsub',
        '    mapping: order complete',
        '    call PubSub.topic.publishMessage({"data":"{\\"name\\":\\"order complete\\"}"})',
        '  destination.piwikpro',
        '    mapping: none (skipped before mapping)',
        '    no calls',
        '  destination.meta',
        '    error: boom',
        '  Error: simulate destination.meta: boom',
        '  Duration: 12ms',
      ].join('\n'),
    );
  });

  it('prints mapping: none for a destination that pushed without a rule', () => {
    const result: PushResult = {
      success: true,
      duration: 1,
      simulations: [
        destination('bigquery', {
          calls: [{ fn: 'JSONWriter.appendRows', args: [[]], ts: 1 }],
        }),
      ],
    };
    expect(formatPushResult(result).split('\n').slice(1, 4)).toEqual([
      '  destination.bigquery',
      '    mapping: none',
      '    call JSONWriter.appendRows([])',
    ]);
  });

  it('cuts long call arguments at 300 chars', () => {
    const result: PushResult = {
      success: true,
      duration: 1,
      simulations: [
        destination('api', {
          mappingKey: 'page view',
          calls: [{ fn: 'sendServer', args: ['word '.repeat(100)], ts: 1 }],
        }),
      ],
    };
    const callLine = formatPushResult(result)
      .split('\n')
      .find((line) => line.startsWith('    call sendServer('));
    expect(callLine).toBe(
      `    call sendServer(${`"${'word '.repeat(100)}`.slice(0, 297)}...)`,
    );
  });

  it('renders a cyclic argument and an Error argument without throwing', () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const result: PushResult = {
      success: true,
      duration: 1,
      simulations: [
        destination('api', {
          mappingKey: 'page view',
          calls: [{ fn: 'fetch', args: [cyclic, new Error('nope')], ts: 1 }],
        }),
      ],
    };
    expect(formatPushResult(result)).toContain(
      '    call fetch({"self":"[Circular]"},{"name":"Error","message":"nope"})',
    );
  });
});
