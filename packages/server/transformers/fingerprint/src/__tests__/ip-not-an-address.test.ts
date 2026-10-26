import { startFlow } from '@walkeros/collector';
import type { Destination, Logger, Mapping, WalkerOS } from '@walkeros/core';
import { Level } from '@walkeros/core';
import { transformerFingerprint } from '../transformer';

const chrome124 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.60 Safari/537.36';

interface Line {
  level: Logger.Level;
  message: string;
  context: Logger.LogContext;
}

/**
 * The fingerprint transformer in a destination's before chain of a real
 * collector: two events pushed, every log line from WARN up recorded, and
 * what the destination receives.
 */
async function deliver(
  ip: Mapping.Value,
  userAgent = chrome124,
  data: WalkerOS.Properties = {},
) {
  const lines: Line[] = [];
  const received: WalkerOS.Event[] = [];
  const recorder: Destination.Instance = {
    type: 'recorder',
    config: {},
    push: (event) => {
      received.push(event);
    },
  };
  const { elb } = await startFlow({
    logger: {
      level: 'WARN',
      handler: (level, message, context) => {
        lines.push({ level, message, context });
      },
    },
    transformers: {
      fingerprint: {
        code: transformerFingerprint,
        config: {
          settings: {
            salt: 'test-salt',
            ip,
            userAgent: { value: userAgent },
          },
        },
      },
    },
    destinations: { recorder: { code: recorder, before: 'fingerprint' } },
  });
  await elb({ name: 'page view', data });
  await elb({ name: 'page view', data });

  const errors = lines.filter((line) => line.level === Level.ERROR);
  const ipEmptyWarnings = lines.filter(
    (line) =>
      line.level === Level.WARN &&
      line.message.includes('Fingerprint input "ip" resolved empty'),
  );
  const hashes = received.map((event) => typeof event.user.hash);
  return { errors, ipEmptyWarnings, hashes };
}

describe('an ip input that is not one address, through a real collector', () => {
  it.each([
    ['a forwarded chain', '203.0.113.7, 172.70.1.2', ['203.0.113', '172.70']],
    ['a word', 'unknown', ['unknown']],
  ])(
    'reports %s once and still delivers both events with a hash',
    async (_, ip, fragments) => {
      const { errors, ipEmptyWarnings, hashes } = await deliver({ value: ip });

      expect(hashes).toEqual(['string', 'string']);
      expect(errors).toHaveLength(1);
      const [error] = errors;
      expect(error.message).toContain('"ip"');
      for (const fragment of fragments) {
        expect(error.message).not.toContain(fragment);
        expect(JSON.stringify(error.context)).not.toContain(fragment);
      }
      expect(error.context).toEqual({
        step: 'transformer.fingerprint',
        code: 'invalid',
      });
      expect(ipEmptyWarnings).toHaveLength(0);
    },
  );

  it.each([
    ['IPv4', '203.0.113.7'],
    ['IPv6', '2001:db8:abcd:12::1'],
    ['IPv4-mapped IPv6', '::ffff:203.0.113.7'],
  ])('reports nothing for an %s address', async (_, ip) => {
    const { errors, ipEmptyWarnings, hashes } = await deliver({ value: ip });

    expect(hashes).toEqual(['string', 'string']);
    expect(errors).toHaveLength(0);
    expect(ipEmptyWarnings).toHaveLength(0);
  });

  it('keeps the one warning for an empty ip and reports no error', async () => {
    const { errors, ipEmptyWarnings, hashes } = await deliver({ value: '' });

    expect(hashes).toEqual(['string', 'string']);
    expect(errors).toHaveLength(0);
    expect(ipEmptyWarnings).toHaveLength(1);
  });

  it('reports nothing for an unknown user agent', async () => {
    const { errors, hashes } = await deliver(
      { value: '203.0.113.7' },
      'curl/8.5.0',
    );

    expect(hashes).toEqual(['string', 'string']);
    expect(errors).toHaveLength(0);
  });

  it('names the configured path of the ip input, never its value', async () => {
    const { errors } = await deliver('event.data.ip', chrome124, {
      ip: '203.0.113.7, 172.70.1.2',
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/ \(event\.data\.ip\)$/);
    expect(errors[0].message).not.toContain('203.0.113');
  });
});
