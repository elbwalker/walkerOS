import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent, Logger } from '@walkeros/core';
import { destinationCriteo } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * The id.email Criteo receives for an email mapped from the event data, and
 * the ERROR lines written.
 */
async function send(email: WalkerOS.Property, doNotHash?: HashKey[]) {
  const bodies: string[] = [];
  const errors: unknown[] = [];
  const env: Env = {
    sendServer: async (_url, body) => {
      bodies.push(String(body));
      return { data: 'OK' };
    },
  };
  const settings: Settings = {
    partnerId: '12345',
    callerId: 'CALLER_ID',
    doNotHash,
    user_data: { email: 'data.email' },
  };
  const { collector } = await startFlow({
    logger: {
      handler: (level, message, context) => {
        if (level === Logger.Level.ERROR) errors.push([message, context]);
      },
    },
    destinations: {
      criteo: { code: destinationCriteo, config: { settings }, env },
    },
  });

  const result = await collector.push(
    createEvent({ name: 'page view', data: { email } }),
  );
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  return { email: JSON.parse(bodies[0]).id.email, errors };
}

// md5, sha256 and sha256_md5 of 'user@example.com'
const user = {
  md5: 'b58996c504c5638798eb6b511e6f49af',
  sha256: 'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
  sha256_md5:
    '7f7892563bd354c8aa47ec54a5ce8c6100c6258089273db2f8c777e1853d365b',
};

describe('Criteo email hashing', () => {
  it.each<[string, string, HashKey[], unknown]>([
    ['an email is hashed into three forms', 'user@example.com', [], user],
    [
      'an email is lowercased and trimmed first',
      '  USER@Example.COM  ',
      [],
      user,
    ],
    ['an empty email is left out', '   ', [], undefined],
    [
      'a doNotHash email is sent as its SHA-256 digest',
      user.sha256,
      ['email'],
      { sha256: user.sha256 },
    ],
  ])('%s', async (_, email, doNotHash, expected) => {
    expect((await send(email, doNotHash)).email).toEqual(expected);
  });

  it('leaves out a list under email and reports it in one ERROR line', async () => {
    const { email, errors } = await send([
      'user@example.com',
      'jane@example.com',
    ]);

    expect(email).toBeUndefined();
    expect(errors).toEqual([
      [
        expect.stringContaining(
          'Criteo user_data email left out: Criteo takes one value, not a list',
        ),
        { step: 'destination.criteo', code: 'mapping', event: 'page view' },
      ],
    ]);
  });
});
