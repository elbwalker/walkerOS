import type { Elb } from '@walkeros/core';
import type { Settings } from '../types';
import {
  initScopeTrigger,
  isRegistered,
  getScopeState,
  destroyTriggers,
} from '../trigger';

// Open-shadow-root coverage for the [data-elbobserve] discovery pass. A container
// inside an open shadow root is a SEPARATE tree: queryAllComposed discovers it and
// it gets its own MutationObserver (a MutationObserver cannot cross the shadow
// boundary, and Node.contains does not either, so the nesting-skip never folds a
// shadow-hosted container into a light-DOM ancestor). These tests prove the shadow
// container registers + fires injected content, that a light-DOM container and a
// shadow-hosted container observe strictly separate trees (no cross double-report),
// and that teardown disconnects the shadow observer. jsdom delivers MutationObserver
// records on a microtask, so every assertion after an append/remove drains first.

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

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const tagged = (action: string, entity = 'p'): HTMLDivElement => {
  const el = document.createElement('div');
  el.setAttribute('data-elb', entity);
  el.setAttribute('data-elbaction', action);
  return el;
};

describe('observe discovery across open shadow roots', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockElb = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    destroyTriggers();
    document.body.innerHTML = '';
  });

  test('an observe container inside an open shadow root gets its own observer and auto-registers injected content, reaping on removal', async () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const host = document.getElementById('host')!;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<div id="box" data-elbobserve></div>`;
    const box = root.getElementById('box')!;

    const context = { elb: mockElb, settings: createTestSettings() };
    initScopeTrigger(context);

    // The shadow-hosted container is discovered from the document scope
    // (queryAllComposed recurses open roots) and its observer lands in the
    // document scope's bucket — the host is a plain div, so there is no
    // light-DOM observe container competing here.
    expect(getScopeState(document)?.mutationObservers).toHaveLength(1);

    const injected = tagged('load:view');
    box.appendChild(injected);
    await flush();

    expect(isRegistered(injected)).toBe(true);
    expect(mockElb).toHaveBeenCalledTimes(1);

    box.removeChild(injected);
    await flush();

    expect(isRegistered(injected)).toBe(false);
  });

  test('a shadow-hosted container and a light-DOM container each keep their own observer and observe strictly separate trees', async () => {
    // The light-DOM container wraps the shadow host. Node.contains does not cross
    // the shadow boundary, so `outer.contains(shadowBox)` is false and the
    // nesting-skip keeps BOTH containers — two observers, one per tree.
    document.body.innerHTML = `<div id="outer" data-elbobserve><div id="host"></div></div>`;
    const outer = document.getElementById('outer')!;
    const host = document.getElementById('host')!;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<div id="shadowBox" data-elbobserve></div>`;
    const shadowBox = root.getElementById('shadowBox')!;

    const context = { elb: mockElb, settings: createTestSettings() };
    initScopeTrigger(context);

    expect(getScopeState(document)?.mutationObservers).toHaveLength(2);

    // Injecting into the shadow tree fires exactly once: only the shadow
    // observer sees it. If the light observer also reported it (it cannot cross
    // the boundary), the count would be 2 — this is the no-double-report proof.
    const inShadow = tagged('load:view');
    shadowBox.appendChild(inShadow);
    await flush();

    expect(isRegistered(inShadow)).toBe(true);
    expect(mockElb).toHaveBeenCalledTimes(1);

    // Injecting into the light tree fires exactly once more: only the light
    // observer sees it, never the shadow observer.
    const inLight = tagged('load:view');
    outer.appendChild(inLight);
    await flush();

    expect(isRegistered(inLight)).toBe(true);
    expect(mockElb).toHaveBeenCalledTimes(2);
  });

  test('destroyTriggers disconnects the shadow container observer, so later shadow injections register nothing', async () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const host = document.getElementById('host')!;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<div id="box" data-elbobserve></div>`;
    const box = root.getElementById('box')!;

    const context = { elb: mockElb, settings: createTestSettings() };
    initScopeTrigger(context);

    const observers = getScopeState(document)?.mutationObservers ?? [];
    expect(observers).toHaveLength(1);
    const disconnectSpy = jest.spyOn(observers[0]!, 'disconnect');

    destroyTriggers();
    expect(disconnectSpy).toHaveBeenCalled();

    const injected = tagged('load:view');
    box.appendChild(injected);
    await flush();

    expect(isRegistered(injected)).toBe(false);
    expect(mockElb).not.toHaveBeenCalled();
  });
});
