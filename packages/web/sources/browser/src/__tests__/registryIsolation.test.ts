import type { Elb } from '@walkeros/core';
import type { Context, InitScope } from '../types';
import {
  createRegistry,
  destroyTriggers,
  getScopeState,
  initGlobalTrigger,
  initScopeTrigger,
} from '../trigger';
import {
  destroyVisibilityTracking,
  initVisibilityTracking,
  triggerVisible,
} from '../triggerVisible';
import { resetSim, setBox, scrollTo } from './ioSimulator';

// Two browser sources on one page must not reach into each other. Every trigger
// resource one source installs (root click/submit delegation, per-scope
// buckets, the element dedup registry, the per-document visibility state)
// belongs to that source alone: one source's teardown, re-init or scan can
// never disarm another's. The one dedup that MUST survive is intra-source: a
// document scope and a `walker init <el>` sub-scope of the SAME source still
// wire an overlapping element exactly once.

// `isVisible` probes real layout via elementFromPoint, which jsdom cannot
// answer. The dwell's occlusion check is not under test here.
jest.mock('@walkeros/web-core', () => ({
  ...jest.requireActual('@walkeros/web-core'),
  isVisible: jest.fn(() => true),
}));

// fire() spans several awaits between the dwell expiring and elb being called.
const drain = async (): Promise<void> => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

// Every context this file builds, so teardown releases each source without a
// blanket module-level reset (there is none to reach for).
const built: Context[] = [];

const makeContext = (scope: InitScope, elb: Elb.Fn): Context => {
  const context: Context = {
    elb,
    push: elb,
    settings: {
      prefix: 'data-elb',
      scope,
      pageview: false,
      capture: true,
      elb: false,
      elbLayer: false,
    },
    registry: createRegistry(),
  };
  built.push(context);
  return context;
};

const teardown = (): void => {
  built.splice(0, built.length).forEach((context) => {
    destroyVisibilityTracking(context.registry, document);
    destroyTriggers(context);
  });
};

const named = (name: string) => expect.objectContaining({ name });

const tagged = (
  doc: Document,
  entity: string,
  action: string,
): HTMLDivElement => {
  const el = doc.createElement('div');
  el.setAttribute('data-elb', entity);
  el.setAttribute('data-elbaction', action);
  return el;
};

