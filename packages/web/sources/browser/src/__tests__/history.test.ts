import type { Collector, Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../index';
import { watchHistory } from '../history';
import type { InitSettings } from '../types';
import { flushChain } from './test-utils';

// The `history` setting end to end: a real collector, the browser source and a
// spy destination. A history change starts a collector run within microtasks,
// so flushChain settles it; the document observer flushes one task later,
// which the suite's fake timers advance explicitly.

const nativePush = History.prototype.pushState;
const nativeReplace = History.prototype.replaceState;

let current: Collector.Instance | undefined;
let events: WalkerOS.Event[] = [];

async function start(
  settings: InitSettings = { history: true },
  require?: string[],
): Promise<Collector.Instance> {
  const spy: Destination.Instance = {
    type: 'spy',
    config: {},
    push: (event) => {
      events.push(event);
    },
  };
  const { collector } = await startFlow({
    sources: {
      browser: {
        code: sourceBrowser,
        config: { settings, ...(require ? { require } : {}) },
      },
    },
    destinations: { spy: { code: spy } },
  });
  current = collector;
  await flushChain();
  return collector;
}

const nextTask = async () => {
  jest.advanceTimersByTime(0);
  await flushChain();
};

const pageViews = () => events.filter((event) => event.name === 'page view');
const productViews = () =>
  events.filter((event) => event.name === 'product view');

const tagged = (id: string): HTMLDivElement => {
  const el = document.createElement('div');
  el.setAttribute('data-elb', 'product');
  el.setAttribute('data-elb-product', `id:${id}`);
  el.setAttribute('data-elbaction', 'load:view');
  return el;
};

beforeEach(() => {
  events = [];
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'elbLayer');
  Reflect.deleteProperty(window, 'elb');
  nativeReplace.call(window.history, {}, '', '/');
  Object.defineProperty(document, 'referrer', {
    value: '',
    configurable: true,
  });
});

afterEach(async () => {
  await current?.command('shutdown');
  current = undefined;
  // Fall back to the prototype methods whatever a test left behind.
  Reflect.deleteProperty(window.history, 'pushState');
  Reflect.deleteProperty(window.history, 'replaceState');
});

describe('route changes', () => {
  it.each<[string, () => void, string[]]>([
    [
      'pushState to a new path',
      () => window.history.pushState({}, '', '/a'),
      ['https://example.com/a'],
    ],
    [
      'pushState to a new query',
      () => window.history.pushState({}, '', '?page=2'),
      ['https://example.com/?page=2'],
    ],
    [
      'replaceState with the same URL',
      () => window.history.replaceState({}, '', '/'),
      [],
    ],
    [
      'replaceState to a new query',
      () => window.history.replaceState({}, '', '?f=red'),
      [],
    ],
    [
      'replaceState to a new path',
      () => window.history.replaceState({}, '', '/b'),
      ['https://example.com/b'],
    ],
    ['pushState to a hash', () => window.history.pushState({}, '', '#x'), []],
    [
      'pushState to the same new path twice',
      () => {
        window.history.pushState({}, '', '/c');
        window.history.pushState({}, '', '/c');
      },
      ['https://example.com/c'],
    ],
  ])('%s', async (_name, navigate, urls) => {
    await start();
    events = [];
    navigate();
    await flushChain();
    expect(pageViews().map((event) => event.source.url)).toEqual(urls);
  });

  it('counts a push back to the path after a query-only replace', async () => {
    nativeReplace.call(window.history, {}, '', '/list');
    await start();
    events = [];
    window.history.replaceState({}, '', '/list?f=red');
    window.history.pushState({}, '', '/list');
    await flushChain();
    expect(pageViews().map((event) => event.source.url)).toEqual([
      'https://example.com/list',
    ]);
  });

  it('counts back and forward', async () => {
    await start();
    events = [];
    nativeReplace.call(window.history, {}, '', '/back');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await flushChain();
    expect(pageViews().map((event) => event.data.id)).toEqual(['/back']);
  });

  it('sees popstate before a router listener added earlier', () => {
    const order: string[] = [];
    const router = () => order.push('router');
    window.addEventListener('popstate', router);
    const stop = watchHistory(window, () => order.push('walker'));
    nativeReplace.call(window.history, {}, '', '/back');
    window.dispatchEvent(new PopStateEvent('popstate'));
    stop();
    window.removeEventListener('popstate', router);
    expect(order).toEqual(['walker', 'router']);
  });

  it('keeps each URL for two changes in one task', async () => {
    await start();
    events = [];
    window.history.pushState({}, '', '/one');
    window.history.pushState({}, '', '/two');
    await flushChain();
    expect(
      pageViews().map((event) => [event.data.id, event.source.url]),
    ).toEqual([
      ['/one', 'https://example.com/one'],
      ['/two', 'https://example.com/two'],
    ]);
  });

  it('refers each later page view to the previous one', async () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://other.example/landing',
      configurable: true,
    });
    nativeReplace.call(window.history, {}, '', '/docs#top');
    const collector = await start();
    window.history.pushState({}, '', '/pricing');
    await flushChain();
    await collector.elb('walker run');
    await flushChain();
    expect(
      pageViews().map((event) => [event.data.referrer, event.source.referrer]),
    ).toEqual([
      ['https://other.example/landing', 'https://other.example/landing'],
      ['https://example.com/docs', 'https://other.example/landing'],
      ['https://example.com/pricing', 'https://other.example/landing'],
    ]);
  });

  it('starts watching on the first run, not before the source starts', async () => {
    const collector = await start({ history: true }, ['consent']);
    window.history.pushState({}, '', '/early');
    await flushChain();
    await collector.elb('walker consent', { functional: true });
    await flushChain();
    window.history.pushState({}, '', '/later');
    await flushChain();
    expect(pageViews().map((event) => event.data.id)).toEqual([
      '/early',
      '/later',
    ]);
  });

  it('leaves history alone by default', async () => {
    const original = window.history.pushState;
    await start({});
    expect(window.history.pushState).toBe(original);
    events = [];
    window.history.pushState({}, '', '/a');
    await flushChain();
    expect(pageViews()).toEqual([]);
  });

  it('restores the methods on destroy', async () => {
    const original = window.history.pushState;
    const originalReplace = window.history.replaceState;
    const collector = await start();
    expect(window.history.pushState).not.toBe(original);
    await collector.command('shutdown');
    expect(window.history.pushState).toBe(original);
    expect(window.history.replaceState).toBe(originalReplace);
    events = [];
    window.history.pushState({}, '', '/after');
    await flushChain();
    expect(pageViews()).toEqual([]);
  });

  it('keeps a wrapper installed after ours on destroy', async () => {
    const collector = await start();
    const ours = window.history.pushState;
    const foreign: History['pushState'] = function (...args) {
      ours.apply(window.history, args);
    };
    window.history.pushState = foreign;
    await collector.command('shutdown');
    expect(window.history.pushState).toBe(foreign);
    expect(window.history.replaceState).toBe(nativeReplace);
    events = [];
    window.history.pushState({}, '', '/after');
    await flushChain();
    expect(pageViews()).toEqual([]);
  });
});

