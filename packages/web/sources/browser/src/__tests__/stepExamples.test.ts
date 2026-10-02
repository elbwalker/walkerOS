import type { Elb } from '@walkeros/core';
import { isObject } from '@walkeros/core';
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
