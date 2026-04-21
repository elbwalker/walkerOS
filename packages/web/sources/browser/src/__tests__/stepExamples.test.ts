import type { Elb } from '@walkeros/core';
import { getConfig } from '../config';
import { handleTrigger } from '../trigger';
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

  // Impression needs IntersectionObserver mock — tested separately
  const supported = Object.entries(examples.step).filter(
    ([name]) => name !== 'impressionEvent',
  );

  it.each(supported)('%s', async (_name, example) => {
    const triggerInfo = example.trigger as
      | { type?: string; options?: unknown }
      | undefined;
    const content = example.in as string;

    // Seed URL / title / referrer for load-style examples
    if (triggerInfo?.type === 'load' || !triggerInfo?.type) {
      const opts = (triggerInfo?.options || {}) as {
        url?: string;
        title?: string;
        referrer?: string;
      };
      if (opts.url) {
        const urlObj = new URL(opts.url);
        window.history.replaceState({}, '', urlObj.pathname);
      }
      if (opts.title) document.title = opts.title;
      if (opts.referrer) {
        Object.defineProperty(document, 'referrer', {
          value: opts.referrer,
          configurable: true,
        });
      }
    }

    // Inject HTML
    if (content) document.body.innerHTML = content;

    const mockElb = jest.fn(async () => ({
      ok: true,
      successful: [],
      failed: [],
      queued: [],
    })) as unknown as jest.MockedFunction<Elb.Fn>;

    const settings = getConfig({ scope: document }, document);
    const context: Context = {
      elb: mockElb,
      settings,
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
        await handleTrigger(context, elem as Element, 'load');
      }
    } else {
      const target = selector ? document.querySelector(selector) : null;
      if (!target) throw new Error(`Selector not found: ${selector}`);
      await handleTrigger(context, target, type);
    }

    const captured = mockElb.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );
    expect(captured).toEqual(example.out);
  });
});
