import type { Elb } from '@walkeros/core';
import type { Settings } from '../types';
import {
  initScopeTrigger,
  isRegistered,
  getScopeState,
  destroyTriggers,
} from '../trigger';

// Integration-ish tests for the [data-elbobserve] discovery pass and its
// MutationObserver wiring, using jsdom's real (async) MutationObserver. Every
// assertion after an append/remove drains the microtask queue first, since jsdom
// delivers MutationObserver records on a microtask.

const createTestSettings = (
  prefix = 'data-elb',
  scope: Settings['scope'] = document,
): Settings => ({
  prefix,
  scope,
  pageview: false,
  capture: true,
  elb: '',
  elbLayer: false,
});

// jsdom notifies MutationObservers on a microtask; drain a few turns to be safe.
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('observe discovery + MutationObserver wiring', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockElb = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    destroyTriggers();
    document.body.innerHTML = '';
  });

  test('auto-registers a tagged element injected into an observed container, and reaps it on removal', async () => {
    document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
    const box = document.getElementById('box')!;
    const context = { elb: mockElb, settings: createTestSettings() };

    initScopeTrigger(context);
    expect(getScopeState(document)?.mutationObservers).toHaveLength(1);

    const injected = document.createElement('div');
    injected.setAttribute('data-elb', 'p');
    injected.setAttribute('data-elbaction', 'load:view');
    box.appendChild(injected);
    await flush();

    expect(isRegistered(injected)).toBe(true);
    expect(mockElb).toHaveBeenCalledTimes(1); // the load trigger fired once

    box.removeChild(injected);
    await flush();

    expect(isRegistered(injected)).toBe(false);
  });

  test('registers a deep descendant when a subtree is injected (addedNodes holds only the top node)', async () => {
    document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
    const box = document.getElementById('box')!;
    const context = { elb: mockElb, settings: createTestSettings() };

    initScopeTrigger(context);

    const wrapper = document.createElement('section');
    wrapper.innerHTML = `<span><b id="deep" data-elb="p" data-elbaction="load:view"></b></span>`;
    box.appendChild(wrapper);
    await flush();

    const deep = document.getElementById('deep')!;
    expect(isRegistered(deep)).toBe(true);
    expect(mockElb).toHaveBeenCalledTimes(1);
  });

  test('nesting: a nested observe container gets no own observer (one registration per deep insert)', async () => {
    document.body.innerHTML = `
      <div id="outer" data-elbobserve>
        <div id="inner" data-elbobserve></div>
      </div>
    `;
    const inner = document.getElementById('inner')!;
    const context = { elb: mockElb, settings: createTestSettings() };

    initScopeTrigger(context);

    // Observer COUNT is the load-bearing assertion here: the isRegistered/mockElb
    // fire-once checks below are dedup-blind — the source-wide registry masks a
    // stray second observer (its re-registration is a no-op) — so only the
    // observer count actually proves the nested container was skipped.
    expect(getScopeState(document)?.mutationObservers).toHaveLength(1);

    const injected = document.createElement('div');
    injected.setAttribute('data-elb', 'p');
    injected.setAttribute('data-elbaction', 'load:view');
    inner.appendChild(injected);
    await flush();

    // A single deep insertion registers once and fires load once (no double).
    expect(isRegistered(injected)).toBe(true);
    expect(mockElb).toHaveBeenCalledTimes(1);
  });

  test('two sibling observe containers each get their own observer', async () => {
    document.body.innerHTML = `
      <div id="a" data-elbobserve></div>
      <div id="b" data-elbobserve></div>
    `;
    const a = document.getElementById('a')!;
    const b = document.getElementById('b')!;
    const context = { elb: mockElb, settings: createTestSettings() };

    initScopeTrigger(context);
    expect(getScopeState(document)?.mutationObservers).toHaveLength(2);

    const first = document.createElement('div');
    first.setAttribute('data-elb', 'p');
    first.setAttribute('data-elbaction', 'load:view');
    a.appendChild(first);

    const second = document.createElement('div');
    second.setAttribute('data-elb', 'p');
    second.setAttribute('data-elbaction', 'load:view');
    b.appendChild(second);
    await flush();

    expect(isRegistered(first)).toBe(true);
    expect(isRegistered(second)).toBe(true);
    expect(mockElb).toHaveBeenCalledTimes(2);
  });

  test('injecting a text node into an observed container does not throw and registers nothing', async () => {
    document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
    const box = document.getElementById('box')!;
    const context = { elb: mockElb, settings: createTestSettings() };

    initScopeTrigger(context);

    box.appendChild(document.createTextNode('word-by-word chat stream'));
    await flush();

    expect(mockElb).not.toHaveBeenCalled();
  });

  test('a walker init <el> sub-scope whose element itself carries data-elbobserve is observed', async () => {
    document.body.innerHTML = `<section id="sub" data-elbobserve></section>`;
    const sub = document.getElementById('sub')!;
    const context = {
      elb: mockElb,
      settings: createTestSettings('data-elb', sub),
    };

    initScopeTrigger(context);
    expect(getScopeState(sub)?.mutationObservers).toHaveLength(1);

    const injected = document.createElement('div');
    injected.setAttribute('data-elb', 'p');
    injected.setAttribute('data-elbaction', 'load:view');
    sub.appendChild(injected);
    await flush();

    expect(isRegistered(injected)).toBe(true);
    expect(mockElb).toHaveBeenCalledTimes(1);
  });

  test('destroyTriggers disconnects every observe container observer, so later injections register nothing', async () => {
    document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
    const box = document.getElementById('box')!;
    const context = { elb: mockElb, settings: createTestSettings() };

    initScopeTrigger(context);
    const observers = getScopeState(document)?.mutationObservers ?? [];
    expect(observers).toHaveLength(1);
    const disconnectSpy = jest.spyOn(observers[0]!, 'disconnect');

    destroyTriggers();
    expect(disconnectSpy).toHaveBeenCalled();

    const injected = document.createElement('div');
    injected.setAttribute('data-elb', 'p');
    injected.setAttribute('data-elbaction', 'load:view');
    box.appendChild(injected);
    await flush();

    expect(isRegistered(injected)).toBe(false);
    expect(mockElb).not.toHaveBeenCalled();
  });

  test('a second walker init on the same scope disconnects the old observers before attaching fresh ones', () => {
    document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
    const context = { elb: mockElb, settings: createTestSettings() };

    initScopeTrigger(context);
    const firstObservers = [
      ...(getScopeState(document)?.mutationObservers ?? []),
    ];
    expect(firstObservers).toHaveLength(1);
    const disconnectSpy = jest.spyOn(firstObservers[0]!, 'disconnect');

    initScopeTrigger(context);

    expect(disconnectSpy).toHaveBeenCalled();
    const secondObservers = getScopeState(document)?.mutationObservers ?? [];
    expect(secondObservers).toHaveLength(1);
    expect(secondObservers[0]).not.toBe(firstObservers[0]);
  });

  test('destroyTriggers aborts each registered element hover listener (Amendment 1)', () => {
    document.body.innerHTML = `<div id="h" data-elb="c" data-elbaction="hover:a">x</div>`;
    const h = document.getElementById('h')!;
    const context = { elb: mockElb, settings: createTestSettings() };

    initScopeTrigger(context);
    expect(isRegistered(h)).toBe(true);

    destroyTriggers();

    h.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(mockElb).not.toHaveBeenCalled();
  });
});
