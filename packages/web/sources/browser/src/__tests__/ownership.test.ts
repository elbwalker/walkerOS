import type {
  Collector,
  Ingest,
  MockLogger,
  Source,
  WalkerOS,
} from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../index';
import { destroyBrowserSource, flushChain } from './test-utils';
import type { Types } from '../types';

/**
 * Two resources are single-slot and cannot live on a source instance: the
 * named `elbLayer` array and the `window.elb` writer. Each carries a mark
 * naming its owning source, so a second source is refused exactly those
 * pieces, loudly, keeps everything else working, and destroy hands both back.
 *
 * The scope node is not one of them. DOM listeners and observers compose, and
 * each source owns its own trigger state, so any number of sources scan the
 * same node and each emits into its own collector.
 *
 * Everything here drives the real factory: no internal imports, no reset
 * hooks. The error log is the whole diagnostic surface, so it is asserted
 * exactly.
 */

interface Built {
  source: Source.Instance<Types>;
  logger: MockLogger;
  collector: Collector.Instance;
}

interface Flow {
  collector: Collector.Instance;
  events: WalkerOS.Event[];
}

const built: Built[] = [];

// One collector per source, each with a recording destination, so "which
// pipeline did this event reach" is answerable.
const startRecordingFlow = async (): Promise<Flow> => {
  const events: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    run: true,
    destinations: {
      record: {
        code: {
          type: 'record',
          config: {},
          push: (event) => {
            events.push(event);
          },
        },
      },
    },
  });
  return { collector, events };
};

const buildSource = async (
  flow: Flow,
  settings: Partial<Source.Settings<Types>> = {},
): Promise<Built> => {
  const logger = createMockLogger();
  const { collector } = flow;
  const env: Source.Env<Types> = {
    push: collector.push,
    command: collector.command,
    elb: collector.elb,
    window,
    document,
    logger,
  };

  const source = await sourceBrowser({
    collector,
    config: {
      settings: {
        prefix: 'data-elb',
        scope: document,
        pageview: false,
        elb: 'elb',
        elbLayer: 'elbLayer',
        ...settings,
      },
    },
    env,
    id: 'test-browser',
    logger,
    withScope: async (_raw, respond, body) => {
      const ingest: Ingest = createIngest('test-browser');
      return body({ ...env, push: env.push, ingest, respond });
    },
  });

  const instance: Built = { source, logger, collector };
  built.push(instance);
  return instance;
};

// Build, then drive the two lifecycle steps the collector drives: init
// (adoption, listeners, window.elb) and, optionally, run (scan + pageview).
const bootSource = async (
  flow: Flow,
  settings: Partial<Source.Settings<Types>> = {},
  options: { run?: boolean } = {},
): Promise<Built> => {
  const instance = await buildSource(flow, settings);
  await instance.source.init?.();
  if (options.run) {
    await instance.source.on?.('run', flow.collector);
    await flushChain();
  }
  return instance;
};

const readWindow = (key: string): unknown => Reflect.get(window, key);

const readLayerPush = (): unknown => {
  const layer: unknown = readWindow('elbLayer');
  return Array.isArray(layer) ? Reflect.get(layer, 'push') : undefined;
};

const errorMessages = (logger: MockLogger): string[] =>
  logger.error.mock.calls.map((call) => String(call[0]));

const errorsAbout = (logger: MockLogger, resource: string): string[] =>
  errorMessages(logger).filter((message) => message.startsWith(`${resource} `));

const named = (events: WalkerOS.Event[], name: string): WalkerOS.Event[] =>
  events.filter((event) => event.name === name);

const tagged = (entity: string, action: string): HTMLDivElement => {
  const element = document.createElement('div');
  element.setAttribute('data-elb', entity);
  element.setAttribute('data-elbaction', action);
  return element;
};

