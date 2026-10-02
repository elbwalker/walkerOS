import type {
  FlowState,
  Ingest,
  Store,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { createIngest } from '@walkeros/core';
import { routeCases } from '@walkeros/core/dev';
import { startFlow } from '@walkeros/collector';
import { runTransformerSimulation } from '../index.js';

/**
 * Runtime vs simulate parity. Every case of the shared route fixture is one
 * flow: a `head` transformer whose `next` is the case's route. The runtime
 * pushes through `collector.push` with `head` as the pre-collector chain;
 * simulate runs `runTransformerSimulation` (what `simulateTransformer`
 * calls) from `head`. Both must visit the same steps in the same order per
 * copy and hand back the same events.
 */

const SEP = '>';
const EVENT_ID = 'evt0000000000001';

type Flow = {
  transformers: Transformer.InitTransformers;
  stores?: Store.InitStores;
};

function pathOf(event: WalkerOS.DeepPartialEvent): string {
  const path = event.data?.path;
  return typeof path === 'string' ? path : '';
}

/** A code transformer that appends its id to `data.path`. */
function tracer(
  id: string,
  writes?: Record<string, unknown>,
  received?: Ingest[],
): Transformer.InitTransformer {
  return {
    code: async (context): Promise<Transformer.Instance> => ({
      type: id,
      config: context.config,
      push: (event, ctx) => {
        if (received) received.push(ctx.ingest);
        if (writes) Object.assign(ctx.ingest, writes);
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

function caseFlow(routeCase: routeCases.RouteCase): Flow {
  const ids = new Set<string>(Object.keys(routeCase.nexts || {}));
  for (const perRoot of routeCase.expected)
    for (const copy of perRoot)
      for (const id of copy) if (id !== routeCases.STOP) ids.add(id);
  const transformers: Transformer.InitTransformers = {
    head: { ...tracer('head'), next: routeCase.spec },
  };
  for (const id of ids) {
    const next = routeCase.nexts ? routeCase.nexts[id] : undefined;
    transformers[id] = {
      ...tracer(id, routeCase.sets ? routeCase.sets[id] : undefined),
      ...(next !== undefined ? { next } : {}),
    };
  }
  return { transformers };
}

interface Observed {
  /** Transformer `in` records per event id, in order. */
  steps: string[];
  /** Output events as `id|path`. */
  outputs: string[];
}

function stepsOf(states: FlowState[]): string[] {
  const byEvent = new Map<string, string[]>();
  for (const state of states) {
    if (state.stepType !== 'transformer' || state.phase !== 'in') continue;
    const list = byEvent.get(state.eventId) || [];
    list.push(state.stepId);
    byEvent.set(state.eventId, list);
  }
  return [...byEvent.entries()]
    .map(([eventId, steps]) => `${eventId}:${steps.join(',')}`)
    .sort();
}

function outputsOf(events: WalkerOS.DeepPartialEvent[]): string[] {
  return events.map((event) => `${event.id}|${pathOf(event)}`).sort();
}

function freshIngest(root: Record<string, unknown>): Ingest {
  return { ...createIngest('src'), ...root };
}

const input = (): WalkerOS.DeepPartialEvent => ({
  id: EVENT_ID,
  name: 'page view',
  user: { id: 'user1' },
  data: {},
});

async function runtime(
  flow: Flow,
  root: Record<string, unknown>,
): Promise<Observed> {
  const delivered: WalkerOS.Event[] = [];
  const states: FlowState[] = [];
  const { collector } = await startFlow({
    ...flow,
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
  collector.observers.add((state) => states.push(state));
  await collector.push(input(), {
    id: 'src',
    ingest: freshIngest(root),
    preChain: 'head',
  });
  return { steps: stepsOf(states), outputs: outputsOf(delivered) };
}

async function simulate(
  flow: Flow,
  root: Record<string, unknown>,
): Promise<Observed> {
  const states: FlowState[] = [];
  const { collector } = await startFlow(flow);
  collector.observers.add((state) => states.push(state));
  const outputs = await runTransformerSimulation(
    collector,
    'head',
    input(),
    freshIngest(root),
  );
  return { steps: stepsOf(states), outputs: outputsOf(outputs) };
}

describe('simulate parity with the runtime (route fixture)', () => {
  for (const routeCase of routeCases.routeCases) {
    routeCase.roots.forEach((root, index) => {
      it(`${routeCase.name} (root ${index})`, async () => {
        const flow = caseFlow(routeCase);
        const atRuntime = await runtime(flow, root.ingest);
        const simulated = await simulate(caseFlow(routeCase), root.ingest);

        expect(simulated).toEqual(atRuntime);

        // And both match the fixture: finished copies carry their path.
        expect(simulated.outputs.map((output) => output.split('|')[1])).toEqual(
          routeCase.expected[index]
            .filter((copy) => !copy.includes(routeCases.STOP))
            .map((copy) => ['head', ...copy].join(SEP))
            .sort(),
        );
      });
    });
  }
});

describe('route follows a loaded value (R4)', () => {
  const tiers: Record<string, Store.StoreValue> = {};
  const tierStore: Store.Init = () => ({
    type: 'tiers',
    config: {},
    get: (key: string) => tiers[key],
    set: (key: string, value: Store.StoreValue) => {
      tiers[key] = value;
    },
    delete: (key: string) => {
      delete tiers[key];
    },
  });

  const gold: Transformer.Route = {
    one: [
      {
        match: { key: 'ingest.tier', operator: 'eq', value: 'gold' },
        next: 'gold',
      },
      'standard',
    ],
  };

  function loadedFlow(sequence: boolean, received: Ingest[]): Flow {
    const step1: Transformer.InitTransformer = {
      state: {
        mode: 'get',
        store: 'tiers',
        key: 'event.user.id',
        value: 'ingest.tier',
      },
      ...(sequence ? {} : { next: 'step2' }),
    };
    return {
      stores: { tiers: { code: tierStore } },
      transformers: {
        head: sequence
          ? { ...tracer('head'), next: ['step1', gold] }
          : { ...tracer('head'), next: 'step1' },
        step1,
        step2: { ...tracer('step2', undefined, received), next: gold },
        gold: tracer('gold', undefined, received),
        standard: tracer('standard', undefined, received),
      },
    };
  }

  const cases: Array<[string, boolean, string, string]> = [
    ['member next', false, 'gold', 'head>step2>gold'],
    ['member next', false, 'silver', 'head>step2>standard'],
    ['sequence continuation', true, 'gold', 'head>gold'],
    ['sequence continuation', true, 'silver', 'head>standard'],
  ];

  it.each(cases)(
    '%s, store tier %s',
    async (_, sequence, tier, expectedPath) => {
      tiers.user1 = tier;
      const received: Ingest[] = [];
      const atRuntime = await runtime(loadedFlow(sequence, received), {});
      const simulated = await simulate(loadedFlow(sequence, received), {});

      expect(simulated).toEqual(atRuntime);
      expect(simulated.outputs).toEqual([`${EVENT_ID}|${expectedPath}`]);
      // The steps after the state read got a real ingest object carrying
      // the loaded tier (applyState writes a scratch copy when none exists).
      expect(received.length).toBeGreaterThan(0);
      for (const ingest of received) {
        expect(ingest._meta).toBeDefined();
        expect(ingest.tier).toBe(tier);
      }
    },
  );
});

describe('simulate: a transformer.before that drops', () => {
  it('yields no event', async () => {
    const { collector } = await startFlow({
      transformers: {
        gate: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'gate',
            config: context.config,
            push: () => false,
          }),
        },
        main: { ...tracer('main'), before: 'gate' },
      },
    });
    const outputs = await runTransformerSimulation(
      collector,
      'main',
      input(),
      freshIngest({}),
    );
    expect(outputs).toEqual([]);
  });
});
