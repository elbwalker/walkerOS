import {
  assertNoPublishedCredentials,
  findPublishedCredential,
} from '../credentialGuard.mjs';

const keyMaterial =
  'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7kJ8sL2mNqRtVxYz'.repeat(
    3,
  );
const wrapped = keyMaterial.match(/.{1,64}/g).join('\n');
const realPem = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;

describe('assertNoPublishedCredentials', () => {
  it.each([
    ['a PEM with real key material', realPem, 'PEM private key'],
    [
      'a PEM with escaped newlines',
      realPem.replace(/\n/g, '\\n'),
      'PEM private key',
    ],
    ['a live Stripe key', 'sk_live_51Habcdefghijkl', 'live key token sk_live_'],
    ['a GitHub token', 'token ghp_abcdefghijklmnop', 'live key token ghp_'],
    ['a Slack bot token', 'xoxb-1234-5678-abcd', 'live key token xoxb-'],
    ['an AWS access key id', 'AKIAABCDEFGHIJKLMNOP', 'live key token AKIA'],
  ])(
    'throws on %s with the path and fix, never the value',
    (_l, value, rule) => {
      const examples = { step: { in: { settings: { credentials: value } } } };
      let message = '';
      try {
        assertNoPublishedCredentials('@walkeros/x', { examples });
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe(
        `@walkeros/x: examples.step.in.settings.credentials looks like a real credential (${rule}). Replace it with a placeholder, e.g. sk_test_..., or a PEM with fewer than 64 characters of key material.`,
      );
      expect(message).not.toContain(value);
    },
  );

  it.each(['github_pat_', 'ghu_', 'ghs_', 'ghr_'])(
    'throws on a GitHub %s token',
    (prefix) => {
      const value = `${prefix}${'a1B2c3D4e5'.repeat(3)}f6G7h8`;
      expect(() =>
        assertNoPublishedCredentials('@walkeros/x', {
          examples: { step: { in: value } },
        }),
      ).toThrow(`(live key token ${prefix})`);
    },
  );

  it.each([
    [
      'a credential as an object key',
      { step: { in: { sk_live_51Habcdefghijkl: 'placeholder' } } },
      'examples.step.in.<key>',
      'live key token sk_live_',
      ['sk_live_51Habcdefghijkl'],
    ],
    [
      'a credential key above a credential value',
      {
        step: {
          in: {
            ghs_abcdefghijklmnopqrstuvwxyz0123456789: {
              token: 'github_pat_abcdefghijklmnopqrstuvwxyz0123456789',
            },
          },
        },
      },
      'examples.step.in.<key>',
      'live key token ghs_',
      [
        'ghs_abcdefghijklmnopqrstuvwxyz0123456789',
        'github_pat_abcdefghijklmnopqrstuvwxyz0123456789',
      ],
    ],
  ])(
    'throws on %s without the key or value text',
    (_l, examples, path, rule, secrets) => {
      let message = '';
      try {
        assertNoPublishedCredentials('@walkeros/x', { examples });
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe(
        `@walkeros/x: ${path} looks like a real credential (${rule}). Replace it with a placeholder, e.g. sk_test_..., or a PEM with fewer than 64 characters of key material.`,
      );
      for (const secret of secrets) expect(message).not.toContain(secret);
    },
  );

  it('passes a plain header key with a placeholder value', () => {
    expect(() =>
      assertNoPublishedCredentials('@walkeros/x', {
        examples: {
          step: { in: { headers: { Authorization: 'Bearer ***' } } },
        },
      }),
    ).not.toThrow();
  });

  it('names the section and array index of the hit', () => {
    expect(
      findPublishedCredential({
        examples: {},
        hints: { auth: { examples: ['ok', 'sk_live_abc'] } },
      }),
    ).toEqual({
      path: 'hints.auth.examples.1',
      rule: 'live key token sk_live_',
    });
  });

  it.each([
    ['a short PEM placeholder', '-----BEGIN PRIVATE KEY-----\ntest'],
    [
      'an escaped short PEM placeholder',
      '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n',
    ],
    ['a test Stripe key', 'sk_test_x'],
    ['the AWS documentation key id', 'AKIDEXAMPLE'],
    ['a prefix inside a word', 'mask_live_ and task_ghp_x'],
  ])('passes %s', (_l, value) => {
    expect(() =>
      assertNoPublishedCredentials('@walkeros/x', {
        examples: { step: { in: value } },
        exportExamples: { other: { step: { out: [value] } } },
        hints: undefined,
      }),
    ).not.toThrow();
  });
});