describe('tagged elements across route changes', () => {
  it('fires a route element once, after the page view, in the new run', async () => {
    await start();
    const startTrace = pageViews()[0].source.trace;
    events = [];
    window.history.pushState({}, '', '/a');
    await flushChain();
    await nextTask();
    document.body.appendChild(tagged('a'));
    await flushChain();
    await nextTask();
    await nextTask();
    expect(events.map((event) => event.name)).toEqual([
      'page view',
      'product view',
    ]);
    expect(events[1].source.trace).toBe(events[0].source.trace);
    expect(events[1].source.trace).not.toBe(startTrace);
  });

  it('fires an element rendered before the URL change in the new run', async () => {
    await start();
    events = [];
    document.body.appendChild(tagged('b'));
    await Promise.resolve();
    window.history.pushState({}, '', '/b');
    await flushChain();
    await nextTask();
    expect(events.map((event) => event.name)).toEqual([
      'page view',
      'product view',
    ]);
    expect(events[1].source.trace).toBe(events[0].source.trace);
    expect(events[1].source.url).toBe('https://example.com/b');
  });

  it('does not re-fire an element that stays', async () => {
    document.body.appendChild(tagged('stays'));
    await start();
    expect(productViews()).toHaveLength(1);
    events = [];
    window.history.pushState({}, '', '/c');
    await flushChain();
    await nextTask();
    expect(events.map((event) => event.name)).toEqual(['page view']);
  });

  it('does not fire an old-route element the render removes', async () => {
    const old = tagged('old');
    document.body.appendChild(old);
    await start();
    events = [];
    window.history.pushState({}, '', '/d');
    await flushChain();
    old.remove();
    document.body.appendChild(tagged('new'));
    await flushChain();
    await nextTask();
    expect(productViews().map((event) => event.data.id)).toEqual(['new']);
  });

  it('does not re-fire a moved element', async () => {
    const first = tagged('first');
    const moved = tagged('moved');
    document.body.append(first, moved);
    await start();
    document.body.insertBefore(moved, first);
    await flushChain();
    await nextTask();
    expect(
      productViews().filter((event) => event.data.id === 'moved'),
    ).toHaveLength(1);
  });

  it('never fires an element added and removed in one task', async () => {
    await start();
    events = [];
    const flash = tagged('flash');
    document.body.appendChild(flash);
    flash.remove();
    await flushChain();
    await nextTask();
    expect(productViews()).toEqual([]);
  });

  it('fires content rendered after the startup scan once', async () => {
    await start();
    document.body.appendChild(tagged('late'));
    await flushChain();
    await nextTask();
    await nextTask();
    expect(productViews().map((event) => event.data.id)).toEqual(['late']);
  });

  it('re-scans on a manual walker run beside the history run', async () => {
    document.body.appendChild(tagged('x'));
    const collector = await start();
    events = [];
    window.history.pushState({}, '', '/h');
    await collector.elb('walker run');
    await flushChain();
    await nextTask();
    expect(pageViews()).toHaveLength(2);
    expect(productViews().map((event) => event.data.id)).toEqual(['x']);
  });
});
