import type { Transformer, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { runCollectorSimulation } from '../index.js';
import { buildOverrides } from '../overrides.js';
import { applyOverrides } from '../apply-overrides.js';

/**
 * The simulated `collector` step runs the runtime's enrichment plus
 * `collector.next` through `runCollectorNext`, the function the runtime's
 * `pushToDestinations` calls. Each case compares the simulated copies with
 * what a runtime destination receives for the same flow.
 */

const SEP = '>';

function pathOf(event: WalkerOS.DeepPartialEvent): string {
  const path = event.data?.path;
  return typeof path === 'string' ? path : '';
}

/** A code transformer that appends its id to `data.path`. */
function tracer(id: string): Transformer.InitTransformer {
  return {
    code: async (context): Promise<Transformer.Instance> => ({
      type: id,
      config: context.config,
      push: (event) => {
        const path = pathOf(event);
        return {
          event: {
            ...event,
            data: { ...event.data, path: path ? path + SEP + id : id },
          },
        };
      },
    }),
  };
}

const transformers = (): Transformer.InitTransformers => ({
  bot: tracer('bot'),
  a: tracer('a'),
  b: tracer('b'),
});

const input = (): WalkerOS.DeepPartialEvent => ({
  name: 'page view',
  data: {},
});

async function simulated(next?: Transformer.Route): Promise<WalkerOS.Event[]> {
  const { collector } = await startFlow({
    transformers: transformers(),
    ...(next !== undefined ? { next } : {}),
  });
  return runCollectorSimulation(collector, input());
}

async function atRuntime(next?: Transformer.Route): Promise<WalkerOS.Event[]> {
  const delivered: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    transformers: transformers(),
    ...(next !== undefined ? { next } : {}),
    destinations: {
      capture: {
        code: {
          type: 'capture',
          config: {},
          push: async (event: WalkerOS.Event) => {
            delivered.push(event);
          },
        },
      },
    },
  });
  await collector.push(input());
  return delivered;
}

const paths = (events: WalkerOS.Event[]) => events.map(pathOf).sort();

describe('runCollectorSimulation', () => {
  it('returns the enriched event when there is no collector.next', async () => {
    const events = await simulated();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'page view',
      entity: 'page',
      action: 'view',
      source: { type: 'collector' },
    });
    expect(typeof events[0].id).toBe('string');
  });

  it.each<[string, Transformer.Route, string[]]>([
    ['a chain', ['bot', 'a'], ['bot>a']],
    ['a many fork', ['bot', { many: ['a', 'b'] }], ['bot>a', 'bot>b']],
    ['a stop', ['bot', { stop: true }], []],
  ])('matches the runtime for %s', async (_, next, expected) => {
    const events = await simulated(next);
    expect(paths(events)).toEqual(expected);
    expect(paths(await atRuntime(next))).toEqual(expected);
  });

  it('gives each many child its own id', async () => {
    const events = await simulated({ many: ['a', 'b'] });
    expect(events).toHaveLength(2);
    expect(events[0].id).not.toBe(events[1].id);
  });

  it('applies --mock collector.next.bot to that step only', async () => {
    const config = {
      transformers: transformers(),
      next: ['bot', 'a'],
    };
    applyOverrides(
      config,
      buildOverrides(
        {
          mock: [
            'collector.next.bot={"name":"page view","data":{"path":"mock"}}',
          ],
        },
        { config: { platform: 'web' } },
      ),
    );
    const { collector } = await startFlow(config);
    const events = await runCollectorSimulation(collector, input());
    expect(paths(events)).toEqual(['mock>a']);
  });
});
