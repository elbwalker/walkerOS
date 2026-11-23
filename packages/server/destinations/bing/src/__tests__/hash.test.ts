import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent, Logger } from '@walkeros/core';
import { destinationBing } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * The userData Microsoft receives when each key of the event data is mapped
 * to the userData key of the same name, and the ERROR lines written.
 */
async function send(data: WalkerOS.Properties, doNotHash?: HashKey[]) {
  const bodies: string[] = [];
  const errors: unknown[] = [];
  const env: Env = {
    sendServer: async (_url, body) => {
      bodies.push(String(body));
      return { data: {} };
    },
  };
  const settings: Settings = {
    accessToken: 's3cr3t',
    tagId: 'UET-12345',
    ip: false,
    userAgent: false,
    doNotHash,
    user_data: Object.fromEntries(
      Object.keys(data).map((key) => [key, `data.${key}`]),
    ),
  };
  const { collector } = await startFlow({
    logger: {
      handler: (level, message, context) => {
        if (level === Logger.Level.ERROR) errors.push([message, context]);
      },
    },
    destinations: {
      bing: { code: destinationBing, config: { settings }, env },
    },
  });

  const result = await collector.push(createEvent({ name: 'page view', data }));
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  return { userData: JSON.parse(bodies[0]).data[0].userData, errors };
}

describe('Bing userData hashing', () => {
  // Microsoft's published example: john@contoso.com and +14255551234
  // https://learn.microsoft.com/en-us/advertising/guides/uet-conversion-api-integration
  const em = 'ec81f3ac7b2b19675bab9d54cf416f9f18cff87c97da5cca82c0f0891bc40602';
  const ph = 'c59475d96e9f01d7d18d06cfad84dd02333207f02c0c2c5663ef2782cda0390e';

  it.each<[string, WalkerOS.Properties, HashKey[], Record<string, unknown>]>([
    [
      'em and ph match Microsoft example',
      { em: 'john@contoso.com', ph: '+14255551234' },
      [],
      { em, ph },
    ],
    [
      'em drops dots and the alias of the user part, ph is trimmed',
      { em: ' J.O.H.N+ads@Contoso.com ', ph: ' +14255551234 ' },
      [],
      { em, ph },
    ],
    [
      'empty values under hashed keys are left out, others are sent as mapped',
      { em: '', ph: '  ', anonymousId: '' },
      [],
      { anonymousId: '' },
    ],
    [
      'doNotHash values and keys it does not hash are sent as mapped',
      { em: em.toUpperCase(), externalId: 'user-123' },
      ['em'],
      { em: em.toUpperCase(), externalId: 'user-123' },
    ],
  ])('%s', async (_, data, doNotHash, expected) => {
    expect((await send(data, doNotHash)).userData).toEqual(expected);
  });

  it('leaves out a list under em and reports it in one ERROR line', async () => {
    const { userData, errors } = await send({
      em: ['john@contoso.com', 'jane@contoso.com'],
      ph: '+14255551234',
    });

    expect(userData).toEqual({ ph });
    expect(errors).toEqual([
      [
        expect.stringContaining(
          'Bing userData em left out: Microsoft takes one value, not a list',
        ),
        { step: 'destination.bing', code: 'mapping', event: 'page view' },
      ],
    ]);
  });
});