const click = (element: Element): void => {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

// A few microtask turns, enough that work scheduled behind it cannot resolve
// within the turn that scheduled it.
const deferTurns = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const clearWindowState = (): void => {
  Reflect.deleteProperty(window, 'elbLayer');
  Reflect.deleteProperty(window, 'elb');
  Reflect.deleteProperty(window, 'elbTagMode');
  Reflect.deleteProperty(window, 'elbVendor');
  Reflect.deleteProperty(window, 'elbLayerVendor');
};

describe('resource ownership across sources', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearWindowState();
  });

  afterEach(async () => {
    // Every source is torn down through the production destroy path, so its
    // listeners, timers and observers do not reach into the next test.
    const sources = built.splice(0, built.length);
    for (const instance of sources)
      await destroyBrowserSource(instance.source, instance.collector);
    document.body.innerHTML = '';
    clearWindowState();
  });

  test('a second identical source keeps both single-slot resources with their owner and still captures', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const first = await bootSource(flowA);
    const adoptedPush = readLayerPush();
    const adoptedElb = readWindow('elb');
    expect(typeof adoptedPush).toBe('function');
    expect(typeof adoptedElb).toBe('function');

    const second = await buildSource(flowB);
    await second.source.init?.();

    // Nothing the first source installed was replaced.
    expect(readLayerPush()).toBe(adoptedPush);
    expect(readWindow('elb')).toBe(adoptedElb);
    expect(errorMessages(first.logger)).toHaveLength(0);

    // One error per refused resource, naming the resource and its resolved
    // name. The scope is not a resource: nothing is refused there.
    expect(errorsAbout(second.logger, 'elbLayer')).toEqual([
      'elbLayer "elbLayer" is already adopted by another source',
    ]);
    expect(errorsAbout(second.logger, 'elb')).toEqual([
      'elb "elb" is already installed by another source',
    ]);
    expect(errorMessages(second.logger)).toHaveLength(2);

    // The instance reports the settings it was given, never package defaults
    // it does not run with.
    expect(second.source.config.settings?.scope).toBe(document);
    expect(second.source.config.settings?.pageview).toBe(false);

    // Losing the two globals costs it nothing else: it scans the same DOM and
    // captures into its own collector.
    await second.source.on?.('run', flowB.collector);
    await flushChain();
    const button = tagged('p', 'click:view');
    document.body.appendChild(button);
    click(button);
    await flushChain();
    expect(named(flowB.events, 'p view')).toHaveLength(1);

    // An explicit push through it still reaches its collector too.
    const result = await second.source.push('page view');
    expect(result.ok).toBe(true);
    expect(named(flowB.events, 'page view')).toHaveLength(1);
  });

  test('a double load sends one pageview into each collector', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    await bootSource(flowA, { pageview: true }, { run: true });
    await bootSource(flowB, { pageview: true }, { run: true });

    // The accepted consequence of not policing the scope: a page that includes
    // the same bundle twice collects twice, once per pipeline, and says so
    // through the two refusals at init.
    expect(named(flowA.events, 'page view')).toHaveLength(1);
    expect(named(flowB.events, 'page view')).toHaveLength(1);
  });

  test('a run after destroy emits nothing and wires nothing', async () => {
    const flow = await startRecordingFlow();

    document.body.appendChild(tagged('p', 'click:view'));
    const first = await bootSource(flow, { pageview: true }, { run: true });
    expect(named(flow.events, 'page view')).toHaveLength(1);

    await destroyBrowserSource(first.source, flow.collector);
    flow.events.length = 0;

    // A destroyed source stays in the collector's registry, so `run` still
    // reaches it, and a page firing `walker run` per route change keeps
    // calling it. It must send nothing into a collector that has shut down.
    await first.source.on?.('run', flow.collector);
    await flushChain();
    expect(flow.events).toHaveLength(0);

    // And nothing it left behind fires either.
    const button = document.querySelector('[data-elbaction]');
    if (!button) throw new Error('tagged element missing');
    click(button);
    await flushChain();
    expect(flow.events).toHaveLength(0);

    // The other post-destroy entry point: `walker init <el>` reaches
    // initScopeTrigger directly through the translation layer, not through the
    // run handler, so it needs its own guard. Without one it runs a full scan,
    // installing observers, intervals and timeouts that no teardown will ever
    // release. `load` fires during the scan itself, so a missing guard shows up
    // as an event rather than as a timer nobody advances.
    const late = tagged('q', 'load:view');
    document.body.appendChild(late);
    await first.source.push('walker init', late);
    await flushChain();

    expect(flow.events).toHaveLength(0);
  });

  test('a source refused only the layer keeps its own writer and its user ordering', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const scope = document.createElement('div');
    const user = document.createElement('div');
    user.setAttribute('data-elbuser', 'id:u-b');
    scope.appendChild(user);
    document.body.appendChild(scope);

    // Slow this collector's command path so "the pageview waits for the user"
    // is observable rather than accidental: two independently scheduled
    // dispatches happen to land in order while the command resolves inside the
    // same microtask window.
    flowB.collector.hooks.preCommand = (
      params: { fn: (...args: unknown[]) => unknown },
      ...args: unknown[]
    ) => deferTurns().then(() => params.fn(...args));

    await bootSource(flowA, {}, { run: true });
    const second = await bootSource(
      flowB,
      { elbLayer: 'elbLayer', elb: 'elbB', scope, pageview: true },
      { run: true },
    );

    // Only the layer is refused: the scope and the elb name are its own.
    expect(errorsAbout(second.logger, 'elbLayer')).toHaveLength(1);
    expect(errorMessages(second.logger)).toHaveLength(1);

    // No layer means no shared FIFO tail, so the run awaits `walker user`
    // before the pageview instead of trusting an order it does not have.
    const pageview = named(flowB.events, 'page view')[0];
    expect(pageview?.user.id).toBe('u-b');

    // And its window writer routes into its own collector rather than
    // resolving into a controller that swallows every call.
    const writer: unknown = readWindow('elbB');
    if (typeof writer !== 'function') throw new Error('window.elbB missing');
    await writer('product view', { id: 'p9' });
    await flushChain();

    expect(named(flowB.events, 'product view')).toHaveLength(1);
  });

  test('a scoped source beside a default one takes its own resources and logs nothing', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const shadowButton = tagged('shadow', 'click:go');
    shadow.appendChild(shadowButton);

    const lightButton = tagged('light', 'click:go');
    document.body.appendChild(lightButton);

    const first = await bootSource(flowA, {}, { run: true });
    const second = await bootSource(
      flowB,
      { elbLayer: false, elb: 'elbTagMode', scope: shadow },
      { run: true },
    );

    expect(errorMessages(first.logger)).toHaveLength(0);
    expect(errorMessages(second.logger)).toHaveLength(0);
    expect(typeof readWindow('elbTagMode')).toBe('function');

    click(lightButton);
    click(shadowButton);
    await flushChain();

    // Each source captures in its own scope: the document source sees the
    // light-DOM click, the shadow-scoped source sees the shadow click.
    expect(named(flowA.events, 'light go')).toHaveLength(1);
    expect(named(flowB.events, 'shadow go')).toHaveLength(1);
    // The shadow scope never receives the light-DOM click.
    expect(named(flowB.events, 'light go')).toHaveLength(0);
  });

  test('two sources on the same scope each capture their own tags', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    document.body.innerHTML =
      '<div id="a" data-elb="alpha" data-elbaction="click:one"></div>' +
      '<div id="b" data-alst="beta" data-alstaction="click:two"></div>';
    const elementA = document.getElementById('a');
    const elementB = document.getElementById('b');
    if (!elementA || !elementB) throw new Error('tagged elements missing');

    // The vendor case: an injected flow lands on a page that already runs one.
    // Both scan `document`, each with its own prefix, elb name and layer name.
    const first = await bootSource(flowA, {}, { run: true });
    const second = await bootSource(
      flowB,
      { prefix: 'data-alst', elb: 'elbVendor', elbLayer: 'elbLayerVendor' },
      { run: true },
    );

    expect(errorMessages(first.logger)).toHaveLength(0);
    expect(errorMessages(second.logger)).toHaveLength(0);

    click(elementA);
    click(elementB);
    await flushChain();

    expect(named(flowA.events, 'alpha one')).toHaveLength(1);
    expect(named(flowB.events, 'beta two')).toHaveLength(1);
    // Each pipeline sees only what its own prefix tags.
    expect(named(flowA.events, 'beta two')).toHaveLength(0);
    expect(named(flowB.events, 'alpha one')).toHaveLength(0);
  });

  test('a frozen layer degrades instead of throwing into init', async () => {
    const flow = await startRecordingFlow();
    const frozen: unknown[] = [];
    Reflect.set(window, 'elbLayer', frozen);
    Object.freeze(frozen);

    // Every write this source makes to the layer is refused by the realm. None
    // of them may escape into the collector's init.
    const instance = await buildSource(flow);
    await expect(instance.source.init?.()).resolves.toBeUndefined();
    await instance.source.on?.('run', flow.collector);
    await flushChain();

    // The DOM path is untouched by the degraded layer.
    const button = tagged('p', 'click:view');
    document.body.appendChild(button);
    click(button);
    await flushChain();

    expect(named(flow.events, 'p view')).toHaveLength(1);
  });

  test('a layer frozen after adoption keeps routing instead of throwing at the page', async () => {
    const flow = await startRecordingFlow();
    await bootSource(flow, {}, { run: true });

    // A page that hardens its globals after load freezes an array this source
    // already adopted, so its own push override and its window writer both run
    // straight into the refusal, inside the page's call stack.
    const layer: unknown = readWindow('elbLayer');
    if (!Array.isArray(layer)) throw new Error('window.elbLayer missing');
    Object.freeze(layer);

    const writer: unknown = readWindow('elb');
    if (typeof writer !== 'function') throw new Error('window.elb missing');
    await expect(writer('product view', { id: 'p1' })).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await flushChain();

    // The array kept nothing, and the event still reached the collector.
    expect(layer).toHaveLength(0);
    expect(named(flow.events, 'product view')).toHaveLength(1);
  });

  test('a layer frozen before run replays what it could not record', async () => {
    const flow = await startRecordingFlow();
    const instance = await buildSource(flow);
    await instance.source.init?.();

    const layer: unknown = readWindow('elbLayer');
    if (!Array.isArray(layer)) throw new Error('window.elbLayer missing');
    Object.freeze(layer);

    const writer: unknown = readWindow('elb');
    if (typeof writer !== 'function') throw new Error('window.elb missing');
    await writer('product view', { id: 'pre' });
    await flushChain();

    // Pre-start events wait for the run, whether the array recorded them or not.
    expect(named(flow.events, 'product view')).toHaveLength(0);

    await instance.source.on?.('run', flow.collector);
    await flushChain();

    expect(named(flow.events, 'product view')).toHaveLength(1);
  });

  test('a layer frozen mid-flight replays the recorded entries before the refused ones', async () => {
    const flow = await startRecordingFlow();
    const instance = await buildSource(flow);
    await instance.source.init?.();

    const writer: unknown = readWindow('elb');
    if (typeof writer !== 'function') throw new Error('window.elb missing');

    await writer('product view', { id: 'recorded' });

    const layer: unknown = readWindow('elbLayer');
    if (!Array.isArray(layer)) throw new Error('window.elbLayer missing');
    expect(layer).toHaveLength(1);
    Object.freeze(layer);

    // The array refuses this one, so it is held outside the recorded history.
    await writer('product view', { id: 'orphan' });
    await flushChain();

    // Both lanes wait for the run, whether the array recorded them or not.
    expect(named(flow.events, 'product view')).toHaveLength(0);

    await instance.source.on?.('run', flow.collector);
    await flushChain();

    // The array holds everything pushed while it still accepted writes, so the
    // refused entries replay after them and the page's order survives.
    expect(
      named(flow.events, 'product view').map((event) => event.data.id),
    ).toEqual(['recorded', 'orphan']);
  });

  test('destroy hands every resource back to the next source', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();
    const flowC = await startRecordingFlow();

    const first = await bootSource(flowA);
    const elbAfterFirst = readWindow('elb');

    const second = await buildSource(flowB);
    await second.source.init?.();
    expect(errorMessages(second.logger)).toHaveLength(2);

    await destroyBrowserSource(first.source, flowA.collector);
    expect(readWindow('elb')).toBeUndefined();

    const third = await bootSource(flowC, {}, { run: true });
    expect(errorMessages(third.logger)).toHaveLength(0);
    expect(typeof readWindow('elb')).toBe('function');
    expect(readWindow('elb')).not.toBe(elbAfterFirst);
    expect(typeof readLayerPush()).toBe('function');

    // Taking the two globals is not the whole story: it captures too. The
    // load-bearing assertions are the fresh window.elb identity and the
    // adopted layer push above; any source would capture this click.
    const button = tagged('p', 'click:view');
    document.body.appendChild(button);
    click(button);
    await flushChain();
    expect(named(flowC.events, 'p view')).toHaveLength(1);
  });

  test('an unmarked page elb stub and a pre-filled layer are adopted, and the backlog replays once', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const stub = (): void => {};
    Reflect.set(window, 'elb', stub);
    Reflect.set(window, 'elbLayer', [['product view', { id: 'A' }]]);

    const first = await bootSource(flowA, {}, { run: true });
    expect(errorMessages(first.logger)).toHaveLength(0);
    expect(readWindow('elb')).not.toBe(stub);
    expect(named(flowA.events, 'product view')).toHaveLength(1);

    await destroyBrowserSource(first.source, flowA.collector);

    // The drained boundary stays on the array, so the recreated source
    // resumes past the backlog instead of replaying it.
    const second = await bootSource(flowB, {}, { run: true });
    expect(errorMessages(second.logger)).toHaveLength(0);
    expect(named(flowB.events, 'product view')).toHaveLength(0);
  });
});
