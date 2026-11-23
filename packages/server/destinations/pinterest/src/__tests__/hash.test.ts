import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';
import { destinationPinterest } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * The user_data Pinterest receives when each key of the event data is mapped
 * to the user_data key of the same name.
 */
async function sentUserData(
  data: WalkerOS.Properties,
  doNotHash?: HashKey[],
): Promise<unknown> {
  const bodies: string[] = [];
  const env: Env = {
    sendServer: async (_url, body) => {
      bodies.push(String(body));
      return {
        data: {
          num_events_received: 1,
          num_events_processed: 1,
          events: [{ status: 'processed' }],
        },
      };
    },
  };
  const settings: Settings = {
    accessToken: 's3cr3t',
    adAccountId: '123456789',
    ip: false,
    userAgent: false,
    doNotHash,
    user_data: Object.fromEntries(
      Object.keys(data).map((key) => [key, `data.${key}`]),
    ),
  };
  const { collector } = await startFlow({
    destinations: {
      pinterest: { code: destinationPinterest, config: { settings }, env },
    },
  });

  const result = await collector.push(createEvent({ name: 'page view', data }));
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  return JSON.parse(bodies[0]).data[0].user_data;
}

describe('Pinterest user_data hashing', () => {
  // Values are hashed as mapped; the expected digests are the SHA-256 of the
  // mapped value
  it.each<[string, WalkerOS.Properties, HashKey[], Record<string, unknown>]>([
    [
      'em is hashed as mapped',
      { em: 'user@example.com' },
      [],
      {
        em: 'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
      },
    ],
    [
      'ph is hashed as mapped',
      { ph: '491701234567' },
      [],
      {
        ph: '8b47a52ed04d068c3a9c5632b98cec18780a9f9f4099d4f8afe233970ce116fe',
      },
    ],
    [
      'fn and ln are hashed as mapped',
      { fn: 'mary', ln: 'obrien' },
      [],
      {
        fn: '6915771be1c5aa0c886870b6951b03d7eafc121fea0e80a5ea83beb7c449f4ec',
        ln: 'b4cb6cb33fe4b865868de825023a1e2790dc12ac01ecc8d7c5afe8254071c8ba',
      },
    ],
    [
      'db and ge are hashed as mapped',
      { db: '19970216', ge: 'f' },
      [],
      {
        db: '01acdbf6ec7b4f478a225f1a246e5d6767eeab1a7ffa17f025265b5b94f40f0c',
        ge: '252f10c83610ebca1a059c0bae8255eba2f95be4d1d7bcfa89d7248a82d9f111',
      },
    ],
    [
      'ct, st, zp and country are hashed as mapped',
      { ct: 'newyork', st: 'ny', zp: '94035', country: 'us' },
      [],
      {
        ct: '350c754ba4d38897693aa077ef43072a859d23f613443133fecbbd90a3512ca5',
        st: '1b06e2003f8420d6fa42badd8f77ec0f706b976b7a48b13c567dc5a559681683',
        zp: '1794327a4d443904421f5ca1f3d72d0a62ba2f0770d80755ec2220fc0efb052e',
        country:
          '79adb2a2fce5c6ba215fe5f27f532d4e7edbac4b6a5e09e1ef3a08084a904621',
      },
    ],
    [
      'external_id and hashed_maids are hashed as mapped',
      { external_id: 'Cust-42', hashed_maids: 'test-maid' },
      [],
      {
        external_id:
          '772b91cabe669ed0525030074170426af10a5688a186c35b19bf5e84305ffdd1',
        hashed_maids:
          'ffb3c3747c73f96b542908130a49dad94b4724a5fb5da4b329120abfa6d22867',
      },
    ],
    [
      'a list is hashed item by item',
      { em: ['user@example.com', 'jane@example.com'] },
      [],
      {
        em: [
          'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
          '8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d',
        ],
      },
    ],
    [
      'empty values under hashed keys are left out, others are sent as mapped',
      { em: '', ph: ['', 'user@example.com'], client_user_agent: '' },
      [],
      {
        ph: [
          'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
        ],
        client_user_agent: '',
      },
    ],
    [
      'doNotHash values and keys it does not hash are sent as mapped',
      {
        external_id:
          '772B91CABE669ED0525030074170426AF10A5688A186C35B19BF5E84305FFDD1',
        client_user_agent: 'Mozilla/5.0',
      },
      ['external_id'],
      {
        external_id:
          '772B91CABE669ED0525030074170426AF10A5688A186C35B19BF5E84305FFDD1',
        client_user_agent: 'Mozilla/5.0',
      },
    ],
  ])('%s', async (_, data, doNotHash, expected) => {
    expect(await sentUserData(data, doNotHash)).toEqual(expected);
  });
});