describe('registry isolation between parallel sources', () => {
  let elbA: jest.MockedFunction<Elb.Fn>;
  let elbB: jest.MockedFunction<Elb.Fn>;

  beforeEach(() => {
    document.body.innerHTML = '';
    elbA = jest.fn().mockResolvedValue({ ok: true });
    elbB = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    teardown();
    document.body.innerHTML = '';
    jest.useRealTimers();
  });

  test('both sources keep their root click delegation after both init', () => {
    document.body.innerHTML = `
      <button id="btnA" data-elb="alpha" data-elbaction="click:one">A</button>
      <div id="host"></div>
    `;
    const btnA = document.getElementById('btnA')!;
    const host = document.getElementById('host')!;
    const rootB = host.attachShadow({ mode: 'open' });
    rootB.innerHTML = `<button id="btnB" data-elb="beta" data-elbaction="click:two">B</button>`;
    const btnB = rootB.getElementById('btnB')!;

    const contextA = makeContext(document, elbA);
    const contextB = makeContext(rootB, elbB);

    // Positive control: A's delegation is observable before B exists.
    initGlobalTrigger(contextA);
    btnA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elbA).toHaveBeenCalledWith(named('alpha one'));
    elbA.mockClear();

    initGlobalTrigger(contextB);

    btnA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elbA).toHaveBeenCalledWith(named('alpha one'));

    btnB.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elbB).toHaveBeenCalledWith(named('beta two'));
  });

  test('one source destroy leaves the other source delegation, pulse and scope bucket alive', () => {
    jest.useFakeTimers();

    document.body.innerHTML = `
      <button id="btnA" data-elb="alpha" data-elbaction="click:one">A</button>
      <div id="pulseA" data-elb="alpha" data-elbaction="pulse(1000):tick"></div>
      <div id="host"></div>
    `;
    const btnA = document.getElementById('btnA')!;
    const host = document.getElementById('host')!;
    // A closed root is a `walker init` target that A's document scan cannot
    // reach, so each source owns exactly one pulse element.
    const boxB = host.attachShadow({ mode: 'closed' });
    boxB.appendChild(tagged(document, 'beta', 'pulse(1000):tick'));

    const contextA = makeContext(document, elbA);
    const contextB = makeContext(boxB, elbB);

    initGlobalTrigger(contextA);
    initScopeTrigger(contextA);
    initScopeTrigger(contextB);

    // Positive control: both channels are live before either teardown.
    jest.advanceTimersByTime(1000);
    expect(elbA).toHaveBeenCalledWith(named('alpha tick'));
    expect(elbB).toHaveBeenCalledWith(named('beta tick'));
    elbA.mockClear();
    elbB.mockClear();

    destroyTriggers(contextB);

    expect(getScopeState(contextA.registry, document)).toBeDefined();

    btnA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elbA).toHaveBeenCalledWith(named('alpha one'));

    jest.advanceTimersByTime(1000);
    expect(elbA).toHaveBeenCalledWith(named('alpha tick'));
    expect(elbB).not.toHaveBeenCalled();
  });

  test('an element scanned by both sources wires triggers into both pipelines', () => {
    document.body.innerHTML = `
      <div id="shared" data-elb="alpha" data-elbaction="hover:over"></div>
    `;
    const shared = document.getElementById('shared')!;

    const contextA = makeContext(document, elbA);
    const contextB = makeContext(document, elbB);

    // Positive control: A alone wires the element and the hover is observable.
    initScopeTrigger(contextA);
    shared.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(elbA).toHaveBeenCalledTimes(1);
    elbA.mockClear();

    initScopeTrigger(contextB);

    shared.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(elbA).toHaveBeenCalledWith(named('alpha over'));
    expect(elbB).toHaveBeenCalledWith(named('alpha over'));
  });

  describe('visibility state per source', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      resetSim({ width: 1000, height: 450 });
    });

    test('one source visibility teardown leaves the other dwell armed', async () => {
      const elA = tagged(document, 'alpha', 'visible:seen');
      const elB = tagged(document, 'beta', 'visible:seen');
      document.body.append(elA, elB);
      setBox(elA, { top: 0, left: 0, width: 300, height: 200 });
      setBox(elB, { top: 0, left: 0, width: 300, height: 200 });

      const contextA = makeContext(document, elbA);
      const contextB = makeContext(document, elbB);

      initVisibilityTracking(contextA.registry, document, 500);
      initVisibilityTracking(contextB.registry, document, 500);
      triggerVisible(contextA, elA, { multiple: true });
      triggerVisible(contextB, elB, { multiple: true });

      // Positive control: both dwells fire before any teardown.
      jest.advanceTimersByTime(500);
      await drain();
      expect(elbA).toHaveBeenCalledWith(named('alpha seen'));
      expect(elbB).toHaveBeenCalledWith(named('beta seen'));
      elbA.mockClear();
      elbB.mockClear();

      scrollTo(1000); // both leave the band, repeating triggers unblock
      scrollTo(0); // both re-enter, both dwells re-arm

      destroyVisibilityTracking(contextB.registry, document);

      jest.advanceTimersByTime(500);
      await drain();

      expect(elbA).toHaveBeenCalledWith(named('alpha seen'));
      expect(elbB).not.toHaveBeenCalled();
    });

    test('a source joining a document keeps its own dwell duration', async () => {
      const elA = tagged(document, 'alpha', 'visible:seen');
      const elB = tagged(document, 'beta', 'visible:seen');
      document.body.append(elA, elB);
      setBox(elA, { top: 0, left: 0, width: 300, height: 200 });
      setBox(elB, { top: 0, left: 0, width: 300, height: 200 });

      const contextA = makeContext(document, elbA);
      const contextB = makeContext(document, elbB);

      initVisibilityTracking(contextA.registry, document, 200);
      initVisibilityTracking(contextB.registry, document, 2000);
      triggerVisible(contextA, elA, { multiple: true });
      triggerVisible(contextB, elB, { multiple: true });

      jest.advanceTimersByTime(200);
      await drain();

      // Positive control: A's own 200ms dwell has expired and fired.
      expect(elbA).toHaveBeenCalledWith(named('alpha seen'));
      expect(elbB).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1800);
      await drain();

      expect(elbB).toHaveBeenCalledWith(named('beta seen'));
    });
  });

  test('one source still dedups an element across its own document and sub-scope', () => {
    document.body.innerHTML = `
      <section id="box">
        <div id="shared" data-elb="alpha" data-elbaction="hover:over"></div>
      </section>
    `;
    const box = document.getElementById('box')!;
    const shared = document.getElementById('shared')!;

    const context = makeContext(document, elbA);

    initScopeTrigger(context);
    // `walker init <el>`: the same source, one registry, a scope-aligned context.
    initScopeTrigger({
      ...context,
      settings: { ...context.settings, scope: box },
    });

    shared.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(elbA).toHaveBeenCalledTimes(1);
  });
});

