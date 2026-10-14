import type { Collector, Destination, Logger, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../index';
import type { BrowserPush, InitSettings } from '../types';
import { flushChain } from './test-utils';

// What `elb` takes, end to end: a real collector, the browser source and a spy
// destination. What arrives is what the destination gets; what the page sees
// of an argument the source ignores is the ERROR the logger reports.

let current: Collector.Instance | undefined;
let events: WalkerOS.Event[] = [];
let errors: string[] = [];

async function start(settings: InitSettings = {}) {
  const spy: Destination.Instance = {
    type: 'spy',
    config: {},
    push: (event) => {
      events.push(event);
    },
  };
  const handler: Logger.Handler = (level, message) => {
    if (level === 0) errors.push(message);
  };
  const flow = await startFlow<BrowserPush>({
    sources: {
      browser: {
        code: sourceBrowser,
        config: { settings: { pageview: false, ...settings } },
      },
    },
    destinations: { spy: { code: spy } },
    logger: { handler },
  });
  current = flow.collector;
  await flushChain();
  return flow;
}

// Page code calls `window.elb` untyped, with whatever arguments it has.
const pageElb = (...args: unknown[]): Promise<unknown> => {
  const fn: unknown = Reflect.get(window, 'elb');
  if (typeof fn !== 'function') throw new Error('window.elb not installed');
  return Promise.resolve(Reflect.apply(fn, window, args));
};

const named = (name: string) => events.filter((event) => event.name === name);

beforeEach(() => {
  events = [];
  errors = [];
  document.body.innerHTML = '';
  document.body.removeAttribute('data-elb-page');
  Reflect.deleteProperty(window, 'elbLayer');
  Reflect.deleteProperty(window, 'elb');
  window.history.replaceState({}, '', '/docs');
});

afterEach(async () => {
  await current?.command('shutdown');
  current = undefined;
});

describe('the string form', () => {
  it('is exactly name and data, with the browser source and page globals', async () => {
    document.body.innerHTML = '<div data-elbglobals="pagegroup:shop"></div>';
    const { elb } = await start();
    const data = { id: 'P1' };

    await elb('product view', data);

    expect(named('product view')).toEqual([
      expect.objectContaining({
        name: 'product view',
        data: { id: 'P1' },
        context: {},
        globals: { pagegroup: 'shop' },
        nested: [],
        custom: {},
        trigger: '',
        source: expect.objectContaining({
          type: 'browser',
          url: 'https://example.com/docs',
        }),
      }),
    ]);
    expect(data).toEqual({ id: 'P1' });
    expect(errors).toEqual([]);
  });

  it('keeps the data of a page event as written', async () => {
    const { elb } = await start();

    await elb('page view', { title: 'Home' });
    await elb({ name: 'page view', data: { title: 'Home' } });

    expect(named('page view').map((event) => event.data)).toEqual([
      { title: 'Home' },
      { title: 'Home' },
    ]);
  });
});

describe('arguments the source ignores', () => {
  const tagged = () => {
    const el = document.createElement('div');
    el.setAttribute('data-elb', 'product');
    el.setAttribute('data-elb-product', 'id:P1');
    el.setAttribute('data-elbcontext', 'shelf:top');
    return el;
  };

  it.each<[string, () => unknown[], WalkerOS.Properties]>([
    [
      'positional trigger, context, nested and custom',
      () => [
        'product view',
        { id: 'P1' },
        'click',
        { position: ['top', 0] },
        [{ entity: 'size', data: {} }],
        { flag: true },
      ],
      { id: 'P1' },
    ],
    ['an element as data', () => ['product view', tagged()], {}],
    ['a string as data', () => ['product view', 'P1'], {}],
    [
      'a second argument after an event object',
      () => [{ name: 'product view', data: { id: 'P1' } }, { id: 'P2' }],
      { id: 'P1' },
    ],
  ])('ignores %s and reports it', async (_label, args, data) => {
    await start();

    await pageElb(...args());
    await flushChain();

    expect(named('product view')).toEqual([
      expect.objectContaining({
        data,
        context: {},
        nested: [],
        custom: {},
      }),
    ]);
    expect(named('product view')[0].trigger).not.toBe('click');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/trigger, context, nested, custom/);
  });

  it('reports once per event name', async () => {
    await start();

    await pageElb('product view', { id: 'P1' }, 'click');
    await pageElb('product view', { id: 'P2' }, 'click', { cart: ['a', 0] });
    await flushChain();
    expect(errors).toHaveLength(1);

    await pageElb('order complete', { id: 'O1' }, 'click');
    await flushChain();

    expect(events.map((event) => event.name)).toEqual([
      'product view',
      'product view',
      'order complete',
    ]);
    expect(errors).toHaveLength(2);
  });

  it('takes a trailing undefined as no argument', async () => {
    await start();

    await pageElb('product view', { id: 'P1' }, undefined);
    await pageElb({ name: 'product add' }, undefined, undefined);
    await flushChain();

    expect(events.map((event) => event.name)).toEqual([
      'product view',
      'product add',
    ]);
    expect(errors).toEqual([]);
  });

  it('runs a walker command with an extra argument and reports it', async () => {
    const { collector } = await start();

    await pageElb('walker user', { id: 'u1' }, 'extra');
    await flushChain();

    expect(collector.user).toEqual({ id: 'u1' });
    expect(errors).toHaveLength(1);
  });

  it('reports nothing for walker init with elements', async () => {
    await start();
    const el = document.createElement('div');
    el.setAttribute('data-elb', 'promo');
    el.setAttribute('data-elbaction', 'load:view');
    document.body.appendChild(el);

    await pageElb('walker init', [el]);
    await flushChain();

    expect(named('promo view')).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it('reports extras on elbLayer entries, stub arguments included', async () => {
    // The page snippet queues its `arguments` object itself.
    const stub = function (..._args: unknown[]) {
      return arguments;
    };
    window.elbLayer = [
      ['product view', { id: 'P1' }, 'click', { position: ['top', 0] }],
      stub('product add', { id: 'P2' }, 'click'),
    ];

    await start();
    await flushChain();

    expect(
      events.map((event) => [event.name, event.data, event.trigger]),
    ).toEqual([
      ['product view', { id: 'P1' }, ''],
      ['product add', { id: 'P2' }, ''],
    ]);
    // One report per event name.
    expect(errors).toHaveLength(2);
  });
});

describe('the automatic page view', () => {
  it('carries the path as data.id', async () => {
    await start({ pageview: true });

    expect(named('page view')).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ id: '/docs' }),
        trigger: 'load',
      }),
    ]);
  });

  it('keeps a tagged page id', async () => {
    document.body.setAttribute('data-elb-page', 'id:home');

    await start({ pageview: true });

    expect(named('page view')[0].data.id).toBe('home');
  });
});
