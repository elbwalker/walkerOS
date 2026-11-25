import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent, Logger } from '@walkeros/core';
import { destinationMeta } from '..';
import type { HashKey } from '../hash';
import type { Env, Settings } from '../types';

/**
 * The user_data Meta receives when each key of the event data is mapped to
 * the user_data key of the same name, and the WARN lines written.
 */
async function send(data: WalkerOS.Properties, doNotHash?: HashKey[]) {
  const bodies: string[] = [];
  const warnings: unknown[] = [];
  const env: Env = {
    sendServer: async (_url, body) => {
      bodies.push(String(body));
      return { data: {} };
    },
  };
  const settings: Settings = {
    accessToken: 's3cr3t',
    pixelId: '1234567890',
    ip: false,
    userAgent: false,
    doNotHash,
    user_data: Object.fromEntries(
      Object.keys(data).map((key) => [key, `data.${key}`]),
    ),
  };
  const { collector } = await startFlow({
    logger: {
      level: 'WARN',
      handler: (level, message, context) => {
        if (level === Logger.Level.WARN) warnings.push([message, context]);
      },
    },
    destinations: {
      meta: { code: destinationMeta, config: { settings }, env },
    },
  });

  const result = await collector.push(createEvent({ name: 'page view', data }));
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  return { userData: JSON.parse(bodies[0]).data[0].user_data, warnings };
}

describe('Meta user_data hashing', () => {
  // The em and fn rows are Meta's published examples:
  // https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
  it.each<[string, WalkerOS.Properties, HashKey[], Record<string, unknown>]>([
    [
      'em is trimmed and lowercased',
      { em: 'John_Smith@gmail.com' },
      [],
      {
        em: '62a14e44f765419d10fea99367361a727c12365e2520f32218d505ed9aa0f62f',
      },
    ],
    [
      'fn is lowercased',
      { fn: 'Mary' },
      [],
      {
        fn: '6915771be1c5aa0c886870b6951b03d7eafc121fea0e80a5ea83beb7c449f4ec',
      },
    ],
    [
      'fn keeps UTF-8 letters',
      { fn: 'Valéry' },
      [],
      {
        fn: '08e1996b5dd49e62a4b4c010d44e4345592a863bb9f8e3976219bac29417149c',
      },
    ],
    [
      'ph keeps only digits',
      { ph: '+1 (650) 555-1212' },
      [],
      {
        ph: 'e323ec626319ca94ee8bff2e4c87cf613be6ea19919ed1364124e16807ab3176',
      },
    ],
    [
      'ph drops leading zeros',
      { ph: '0049 170 1234567' },
      [],
      {
        ph: '8b47a52ed04d068c3a9c5632b98cec18780a9f9f4099d4f8afe233970ce116fe',
      },
    ],
    [
      'ph accepts a number',
      { ph: 491701234567 },
      [],
      {
        ph: '8b47a52ed04d068c3a9c5632b98cec18780a9f9f4099d4f8afe233970ce116fe',
      },
    ],
    [
      'fn and ln remove punctuation',
      { fn: 'Mary-Ann.', ln: " O'Brien " },
      [],
      {
        fn: '16b3f07f0ec2f9dd127b71dc2e6c791b7d93116a1c3bc99d057eaa7a8a077e73',
        ln: 'b4cb6cb33fe4b865868de825023a1e2790dc12ac01ecc8d7c5afe8254071c8ba',
      },
    ],
    [
      'db removes punctuation from year-first dates',
      { db: '1997-02-16' },
      [],
      {
        db: '01acdbf6ec7b4f478a225f1a246e5d6767eeab1a7ffa17f025265b5b94f40f0c',
      },
    ],
    [
      'ge is the lowercase initial',
      { ge: 'Female' },
      [],
      {
        ge: '252f10c83610ebca1a059c0bae8255eba2f95be4d1d7bcfa89d7248a82d9f111',
      },
    ],
    [
      'ct and st keep only letters and digits',
      { ct: 'München!', st: ' N.Y. ' },
      [],
      {
        ct: 'f75c175f552c8b2bf46ef4b282ee782c81cf8687f66a8fe8278cc56fa727503e',
        st: '1b06e2003f8420d6fa42badd8f77ec0f706b976b7a48b13c567dc5a559681683',
      },
    ],
    [
      'zp removes spaces and keeps 5 digits of a ZIP+4',
      { zp: 'M1 1AE', country: ' US ' },
      [],
      {
        zp: '1dc694c2070e697769fb959b50671d76cafd430d8ca191fbdd0affcaea344ac5',
        country:
          '79adb2a2fce5c6ba215fe5f27f532d4e7edbac4b6a5e09e1ef3a08084a904621',
      },
    ],
    [
      'zp keeps the first 5 digits of a ZIP+4',
      { zp: '94035-1234' },
      [],
      {
        zp: '1794327a4d443904421f5ca1f3d72d0a62ba2f0770d80755ec2220fc0efb052e',
      },
    ],
    [
      'external_id is hashed as is',
      { external_id: 'Cust-42' },
      [],
      {
        external_id:
          '772b91cabe669ed0525030074170426af10a5688a186c35b19bf5e84305ffdd1',
      },
    ],
    [
      'a list is hashed item by item',
      { em: [' A@Example.com', 'b@example.com '] },
      [],
      {
        em: [
          '08168cd80dfd534ab0f10af10f1303fe00af2d43ab5c1432360d137f8197e17a',
          'e8f39b3e1382367d6d41ab34dc270d4e7533f978c9e9a775dfe2185b2f96b96c',
        ],
      },
    ],
    [
      'empty values under hashed keys are left out, others are sent as mapped',
      { em: '', ph: '  ', ge: ['', ' '], fbp: '' },
      [],
      { fbp: '' },
    ],
    [
      'a doNotHash value is sent as mapped',
      {
        ph: '62A14E44F765419D10FEA99367361A727C12365E2520F32218D505ED9AA0F62F',
      },
      ['ph'],
      {
        ph: '62A14E44F765419D10FEA99367361A727C12365E2520F32218D505ED9AA0F62F',
      },
    ],
  ])('%s', async (_, data, doNotHash, expected) => {
    expect((await send(data, doNotHash)).userData).toEqual(expected);
  });

  it('warns when db is not YYYYMMDD after normalization without logging it', async () => {
    const { warnings } = await send({ db: ['1997-02-16', ' 02/16/1997 '] });

    expect(warnings).toEqual([
      [
        'Meta user_data db is not YYYYMMDD after normalization and cannot match',
        expect.anything(),
      ],
    ]);
    expect(JSON.stringify(warnings)).not.toContain('1997');
  });
});
