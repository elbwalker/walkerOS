import type { Elb } from '@walkeros/core';
import type { Settings } from '../types';
import {
  registerScanElement,
  isRegistered,
  resetScope,
  destroyTriggers,
} from '../trigger';
import { initVisibilityTracking } from '../triggerVisible';

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

// Cast-free IntersectionObserver stub so visible/impression registration can run
// in jsdom without a real layout engine.
class MockIntersectionObserver implements IntersectionObserver {
  root: Document | Element | null = null;
  rootMargin = '0px';
  thresholds: ReadonlyArray<number> = [0, 0.5];
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
  constructor(_callback?: IntersectionObserverCallback) {}
}

describe('registerScanElement (per-element resource capture)', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    mockElb = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    destroyTriggers();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  test('records pulse/wait/scroll/hover resources into the registration', () => {
    const scope = document.createElement('div');
    document.body.appendChild(scope);
    const bucket = resetScope(scope);
    scope.innerHTML = `
      <div id="multi" data-elb="c"
           data-elbaction="pulse(1000):a;wait(2000):b;scroll(50):c;hover:d"></div>
    `;
    const multi = document.getElementById('multi')!;
    const settings = createTestSettings('data-elb', scope);

    const registration = registerScanElement(
      { elb: mockElb, settings },
      multi,
      'data-elbaction',
      bucket,
      scope,
    );

    expect(registration).toBeDefined();
    expect(registration?.intervalIds).toHaveLength(1);
    expect(registration?.timeoutIds).toHaveLength(1);
    expect(registration?.scroll).toBe(true);
    expect(registration?.hoverAbort).toBeInstanceOf(AbortController);
    expect(isRegistered(multi)).toBe(true);
  });

  test('marks observed for a visible element', () => {
    const originalIO = global.IntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;

    try {
      const scope = document.createElement('div');
      document.body.appendChild(scope);
      initVisibilityTracking(scope, 1000);
      const bucket = resetScope(scope);
      scope.innerHTML = `<div id="v" data-elb="c" data-elbaction="visible:a"></div>`;
      const visible = document.getElementById('v')!;
      const settings = createTestSettings('data-elb', scope);

      const registration = registerScanElement(
        { elb: mockElb, settings },
        visible,
        'data-elbaction',
        bucket,
        scope,
      );

      expect(registration?.observed).toBe(true);
      expect(bucket.observed.has(visible)).toBe(true);
    } finally {
      // Restore even if an assertion throws, so the mock can't leak into later
      // tests in this file.
      global.IntersectionObserver = originalIO;
    }
  });

  test('registering the same element twice wires its triggers once', () => {
    const scope = document.createElement('div');
    document.body.appendChild(scope);
    const bucket = resetScope(scope);
    scope.innerHTML = `<div id="p" data-elb="c" data-elbaction="pulse(1000):a"></div>`;
    const pulse = document.getElementById('p')!;
    const settings = createTestSettings('data-elb', scope);
    const context = { elb: mockElb, settings };
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    registerScanElement(context, pulse, 'data-elbaction', bucket, scope);
    registerScanElement(context, pulse, 'data-elbaction', bucket, scope);

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  test('skips non-Element nodes (text node) without throwing and registers nothing', () => {
    const scope = document.createElement('div');
    document.body.appendChild(scope);
    const bucket = resetScope(scope);
    const textNode = document.createTextNode('word-by-word chat stream');
    const settings = createTestSettings('data-elb', scope);

    let registration: ReturnType<typeof registerScanElement>;
    expect(() => {
      registration = registerScanElement(
        { elb: mockElb, settings },
        textNode,
        'data-elbaction',
        bucket,
        scope,
      );
    }).not.toThrow();

    expect(registration!).toBeUndefined();
    expect(bucket.registered.size).toBe(0);
  });
});
