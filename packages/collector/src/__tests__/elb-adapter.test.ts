import type { Destination, Logger, WalkerOS } from '@walkeros/core';
import { createElb } from '../elb';
import { startFlow } from '../flow';
import { createPushResult } from '../destination';

describe('createElb adapter', () => {
  it('forwards a clone of the caller object, not the caller reference', async () => {
    const { collector } = await startFlow({});
    const elb = createElb(collector);

    // Capture the exact object the adapter hands to collector.push.
    let pushed: unknown;
    const pushSpy = jest
      .spyOn(collector, 'push')
      .mockImplementation(async (event) => {
        pushed = event;
        return createPushResult({ ok: true });
      });

    const event = { name: 'page view' };
    await elb(event);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    // A distinct reference (shallow clone) means downstream writes can never
    // leak back onto the caller's object across reused calls.
    expect(pushed).not.toBe(event);
    expect(pushed).toEqual(event);
  });
});

// A real collector with a spy destination and a log recorder: what arrives is
// what the destination gets, what the page sees is what the logger reports.
async function setup() {
  const events: WalkerOS.Event[] = [];
  const errors: string[] = [];
  const spy: Destination.Instance = {
    type: 'spy',
    config: {},
    push: (event) => {
      events.push(event);
    },
  };
  const handler: Logger.Handler = (level, message) => {
    if (level === 0) errors.push(message);
  };
  const { collector, elb } = await startFlow({
    destinations: { spy: { code: spy } },
    logger: { handler },
  });
  return { collector, elb, events, errors };
}

// Untyped page code reaches elb with any arguments; the typed signature has
// none of these forms, so the calls go through a plain function value.
const untyped = (fn: unknown): ((...args: unknown[]) => Promise<unknown>) => {
  if (typeof fn !== 'function') throw new Error('not a function');
  return (...args) => Promise.resolve(Reflect.apply(fn, undefined, args));
};

describe('elb arguments beyond data', () => {
  it.each<[string, unknown[]]>([
    [
      'positional context, nested and custom',
      [
        'product view',
        { id: 'P1' },
        { position: ['top', 0] },
        [{ entity: 'size', data: {} }],
        { flag: true },
      ],
    ],
    [
      'a second argument after an event object',
      [{ name: 'product view', data: { id: 'P1' } }, { extra: 'x' }],
    ],
    ['data that is not an object', ['product view', 'P1']],
  ])('ignores %s and reports it', async (_label, args) => {
    const { elb, events, errors } = await setup();

    await untyped(elb)(...args);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'product view',
      context: {},
      nested: [],
      custom: {},
    });
    const expectedData = args[0] === 'product view' && args[1] === 'P1';
    expect(events[0].data).toEqual(expectedData ? {} : { id: 'P1' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/elb/);
    expect(errors[0]).toMatch(/trigger, context, nested, custom/);
  });

  it('reports once per event name', async () => {
    const { elb, events, errors } = await setup();

    await untyped(elb)('product view', { id: 'P1' }, { position: ['a', 0] });
    await untyped(elb)('product view', { id: 'P2' }, 'click');
    expect(errors).toHaveLength(1);

    await untyped(elb)('order complete', { id: 'O1' }, 'click');

    expect(events.map((event) => event.data.id)).toEqual(['P1', 'P2', 'O1']);
    expect(errors).toHaveLength(2);
  });

  it('runs a walker command with an extra argument and reports it', async () => {
    const { collector, elb, errors } = await setup();

    await untyped(elb)('walker user', { id: 'u1' }, 'extra');

    expect(collector.user).toEqual({ id: 'u1' });
    expect(errors).toHaveLength(1);
  });

  it('reports nothing for the forms elb takes', async () => {
    const { elb, events, errors } = await setup();

    await elb({ name: 'product view', data: { id: 'P1' } });
    await elb('product add', { id: 'P2' });
    await elb('page view');
    await elb('walker user', { id: 'u1' });
    // A trailing undefined carries nothing, so it is not an extra argument.
    await untyped(elb)('order complete', { id: 'O1' }, undefined);

    expect(events.map((event) => event.name)).toEqual([
      'product view',
      'product add',
      'page view',
      'order complete',
    ]);
    expect(errors).toEqual([]);
  });
});
