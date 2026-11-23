import type { WalkerOS } from '@walkeros/core';
import type { HashKey } from '../hash';
import type { Env, RequestBody, Settings } from '../types';
import { startFlow } from '@walkeros/collector';
import { createEvent, Logger } from '@walkeros/core';
import { destinationOpenAIAds } from '..';
import { normalizers } from '../hash';

/**
 * The user object OpenAI receives when each key of the event data is mapped
 * under the same name, and the ERROR lines written.
 */
async function send(data: WalkerOS.Properties, doNotHash?: HashKey[]) {
  const bodies: RequestBody[] = [];
  const errors: unknown[] = [];
  const env: Env = {
    sendServer: async (_url, body) => {
      bodies.push(JSON.parse(String(body)));
      return { data: {} };
    },
  };
  const settings: Settings = {
    apiKey: 's3cr3t',
    pixelId: 'px_abc123',
    ip: false,
    userAgent: false,
    doNotHash,
  };
  const map = Object.fromEntries(
    Object.keys(data).map((key) => [key, `data.${key}`]),
  );
  const { collector } = await startFlow({
    logger: {
      handler: (level, message, context) => {
        if (level === Logger.Level.ERROR) errors.push([message, context]);
      },
    },
    destinations: {
      openai: {
        code: destinationOpenAIAds,
        config: {
          settings,
          mapping: {
            form: { submit: { name: 'lead_created', data: { map } } },
          },
        },
        env,
      },
    },
  });

  const result = await collector.push(
    createEvent({
      name: 'form submit',
      data,
      source: { type: 'express', platform: 'server', url: 'https://x.io/' },
    }),
  );
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  return { user: bodies[0].events[0].user, errors };
}

describe('OpenAI Ads user hashing', () => {
  // OpenAI's published digests of user@example.com, customer_123 and
  // +1 (415) 555-2671:
  // https://developers.openai.com/ads/conversions-api#send-user-data
  const email =
    'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514';
  const externalId =
    '18f69bcd2f9cc9c38195e722b2a5590429840ea5090971d2256e026926e55fa1';
  const phone =
    '758fbf68945f21c416814c539ab578876c8d98fb69e6da692def92cd52417fe0';
  // sha256 of the email digest itself: a digest is hashed again.
  const emailDigestHashed =
    '043e3ef5e76e423c9d3d3a5605bcb8904496c654fcd16180386298150d8e1b8f';

  it.each<[string, WalkerOS.Properties, HashKey[], unknown]>([
    [
      'email, phone and external id match the OpenAI examples',
      {
        email: 'user@example.com',
        phone: '+1 (415) 555-2671',
        external_id: 'customer_123',
      },
      [],
      {
        emails_sha256: [email],
        phone_numbers_sha256: [phone],
        external_ids_sha256: [externalId],
      },
    ],
    [
      'email is trimmed and lowercased, a phone loses leading zeroes, an external id is trimmed',
      {
        email: ' User@Example.com ',
        phone: '001 415 555 2671',
        external_id: ' customer_123 ',
      },
      [],
      {
        emails_sha256: [email],
        phone_numbers_sha256: [phone],
        external_ids_sha256: [externalId],
      },
    ],
    [
      'a list is hashed item by item and sent once per digest',
      { email: ['user@example.com', ' USER@example.com'] },
      [],
      { emails_sha256: [email] },
    ],
    [
      'empty values are left out',
      { email: '', phone: '  ', external_id: [''] },
      [],
      undefined,
    ],
    [
      'a value shaped like a digest is hashed like any other',
      { email },
      [],
      { emails_sha256: [emailDigestHashed] },
    ],
    [
      'doNotHash values are sent as mapped',
      { email: email.toUpperCase(), phone: [phone] },
      ['email', 'phone'],
      { emails_sha256: [email.toUpperCase()], phone_numbers_sha256: [phone] },
    ],
  ])('%s', async (_, data, doNotHash, expected) => {
    expect((await send(data, doNotHash)).user).toEqual(expected);
  });

  // OpenAI's normalization examples for names, and its phone example.
  it.each<[HashKey, string, string]>([
    ['first_name', 'Mary Jane', 'maryjane'],
    ['last_name', "O'Connor", 'oconnor'],
    ['first_name', 'José', 'josé'],
    ['phone', '+1 (415) 555-2671', '14155552671'],
  ])('%s %p is normalized to %p', (key, value, normalized) => {
    expect(normalizers[key](value)).toBe(normalized);
  });

  it('cuts a list to three values and reports it in one ERROR line', async () => {
    const { user, errors } = await send({ email: ['a', 'b', 'c', 'd'] }, [
      'email',
    ]);
    expect(user).toEqual({ emails_sha256: ['a', 'b', 'c'] });
    expect(errors).toEqual([
      [
        expect.stringContaining(
          'OpenAI Ads left out email (more than 3 values)',
        ),
        { step: 'destination.openai', code: 'mapping', event: 'lead_created' },
      ],
    ]);
  });
});
