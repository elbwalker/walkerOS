import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent, Logger } from '@walkeros/core';
import { destinationSnapchat } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * The user_data Snapchat receives when each key of the event data is mapped
 * to the user_data key of the same name, and the ERROR lines written.
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
    pixelId: 'YOUR_PIXEL_ID',
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
      snapchat: { code: destinationSnapchat, config: { settings }, env },
    },
  });

  const result = await collector.push(createEvent({ name: 'page view', data }));
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  return { user_data: JSON.parse(bodies[0]).data[0].user_data, errors };
}

describe('Snapchat user_data hashing', () => {
  // Values are hashed as mapped. The em, ph, fn, ln, ge, ct, st, zp and
  // country rows are Snapchat's published examples:
  // https://developers.snap.com/api/marketing-api/Conversions-API/Parameters
  it.each<[string, WalkerOS.Properties, HashKey[], Record<string, unknown>]>([
    [
      'em, ph, fn and ln match Snapchat examples',
      {
        em: 'person@example.com',
        ph: '448444124653',
        fn: 'john',
        ln: 'andrews',
      },
      [],
      {
        em: '542d240129883c019e106e3b1b2d3f3cb3537c43c425364de8e951d5a3083345',
        ph: 'dc008fda46e2e64002cf2f82a4906236282d431c4f75e5b60bfe79fc48546383',
        fn: '96d9632f363564cc3032521409cf22a852f2032eec099ed5967c0d000cec607a',
        ln: '90aa2608758d2bc747d65079720aba7eef76ccb1b48166a3605908939aa835cd',
      },
    ],
    [
      'ge, ct, st, zp and country match Snapchat examples',
      { ge: 'f', ct: 'newyork', st: 'ca', zp: '94035', country: 'us' },
      [],
      {
        ge: '252f10c83610ebca1a059c0bae8255eba2f95be4d1d7bcfa89d7248a82d9f111',
        ct: '350c754ba4d38897693aa077ef43072a859d23f613443133fecbbd90a3512ca5',
        st: '6959097001d10501ac7d54c0bdb8db61420f658f2922cc26e46d536119a31126',
        zp: '1794327a4d443904421f5ca1f3d72d0a62ba2f0770d80755ec2220fc0efb052e',
        country:
          '79adb2a2fce5c6ba215fe5f27f532d4e7edbac4b6a5e09e1ef3a08084a904621',
      },
    ],
    [
      'db and external_id are hashed as mapped',
      { db: '19970216', external_id: 'Cust-42' },
      [],
      {
        db: '01acdbf6ec7b4f478a225f1a246e5d6767eeab1a7ffa17f025265b5b94f40f0c',
        external_id:
          '772b91cabe669ed0525030074170426af10a5688a186c35b19bf5e84305ffdd1',
      },
    ],
    [
      'a list is hashed item by item',
      { em: ['person@example.com', 'user@example.com'] },
      [],
      {
        em: [
          '542d240129883c019e106e3b1b2d3f3cb3537c43c425364de8e951d5a3083345',
          'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
        ],
      },
    ],
    [
      'empty values under hashed keys are left out, others are sent as mapped',
      { em: '', ph: ['', 'person@example.com'], sc_click_id: '' },
      [],
      {
        ph: [
          '542d240129883c019e106e3b1b2d3f3cb3537c43c425364de8e951d5a3083345',
        ],
        sc_click_id: '',
      },
    ],
    [
      'doNotHash values and keys it does not hash are sent as mapped',
      {
        em: '542D240129883C019E106E3B1B2D3F3CB3537C43C425364DE8E951D5A3083345',
        sc_click_id: 'click-1',
      },
      ['em'],
      {
        em: '542D240129883C019E106E3B1B2D3F3CB3537C43C425364DE8E951D5A3083345',
        sc_click_id: 'click-1',
      },
    ],
  ])('%s', async (_, data, doNotHash, expected) => {
    expect((await send(data, doNotHash)).user_data).toEqual(expected);
  });

  it('leaves out a list under external_id and reports it in one ERROR line', async () => {
    const { user_data, errors } = await send({
      external_id: ['Cust-42', 'Cust-43'],
      em: 'person@example.com',
    });

    expect(user_data).toEqual({
      em: '542d240129883c019e106e3b1b2d3f3cb3537c43c425364de8e951d5a3083345',
    });
    expect(errors).toEqual([
      [
        expect.stringContaining(
          'Snapchat user_data external_id left out: Snapchat takes one value, not a list',
        ),
        { step: 'destination.snapchat', code: 'mapping', event: 'page view' },
      ],
    ]);
  });
});
