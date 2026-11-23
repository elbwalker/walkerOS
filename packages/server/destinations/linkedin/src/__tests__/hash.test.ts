import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent, Logger } from '@walkeros/core';
import { destinationLinkedIn } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * Pushes an event of the given user to LinkedIn, with each key of data mapped
 * to the user_data key of the same name, and returns what was sent and the
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
    accessToken: 's3cr3t',
    conversionRuleId: '12345678',
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
      linkedin: { code: destinationLinkedIn, config: { settings }, env },
    },
  });

  const result = await collector.push(
    createEvent({ name: 'page view', user, data }),
  );
  await collector.command('shutdown');

  return { result, bodies, errors };
}

describe('LinkedIn email hashing', () => {
  it.each<[string, string, HashKey[], string]>([
    [
      'the email is trimmed and lowercased',
      ' User@Example.com ',
      [],
      'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
    ],
    [
      'a doNotHash email is sent as mapped',
      'B4C9A289323B21A01C3E940F150EB9B8C542587F1ABFD8F0E1CC1FFC5E475514',
      ['email'],
      'B4C9A289323B21A01C3E940F150EB9B8C542587F1ABFD8F0E1CC1FFC5E475514',
    ],
  ])('%s', async (_, email, doNotHash, idValue) => {
    const { result, bodies } = await send({ email }, doNotHash);

    expect(result.ok).toBe(true);
    expect(JSON.parse(bodies[0]).elements[0].user.userIds).toEqual([
      { idType: 'SHA256_EMAIL', idValue },
    ]);
  });

  it('leaves out a list under email and reports it in one ERROR line', async () => {
    const { result, bodies, errors } = await send(
      { email: 'user@example.com' },
      [],
      { email: ['user@example.com', 'jane@example.com'], li_fat_id: 'fat-1' },
    );

    expect(result.ok).toBe(true);
    expect(JSON.parse(bodies[0]).elements[0].user.userIds).toEqual([
      { idType: 'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID', idValue: 'fat-1' },
    ]);
    expect(errors).toEqual([
      [
        expect.stringContaining(
          'LinkedIn user_data email left out: LinkedIn takes one value, not a list',
        ),
        { step: 'destination.linkedin', code: 'mapping', event: 'page view' },
      ],
    ]);
  });

  it('sends no empty email, so an event with nothing else fails', async () => {
    const { result, bodies } = await send({ email: '  ' });

    expect(bodies).toEqual([]);
    expect(result.ok).toBe(false);
    expect(result.failed?.linkedin?.reason).toMatchObject({
      code: 'missing-input',
    });
  });
});
