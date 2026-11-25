import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent, Logger } from '@walkeros/core';
import { destinationReddit } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * The user Reddit receives when each key of the event data is mapped to the
 * user key of the same name, and the ERROR lines written.
 */
async function send(data: WalkerOS.Properties, doNotHash?: HashKey[]) {
  const bodies: string[] = [];
  const errors: unknown[] = [];
  const env: Env = {
    sendServer: async (_url, body) => {
      bodies.push(String(body));
      return {
        data: { message: 'Successfully processed 1 conversion events.' },
      };
    },
  };
  const settings: Settings = {
    accessToken: 's3cr3t',
    pixelId: 'a2_abcdef123456',
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
      reddit: { code: destinationReddit, config: { settings }, env },
    },
  });

  const result = await collector.push(createEvent({ name: 'page view', data }));
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  return { user: JSON.parse(bodies[0]).events[0].user, errors };
}

describe('Reddit user hashing', () => {
  // Reddit's published examples
  // https://ads-api.reddit.com/docs/v3/guides/programs/capi/direct-integration
  const digest = {
    email: '798730f4ebe7e5e3faadc1745101ebc181574ef65ae5127213a617d8ca209fa1',
    phone: 'e5b124c58580eb16bd959b8d0cac12b12c952e2ceae0203d416cff94f10b994a',
    idfa: '70574fa9c8f498a7b2e5c8712b1126de7b1406fd02fdc591821c5bd33092fd1c',
    aaid: 'f23b554b2a8fb732a8b973733832e70f018da7bc294dfea289735a07d5dd2c9f',
    externalId:
      'a4cc2fc5adf58a029291c1514d273989113a1d05e1d753c1d0c3a848af7109cc',
    // sha256('Customer12345'), sha256('203.0.113.7') and sha256 of the email
    // digest itself
    mixedCaseId:
      '0d5e32d264a63bf349c5a6d18fa45a9a1c10218b8f58c9874b5b0f48ad5db82c',
    ip: 'fec52565aa0cf18f57d7cf5b3ac728503b8992d2d6f7d46da1d1201090902b02',
    emailHashed:
      'ee4e1cb07a6cfa8be87450027c02f1a130ca327748860ae4a51028c0c99ad119',
  };

  it.each<[string, WalkerOS.Properties, HashKey[], Record<string, unknown>]>([
    [
      'email lowercased, alias and dots of the local part removed',
      { email: 'Al.ice$+Apple@Example.Com' },
      [],
      { email: digest.email },
    ],
    [
      'phone_number without extension, digits only, with +',
      { phone_number: '+1 (555) 444-1234 ext. 789' },
      [],
      { phone_number: digest.phone },
    ],
    [
      'idfa uppercased, dashes kept',
      { idfa: 'ea7583cd-a667-48bc-b806-42ecb2b48606' },
      [],
      { idfa: digest.idfa },
    ],
    [
      'aaid lowercased, dashes kept',
      { aaid: 'CDDA802E-FB9C-47AD-9866-0794D394C912' },
      [],
      { aaid: digest.aaid },
    ],
    [
      'external_id hashed as given',
      { external_id: 'customer12345' },
      [],
      { external_id: digest.externalId },
    ],
    [
      'external_id keeps its case',
      { external_id: 'Customer12345' },
      [],
      { external_id: digest.mixedCaseId },
    ],
    [
      'ip_address hashed, user_agent and uuid sent as mapped',
      { ip_address: '203.0.113.7', user_agent: 'Mozilla/5.0', uuid: '123' },
      [],
      { ip_address: digest.ip, user_agent: 'Mozilla/5.0', uuid: '123' },
    ],
    [
      'a value that normalizes to nothing left out',
      { email: '', phone_number: 'n/a', idfa: '  ', uuid: '123' },
      [],
      { uuid: '123' },
    ],
    [
      'a SHA-256 digest outside doNotHash hashed like any value',
      { email: digest.email },
      [],
      { email: digest.emailHashed },
    ],
    [
      'a doNotHash key sent as mapped',
      { email: digest.email },
      ['email'],
      { email: digest.email },
    ],
  ])('%s', async (_, data, doNotHash, expected) => {
    expect((await send(data, doNotHash)).user).toEqual(expected);
  });

  it('leaves out a list under email and reports it in one ERROR line', async () => {
    const { user, errors } = await send({
      email: ['alice@example.com', 'bob@example.com'],
      external_id: 'customer12345',
    });

    expect(user).toEqual({ external_id: digest.externalId });
    expect(errors).toEqual([
      [
        expect.stringContaining(
          'Reddit user email left out: Reddit takes one value, not a list',
        ),
        { step: 'destination.reddit', code: 'mapping', event: 'page view' },
      ],
    ]);
  });
});
