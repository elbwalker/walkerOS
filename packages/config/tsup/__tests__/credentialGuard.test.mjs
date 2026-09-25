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
