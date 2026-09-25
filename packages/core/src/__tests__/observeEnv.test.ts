import { observeEnv } from '../observeEnv';
import { expectSimulationResolves } from '../expectSimulationResolves';

class MockTopic {
  constructor(public name: string) {}
  async publishMessage(_msg: { data: Buffer }) {
    return 'msg-1';
  }
}
class MockPubSub {
  static version = '1';
  #secret = 's';
  constructor(public options?: object) {}
  topic(name: string) {
    return new MockTopic(name);
  }
  peek() {
    return this.#secret;
  }
}
class ChainClient {
  dataset(_id: string) {
    return this;
  }
  table(_id: string) {
    return this;
  }
  async insert(_rows: unknown[]) {
    return 'ok';
  }
}

function construct(value: unknown, args: unknown[]): unknown {
  if (typeof value !== 'function') throw new Error('not constructible');
  return Reflect.construct(value, args);
}

function call(value: unknown, ...args: unknown[]): unknown {
  if (typeof value !== 'function') throw new Error('not callable');
  return value(...args);
}

function slot(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) {
    throw new Error('not an object');
  }
  return Reflect.get(value, key);
}

describe('observeEnv', () => {
  it('records a call reached through a constructor and a method return', async () => {
    const { env, calls, unresolved } = observeEnv({ PubSub: MockPubSub }, [
      'call:PubSub.topic.publishMessage',
    ]);
    const client = construct(env.PubSub, [{ projectId: 'p' }]);
    if (!(client instanceof MockPubSub)) throw new Error('instanceof lost');
    expect(
      await client.topic('events').publishMessage({ data: Buffer.from('x') }),
    ).toBe('msg-1');
    expect(client.peek()).toBe('s');
    expect(unresolved).toEqual([]);
    expect(calls).toEqual([
      {
        fn: 'PubSub.topic.publishMessage',
        args: [{ data: Buffer.from('x') }],
        ts: expect.any(Number),
      },
    ]);
  });

  it('keeps static members', () => {
    const { env } = observeEnv({ PubSub: MockPubSub }, ['PubSub']);
    const Ctor = env.PubSub;
    expect(
      typeof Ctor === 'function' && 'version' in Ctor
        ? Ctor.version
        : undefined,
    ).toBe('1');
  });

  it('records a constructor leaf once per construction', () => {
    const { env, calls } = observeEnv({ PubSub: MockPubSub }, ['PubSub']);
    const client = construct(env.PubSub, [{ projectId: 'p' }]);
    expect(client instanceof MockPubSub).toBe(true);
    expect(calls).toEqual([
      { fn: 'PubSub', args: [{ projectId: 'p' }], ts: expect.any(Number) },
    ]);
  });

  it('records once on a chain that returns this', async () => {
    const client = new ChainClient();
    const { env, calls } = observeEnv({ client }, [
      'call:client.dataset.table.insert',
    ]);
    const c = env.client;
    if (!(c instanceof ChainClient)) throw new Error('instanceof lost');
    await c.dataset('d').table('t').insert([1]);
    expect(calls.map((x) => x.fn)).toEqual(['client.dataset.table.insert']);
  });

  it('leaves the caller env and prototypes untouched', () => {
    const original = { PubSub: MockPubSub };
    const topicBefore = MockPubSub.prototype.topic;
    observeEnv(original, ['call:PubSub.topic.publishMessage']);
    expect(original.PubSub).toBe(MockPubSub);
    expect(MockPubSub.prototype.topic).toBe(topicBefore);
  });

  it('runs setters against the real target', () => {
    class Box {
      #value = 0;
      set value(next: number) {
        this.#value = next;
      }
      get value() {
        return this.#value;
      }
      read() {
        return 1;
      }
    }
    const { env } = observeEnv({ box: new Box() }, ['box.read']);
    const box = env.box;
    if (!(box instanceof Box)) throw new Error('instanceof lost');
    box.value = 5;
    expect(box.value).toBe(5);
  });

  it('keeps identity stable across reads', () => {
    const { env } = observeEnv({ client: new ChainClient() }, [
      'client.insert',
    ]);
    expect(env.client).toBe(env.client);
  });

  it('lists an unwalkable object path as unresolved', () => {
    const { unresolved } = observeEnv({ window: {} }, ['call:window.gtag']);
    expect(unresolved).toEqual(['window.gtag']);
  });

  it('does not list a path that continues through a function', () => {
    const { unresolved } = observeEnv({ open: async () => ({}) }, [
      'call:open.prepare',
    ]);
    expect(unresolved).toEqual([]);
  });

  it('follows a mid-path Promise and records the leaf only', async () => {
    const prepared: string[] = [];
    const db = {
      prepare(sql: string) {
        prepared.push(sql);
        return 'stmt';
      },
    };
    const { env, calls } = observeEnv({ open: async () => db }, [
      'call:open.prepare',
    ]);
    const handle = await call(env.open, 'file.db');
    expect(call(slot(handle, 'prepare'), 'SELECT 1')).toBe('stmt');
    expect(prepared).toEqual(['SELECT 1']);
    expect(calls).toEqual([
      { fn: 'open.prepare', args: ['SELECT 1'], ts: expect.any(Number) },
    ]);
  });

  it('records an array method leaf such as dataLayer.push', () => {
    const dataLayer: unknown[] = [];
    const { env, calls } = observeEnv({ window: { dataLayer } }, [
      'call:window.dataLayer.push',
    ]);
    call(slot(slot(env.window, 'dataLayer'), 'push'), { event: 'x' });
    expect(dataLayer).toEqual([{ event: 'x' }]);
    expect(calls.map((x) => x.fn)).toEqual(['window.dataLayer.push']);
  });

  it('records once when a view is written back and read again', () => {
    const win: Record<string, unknown> = { dataLayer: [] };
    const { env, calls } = observeEnv({ window: win }, [
      'call:window.dataLayer.push',
    ]);
    const view = env.window;
    if (typeof view !== 'object' || view === null) throw new Error('no view');
    const dataLayer = Reflect.get(view, 'dataLayer');
    Reflect.set(view, 'dataLayer', dataLayer);
    call(slot(Reflect.get(view, 'dataLayer'), 'push'), { event: 'x' });
    expect(calls.map((x) => x.fn)).toEqual(['window.dataLayer.push']);
  });

  it('records a leaf installed after observation', () => {
    const win: Record<string, unknown> = {};
    const { env, calls } = observeEnv({ window: win }, ['window.gtag']);
    win.gtag = () => 'real';
    expect(call(slot(env.window, 'gtag'), 'event')).toBe('real');
    expect(calls.map((x) => x.fn)).toEqual(['window.gtag']);
  });

  it('forwards each call to an optional recorder and survives its throw', () => {
    const seen: string[] = [];
    const { env, calls } = observeEnv(
      { api: { track: () => 'sent' } },
      ['api.track'],
      (fn) => {
        seen.push(fn);
        throw new Error('telemetry broke');
      },
    );
    expect(call(slot(env.api, 'track'), 'a')).toBe('sent');
    expect(seen).toEqual(['api.track']);
    expect(calls).toEqual([]);
  });

  it('does not keep calls when a record callback is given', () => {
    const seen: unknown[][] = [];
    const { env, calls } = observeEnv(
      { api: { track: () => 'sent' } },
      ['call:api.track'],
      (_fn, args) => seen.push(args),
    );
    call(slot(env.api, 'track'), 'a');
    call(slot(env.api, 'track'), 'b');
    expect(seen).toEqual([['a'], ['b']]);
    expect(calls).toEqual([]);
  });

  it('records a call through a frozen object without mutating it', () => {
    const sent: unknown[] = [];
    const lib = Object.freeze({ send: (x: unknown) => sent.push(x) });
    const { env, calls, unresolved } = observeEnv({ lib }, ['call:lib.send']);
    expect(unresolved).toEqual([]);
    const view = env.lib;
    call(slot(view, 'send'), 'a');
    expect(sent).toEqual(['a']);
    expect(calls).toEqual([
      { fn: 'lib.send', args: ['a'], ts: expect.any(Number) },
    ]);
    expect(Object.isFrozen(lib)).toBe(true);
    expect('send' in view).toBe(true);
    expect(Object.keys(view)).toEqual(['send']);
  });

  it('records a call through a frozen call result', () => {
    const client = Object.freeze({ send: () => 'ok' });
    const { env, calls } = observeEnv({ make: () => client }, [
      'call:make.send',
    ]);
    expect(call(slot(call(env.make), 'send'), 1)).toBe('ok');
    expect(calls.map((c) => c.fn)).toEqual(['make.send']);
  });

  it.each(['call', 'bind', 'apply', 'name', 'length', 'toString'])(
    'navigates a call result whose method is named %s',
    (key) => {
      const make = () => ({ [key]: (x: number) => x + 1 });
      const { env, calls, unresolved } = observeEnv({ make }, [
        `call:make.${key}`,
      ]);
      expect(unresolved).toEqual([]);
      expect(call(slot(call(env.make), key), 1)).toBe(2);
      expect(calls.map((c) => c.fn)).toEqual([`make.${key}`]);
    },
  );

  it('still navigates a static inherited from a parent class', () => {
    class Base {
      static create() {
        return 'made';
      }
    }
    class Child extends Base {}
    const { env, calls, unresolved } = observeEnv({ Child }, [
      'call:Child.create',
    ]);
    expect(unresolved).toEqual([]);
    expect(call(Reflect.get(env.Child, 'create'))).toBe('made');
    expect(calls.map((c) => c.fn)).toEqual(['Child.create']);
  });

  it('skips malformed paths', () => {
    const { unresolved, calls } = observeEnv({}, ['.a', 'a..b', '']);
    expect(unresolved).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe('expectSimulationResolves', () => {
  it('passes when every path resolves', async () => {
    await expect(
      expectSimulationResolves({
        push: { PubSub: MockPubSub },
        simulation: ['call:PubSub.topic.publishMessage'],
      }),
    ).resolves.toBeUndefined();
  });

  it('passes a path through an async factory', async () => {
    await expect(
      expectSimulationResolves({
        push: { open: async () => ({ prepare: () => 'stmt' }) },
        simulation: ['call:open.prepare'],
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    ['a typo behind a constructor', 'call:PubSub.topik.publishMessage'],
    ['a typo behind an async factory', 'call:open.nope'],
  ])('fails %s', async (_name, path) => {
    await expect(
      expectSimulationResolves({
        push: { PubSub: MockPubSub, open: async () => ({ prepare() {} }) },
        simulation: [path],
      }),
    ).rejects.toThrow(path);
  });

  it('fails when the leaf is not a function', async () => {
    await expect(
      expectSimulationResolves({
        push: { client: { version: '1' } },
        simulation: ['client.version'],
      }),
    ).rejects.toThrow('leaf is not a function');
  });

  it('throws naming the unresolved path', async () => {
    await expect(
      expectSimulationResolves({
        push: { window: {} },
        simulation: ['call:window.gtag'],
      }),
    ).rejects.toThrow('window.gtag');
  });

  it('throws when paths are declared without a push env', async () => {
    await expect(
      expectSimulationResolves({ simulation: ['sendServer'] }),
    ).rejects.toThrow('no push mock');
  });

  it('passes an env without simulation paths', async () => {
    await expect(expectSimulationResolves({})).resolves.toBeUndefined();
  });
});
