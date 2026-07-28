import { startFlow } from '@walkeros/collector';
import type { WalkerOS } from '@walkeros/core';
import { getConfig } from '../config';
import { SettingsSchema } from '../schemas';
import {
  createBrowserSource,
  destroyAllTestSources,
  flushChain,
} from './test-utils';

describe('getConfig capture default', () => {
  test('defaults capture to true', () => {
    expect(getConfig().capture).toBe(true);
  });

  test('respects an explicit capture:false override', () => {
    expect(getConfig({ capture: false }).capture).toBe(false);
  });

  test('respects an explicit capture:true override', () => {
    expect(getConfig({ capture: true }).capture).toBe(true);
  });
});

// An embedded source shares the page with the site's own. `elb: false` is how
// it takes no name on that page at all: a value the schema accepts, not an
// empty string that happens to be falsy.
describe('elb: false', () => {
  test('the schema accepts false', () => {
    expect(SettingsSchema.parse({ elb: false }).elb).toBe(false);
  });

  test('the schema still rejects an empty name', () => {
    expect(SettingsSchema.safeParse({ elb: '' }).success).toBe(false);
  });

  test('the schema still defaults to the elb name', () => {
    expect(SettingsSchema.parse({}).elb).toBe('elb');
  });

  test('getConfig keeps an explicit false', () => {
    expect(getConfig({ elb: false }).elb).toBe(false);
  });
});

// Real collector plus a recording destination, so "did it still capture" is
// answerable from the events themselves.
async function setup() {
  const events: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    run: true,
    destinations: {
      record: {
        code: {
          type: 'record',
          config: {},
          push: (event: WalkerOS.Event) => {
            events.push(event);
          },
        },
      },
    },
  });
  return { collector, events };
}

const tagged = (entity: string, action: string): HTMLDivElement => {
  const element = document.createElement('div');
  element.setAttribute('data-elb', entity);
  element.setAttribute('data-elbaction', action);
  return element;
};

const click = (element: Element): void => {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

// Every own property name the window gained. A diff rather than one absent
// name, so an install under any name is caught.
const installedOn = (before: string[]): string[] => {
  const known = new Set(before);
  return Object.getOwnPropertyNames(window).filter((name) => !known.has(name));
};

describe('window footprint', () => {
  afterEach(async () => {
    await destroyAllTestSources();
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elb');
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elbEmbedded');
  });

  test('a named elb installs exactly that one property', async () => {
    const { collector } = await setup();
    const before = Object.getOwnPropertyNames(window);

    await createBrowserSource(
      collector,
      { elb: 'elbEmbedded', elbLayer: false },
      { runOnInit: true },
    );

    expect(installedOn(before)).toEqual(['elbEmbedded']);
  });

  test('elb: false installs nothing and still captures in scope', async () => {
    const { collector, events } = await setup();
    const button = tagged('product', 'click:add');
    document.body.appendChild(button);
    const before = Object.getOwnPropertyNames(window);

    await createBrowserSource(
      collector,
      { elb: false, elbLayer: false },
      { runOnInit: true },
    );

    expect(installedOn(before)).toEqual([]);

    click(button);
    await flushChain();

    expect(events.map((event) => event.name)).toEqual(['product add']);
  });
});
