import { Level } from '@walkeros/core';
import type { Collector, Destination } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../index';
import { flushChain } from './test-utils';

// An elbLayer entry whose routing throws, queued before the source starts as
// a page script ahead of walker.js does: the entry's event is lost, so the
// line is an ERROR at the default level, naming the entry by its event and
// never by its payload, and the entries after it still run.

interface Line {
  level: Level;
  message: string;
  context: unknown;
}

let current: Collector.Instance | undefined;

afterEach(async () => {
  await current?.command('shutdown');
  current = undefined;
  Reflect.deleteProperty(window, 'elbLayer');
  Reflect.deleteProperty(window, 'elb');
});

async function start(layer: unknown[]) {
  const lines: Line[] = [];
  const delivered: string[] = [];
  const probe: Destination.Instance = {
    type: 'probe',
    config: {},
    push: (event) => void delivered.push(event.name),
  };
  Reflect.set(window, 'elbLayer', layer);
  const { collector } = await startFlow({
    logger: {
      handler: (level, message, context) =>
        void lines.push({ level, message, context }),
    },
    sources: {
      browser: {
        code: sourceBrowser,
        config: { settings: { pageview: false } },
      },
    },
    destinations: { probe: { code: probe } },
  });
  current = collector;
  await flushChain();
  return { collector, lines, delivered };
}

describe('elbLayer entry failure', () => {
  it('logs one ERROR without the payload and keeps routing the queue', async () => {
    const { collector, lines, delivered } = await start([
      [
        'order complete',
        {
          email: 'jane@example.com',
          get total() {
            throw new Error('bad total getter');
          },
        },
      ],
      ['product view', { id: 'p1' }],
    ]);

    const errors = lines.filter(({ level }) => level === Level.ERROR);
    expect(errors).toHaveLength(1);
    expect(errors[0].context).toMatchObject({
      step: 'source.browser',
      event: 'order complete',
    });
    expect(JSON.stringify(errors[0].context)).not.toContain('jane@example.com');
    expect(collector.status.failed).toBe(1);
    expect(delivered).toEqual(['product view']);
  });

  it('names an event object by a name it can read, never reading a throwing one', async () => {
    const { lines, delivered } = await start([
      {
        get name(): string {
          throw new Error('bad event getter');
        },
        data: { email: 'jane@example.com' },
      },
      ['product view', { id: 'p1' }],
    ]);

    const errors = lines.filter(({ level }) => level === Level.ERROR);
    expect(errors).toHaveLength(1);
    expect(errors[0].context).toMatchObject({ step: 'source.browser' });
    expect(JSON.stringify(errors[0].context)).not.toContain('jane@example.com');
    expect(delivered).toEqual(['product view']);
  });
});
