import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent, Logger } from '@walkeros/core';
import { destinationTwitter } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * Pushes an event of the given user to X, with each key of data mapped to
 * the user_data key of the same name, and returns what was sent and the
 * ERROR lines written.
 */
async function send(
  user: WalkerOS.User,
  doNotHash?: HashKey[],
  data: WalkerOS.Properties = {},
) {
  const bodies: string[] = [];
  const errors: unknown[] = [];
  const env: Env = {
    sendServer: async (_url, body) => {
      bodies.push(String(body));
      return { data: {} };
    },
  };
  const settings: Settings = {
    pixelId: 'o8z6j',
    eventId: 'tw-o8z6j-o8z21',
    consumerKey: 'consumer-key',
    consumerSecret: 'consumer-secret',
    accessToken: 'access-token',
    accessTokenSecret: 'access-token-secret',
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
      twitter: { code: destinationTwitter, config: { settings }, env },
    },
  });

  const result = await collector.push(
    createEvent({ name: 'page view', user, data }),
  );
  await collector.command('shutdown');

  return { result, bodies, errors };
}

describe('X identifier hashing', () => {
  it.each<[string, WalkerOS.User, HashKey[], unknown[]]>([
    [
      'email is trimmed and lowercased',
      { email: ' User@Example.com ' },
      [],
      [
        {
          hashed_email:
            'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
        },
      ],
    ],
    [
      'phone is trimmed',
      { phone: ' +491701234567 ' },
      [],
      [
        {
          hashed_phone_number:
            'b4267a2234e2072fa4d2e8d89fbe727c50fc414731d6ecacc2ed3d00f05038d1',
        },
      ],
    ],
    [
      'doNotHash values are sent as mapped',
      {
        email:
          'B4C9A289323B21A01C3E940F150EB9B8C542587F1ABFD8F0E1CC1FFC5E475514',
      },
      ['email'],
      [
        {
          hashed_email:
            'B4C9A289323B21A01C3E940F150EB9B8C542587F1ABFD8F0E1CC1FFC5E475514',
        },
      ],
    ],
  ])('%s', async (_, user, doNotHash, expected) => {
    const { result, bodies } = await send(user, doNotHash);

    expect(result.ok).toBe(true);
    expect(JSON.parse(bodies[0]).conversions[0].identifiers).toEqual(expected);
  });

  it('leaves out a list under email and reports it in one ERROR line', async () => {
    const { result, bodies, errors } = await send(
      { email: 'user@example.com' },
      [],
      {
        email: ['user@example.com', 'jane@example.com'],
        phone: '+491701234567',
      },
    );

    expect(result.ok).toBe(true);
    expect(JSON.parse(bodies[0]).conversions[0].identifiers).toEqual([
      {
        hashed_phone_number:
          'b4267a2234e2072fa4d2e8d89fbe727c50fc414731d6ecacc2ed3d00f05038d1',
      },
    ]);
    expect(errors).toEqual([
      [
        expect.stringContaining(
          'X user_data email left out: X takes one value, not a list',
        ),
        { step: 'destination.twitter', code: 'mapping', event: 'page view' },
      ],
    ]);
  });

  it('sends no empty email or phone, so an event with nothing else fails', async () => {
    const { result, bodies } = await send({ email: '  ', phone: '' });

    expect(bodies).toEqual([]);
    expect(result.ok).toBe(false);
    expect(result.failed?.twitter?.reason).toMatchObject({
      code: 'missing-input',
    });
  });
});
