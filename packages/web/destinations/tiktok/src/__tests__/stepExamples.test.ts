import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { Logger } from '@walkeros/core';
import { clone, createEvent, Level } from '@walkeros/core';
import { destinationTikTok } from '..';
import { examples } from '../dev';
import type { TikTokStepExample } from '../examples/step';
import type { Env, Settings, TTQ } from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * Wrap every method on the mock ttq with a spy that records
 * ['ttq.<method>', ...args] into a shared collector array.
 */
function spyTtq(env: Env): {
  env: Env;
  collected: () => CallRecord[];
  reset: () => void;
} {
  const calls: CallRecord[] = [];
  const ttq = env.window.ttq;
  const record =
    (method: keyof TTQ) =>
    (...args: unknown[]): void => {
      calls.push([`ttq.${String(method)}`, ...args]);
    };
  ttq.load = record('load');
  ttq.page = record('page');
  ttq.track = record('track');
  ttq.identify = record('identify');
  ttq.enableCookie = record('enableCookie');
  ttq.disableCookie = record('disableCookie');
  return { env, collected: () => calls, reset: () => (calls.length = 0) };
}

describe('tiktok destination — step examples', () => {
  it.each<[string, TikTokStepExample]>(Object.entries(examples.step))(
    '%s',
    async (name, example) => {
      // Fresh clone per test so mutations don't bleed across cases.
      const env = clone(examples.env.push);
      const { env: spiedEnv, collected, reset } = spyTtq(env);

      const dest = jest.requireActual('../').default;
      const { elb } = await startFlow();

      const baseSettings: Partial<Settings> & { apiKey: string } = {
        apiKey: 'test-pixel-id',
        ...(example.settings || {}),
      };

      if (example.command === 'consent') {
        await elb('walker destination', {
          code: { ...dest, env: spiedEnv },
          config: {
            consent: { marketing: true },
            include: example.configInclude,
            settings: baseSettings,
          },
        });
        // Load the gated destination under a prior grant first when the example
        // declares one, so a revoke acts on an already-granted destination.
        if (example.before) {
          await elb('walker consent', example.before);
          // The example's out is what the revoke itself calls
          reset();
        }
        await elb('walker consent', example.in as WalkerOS.Consent);
      } else {
        const event = example.in as WalkerOS.Event;
        const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
        const mappingConfig = mapping
          ? { [event.entity]: { [event.action]: mapping } }
          : undefined;

        await elb('walker destination', {
          code: { ...dest, env: spiedEnv },
          config: {
            include: example.configInclude,
            settings: baseSettings,
            mapping: mappingConfig,
          },
        });
        await elb(event);
      }

      // Drop ttq.load — it's an init-time call, not part of per-push `out`.
      // Consent examples name the vendor call by its env path (window.ttq.*).
      const expected = ((example.out ?? []) as ReadonlyArray<CallRecord>).map(
        ([path, ...args]): CallRecord => [
          path.replace(/^window\./, ''),
          ...args,
        ],
      );
      const actual = collected().filter(([path]) => path !== 'ttq.load');

      expect(actual).toEqual(expected);
    },
  );

  it('writes one DEBUG line naming the event and the mapping key for a declared skip', async () => {
    const lines: Array<[Level, string, unknown]> = [];
    const handler: Logger.Handler = (level, message, context) => {
      lines.push([level, message, context]);
    };
    const { elb } = await startFlow({
      logger: { level: 'DEBUG', handler },
      destinations: {
        tiktok: {
          code: {
            ...destinationTikTok,
            env: spyTtq(clone(examples.env.push)).env,
          },
          config: {
            settings: { apiKey: 'test-pixel-id' },
            mapping: {
              company: {
                update: {
                  silent: true,
                  settings: { identify: { map: { email: 'data.none' } } },
                },
              },
            },
          },
        },
      },
    });

    expect((await elb(createEvent({ name: 'company update' }))).ok).toBe(true);
    expect(lines.filter(([, message]) => message.includes('skipped'))).toEqual([
      [
        Level.DEBUG,
        'TikTok skipped identify: identify resolved to nothing',
        expect.objectContaining({ event: 'company update' }),
      ],
    ]);
  });
});