describe('registry isolation across realms', () => {
  let elbA: jest.MockedFunction<Elb.Fn>;
  let elbB: jest.MockedFunction<Elb.Fn>;
  let frame: HTMLIFrameElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btnA" data-elb="alpha" data-elbaction="click:one">A</button>
    `;
    frame = document.createElement('iframe');
    document.body.appendChild(frame);
    elbA = jest.fn().mockResolvedValue({ ok: true });
    elbB = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    teardown();
    document.body.innerHTML = '';
    jest.useRealTimers();
  });

  test('a source in an iframe realm neither starves nor is starved by the host page source', () => {
    const frameDoc = frame.contentDocument!;
    const frameWin = frameDoc.defaultView!;
    frameDoc.body.innerHTML = `<button id="btnB" data-elb="beta" data-elbaction="click:two">B</button>`;
    const btnA = document.getElementById('btnA')!;
    const btnB = frameDoc.getElementById('btnB')!;

    const contextA = makeContext(document, elbA);
    const contextB = makeContext(frameDoc.body, elbB);

    // Positive control: A's delegation is observable before B exists.
    initGlobalTrigger(contextA);
    btnA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elbA).toHaveBeenCalledWith(named('alpha one'));
    elbA.mockClear();

    initGlobalTrigger(contextB);

    btnA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elbA).toHaveBeenCalledWith(named('alpha one'));

    btnB.dispatchEvent(new frameWin.MouseEvent('click', { bubbles: true }));
    expect(elbB).toHaveBeenCalledWith(named('beta two'));
  });

  test('destroying the iframe realm source leaves the host page pulse alive', () => {
    jest.useFakeTimers();

    const frameDoc = frame.contentDocument!;
    document.body.appendChild(tagged(document, 'alpha', 'pulse(1000):tick'));
    frameDoc.body.appendChild(tagged(frameDoc, 'beta', 'pulse(1000):tick'));

    const contextA = makeContext(document, elbA);
    const contextB = makeContext(frameDoc.body, elbB);

    initScopeTrigger(contextA);
    initScopeTrigger(contextB);

    // Positive control: each realm's pulse is live before any teardown.
    jest.advanceTimersByTime(1000);
    expect(elbA).toHaveBeenCalledWith(named('alpha tick'));
    expect(elbB).toHaveBeenCalledWith(named('beta tick'));
    elbA.mockClear();
    elbB.mockClear();

    destroyTriggers(contextB);

    jest.advanceTimersByTime(1000);
    expect(elbA).toHaveBeenCalledWith(named('alpha tick'));
    expect(elbB).not.toHaveBeenCalled();
  });
});
