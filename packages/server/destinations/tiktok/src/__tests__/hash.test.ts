import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';
import { destinationTikTok } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * The user TikTok receives when each key of the event data is mapped to the
 * user_data key of the same name.
 */
async function send(data: WalkerOS.Properties, doNotHash?: HashKey[]) {
  const bodies: string[] = [];
  const env: Env = {
    sendServer: async (_url, body) => {
      bodies.push(String(body));
      return { data: { code: 0, message: 'OK' } };
    },
  };
  const settings: Settings = {
    accessToken: 's3cr3t',
    pixelCode: 'PIXEL_CODE',
    ip: false,
    userAgent: false,
    doNotHash,
    user_data: Object.fromEntries(
      Object.keys(data).map((key) => [key, `data.${key}`]),
    ),
  };
  const { collector } = await startFlow({
    destinations: {
      tiktok: { code: destinationTikTok, config: { settings }, env },
    },
  });

  const result = await collector.push(createEvent({ name: 'page view', data }));
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  return JSON.parse(bodies[0]).data[0].user;
}

describe('TikTok user hashing', () => {
  // TikTok's published examples: " ALICE_abc@gmail.com ", "(+1)2133734253"
  // and "user_123"
  // https://business-api.tiktok.com/portal/docs?id=1771101151059969
  const digest = {
    alice: '848a771458438fc2ec420560d769fb9b9b86851ee338ec56517baabd79d3bb4f',
    tiktokPhone:
      '9f7ec22d72092cd3c0b58726ed9c2d91b92e51a3f29837508fb2948bb22dd2fd',
    user123: '80fba0ae1c48e3978e43e4efc365e14e12ea0c830ba8ba5b9a2dafc7e3f2ab8b',
    phone: 'dadb5627eafe593ed1ff20f4c40a3cca26ae122a9805636fd3be3071249631db',
    externalId:
      '9fd04ee71c44e21cddbd6c9eab81e2d21324f0ace8ec10cbb929b3390625fc9e',
    a: '08168cd80dfd534ab0f10af10f1303fe00af2d43ab5c1432360d137f8197e17a',
    b: 'e8f39b3e1382367d6d41ab34dc270d4e7533f978c9e9a775dfe2185b2f96b96c',
    // sha256 of the alice digest itself
    aliceHashed:
      '36672e023663a96e41f7a3c88163eaee4c0d29e787f6bb3329bd49a8249ef440',
  };

  it.each<[string, WalkerOS.Properties, HashKey[], Record<string, unknown>]>([
    [
      'email trimmed and lowercased',
      { email: ' ALICE_abc@gmail.com ' },
      [],
      { email: digest.alice },
    ],
    [
      'phone reduced to digits and + (TikTok example)',
      { phone: '(+1)2133734253' },
      [],
      { phone: digest.tiktokPhone },
    ],
    [
      'phone reduced to digits and +',
      { phone: '+1 (413) 555-2671' },
      [],
      { phone: digest.phone },
    ],
    [
      'phone_number sent as phone',
      { phone_number: '+14135552671' },
      [],
      { phone: digest.phone },
    ],
    [
      'phone wins over phone_number',
      { phone_number: '+14135552671', phone: '(+1)2133734253' },
      [],
      { phone: digest.tiktokPhone },
    ],
    [
      'external_id hashed as TikTok shows',
      { external_id: 'user_123' },
      [],
      { external_id: digest.user123 },
    ],
    [
      'external_id trimmed, case kept',
      { external_id: ' User-123 ' },
      [],
      { external_id: digest.externalId },
    ],
    [
      'a list hashed item by item',
      { email: ['a@example.com', ' B@example.com '] },
      [],
      { email: [digest.a, digest.b] },
    ],
    [
      'a value that normalizes to nothing left out',
      { email: '  ', phone: 'n/a', external_id: '', ttp: 'abc123def456' },
      [],
      { ttp: 'abc123def456' },
    ],
    [
      'a SHA-256 digest outside doNotHash hashed like any value',
      { email: digest.alice },
      [],
      { email: digest.aliceHashed },
    ],
    [
      'a doNotHash key sent as mapped',
      { phone: digest.phone },
      ['phone'],
      { phone: digest.phone },
    ],
    [
      'phone_number in doNotHash applies to phone',
      { phone_number: digest.phone },
      ['phone_number'],
      { phone: digest.phone },
    ],
    [
      'ttp, ttclid and locale sent as mapped',
      { ttp: 'abc123def456', ttclid: 'E.C.P.abc123', locale: 'en-US' },
      [],
      { ttp: 'abc123def456', ttclid: 'E.C.P.abc123', locale: 'en-US' },
    ],
  ])('%s', async (_, data, doNotHash, expected) => {
    expect(await send(data, doNotHash)).toEqual(expected);
  });
});
