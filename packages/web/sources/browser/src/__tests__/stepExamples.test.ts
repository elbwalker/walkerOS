import type { Elb, Flow } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { sourceBrowser } from '../index';
import { getConfig } from '../config';
import { createRegistry, handleTrigger } from '../trigger';
import { translateToCoreCollector } from '../translation';
import { getPageViewData } from '../walker';
import { examples } from '../dev';
import type { Context } from '../types';

describe('Step Examples', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Impression needs IntersectionObserver mock, tested separately
  const supported = Object.entries(examples.step).filter(
    ([name]) => name !== 'impressionEvent',
  );

  it.each(supported)('%s', async (_name, example) => {
    const triggerInfo = example.trigger;
    const content = typeof example.in === 'string' ? example.in : '';

    if (triggerInfo?.type === 'history') {
      expect(await recordRouteChange(example)).toEqual(example.out);
      return;
    }

    // Seed URL / title / referrer for load-style examples
    if (triggerInfo?.type === 'load' || !triggerInfo?.type) {
      const opts = isObject(triggerInfo?.options) ? triggerInfo.options : {};
      const url = typeof opts.url === 'string' ? opts.url : undefined;
      const title = typeof opts.title === 'string' ? opts.title : undefined;
      const referrer =
        typeof opts.referrer === 'string' ? opts.referrer : undefined;
      if (url) {
        const urlObj = new URL(url);
        window.history.replaceState({}, '', urlObj.pathname);
      }
      if (title) document.title = title;
      if (referrer) {
        Object.defineProperty(document, 'referrer', {
          value: referrer,
          configurable: true,
        });
      }
    }

    // Inject HTML
    if (content) document.body.innerHTML = content;

    const mockElb: jest.MockedFunction<Elb.Fn> = jest
      .fn()
      .mockImplementation(async () => ({
        ok: true,
        successful: [],
        failed: [],
        queued: [],
      }));

    const settings = getConfig({ scope: document }, document);
    const context: Context = {
      elb: mockElb,
      push: mockElb,
      settings,
      registry: createRegistry(),
    };

    const type = triggerInfo?.type;
    const selector =
      typeof triggerInfo?.options === 'string'
        ? triggerInfo.options
        : undefined;

    if (!type || type === 'load') {
      // Pageview path: trigger a page view event
      const [data, contextData] = getPageViewData(
        settings.prefix || 'data-elb',
        document,
      );
      await translateToCoreCollector(
        context,
        'page view',
        data,
        'load',
        contextData,
      );
      // Plus any data-elb elements with load triggers
      const loadElems = document.querySelectorAll('[data-elbaction*="load"]');
      for (const elem of Array.from(loadElems)) {
        await handleTrigger(context, elem, 'load');
      }
    } else {
      const target = selector ? document.querySelector(selector) : null;
      if (!target) throw new Error(`Selector not found: ${selector}`);
      await handleTrigger(context, target, type);
    }

    const captured = mockElb.mock.calls.map((args) => ['elb', ...args]);
    expect(captured).toEqual(example.out);
  });
});

// A route change needs the live source, whose history watcher turns the push
// into a run, so it plays through the package's createTrigger, recorded at the
// collector's push like a CLI simulation. createTrigger waits one real task.
async function recordRouteChange(
  example: Flow.StepExample,
): Promise<unknown[][]> {
  jest.useRealTimers();
  const calls: unknown[][] = [];
  const { trigger, flow } = await examples.createTrigger({
    sources: {
      browser: {
        code: sourceBrowser,
        config: { settings: { history: true } },
      },
    },
    hooks: {
      prePush: (_params: unknown, event: unknown) => {
        // The pipeline stamps an event id no example can carry.
        if (isObject(event)) calls.push(['elb', { ...event, id: undefined }]);
        return Promise.resolve({ ok: true });
      },
    },
  });
  await trigger(example.trigger?.type, example.trigger?.options)('');
  await flow?.collector.command('shutdown');
  return calls;
}

describe('legacy trigger', () => {
  it('runs on the package mock env', () => {
    const env = examples.env.push;
    expect(
      examples.trigger(
        { trigger: 'click', attributes: { 'data-elb': 'cta' } },
        { window: env.window, document: env.document },
      ),
    ).toEqual(expect.any(Function));
  });

  it('ignores an env without a window and a document', () => {
    expect(
      examples.trigger(
        { trigger: 'click', attributes: { 'data-elb': 'cta' } },
        {},
      ),
    ).toBeUndefined();
  });
});
