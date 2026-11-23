import { parseCallPath, recordEnv } from '../recordEnv';
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

describe('recordEnv', () => {
  it('records a call reached through a constructor and a method return', async () => {
    const { env, calls } = recordEnv({ PubSub: MockPubSub }, [
      'call:PubSub.topic.publishMessage',
    ]);
    const client = construct(env.PubSub, [{ projectId: 'p' }]);
    if (!(client instanceof MockPubSub)) throw new Error('instanceof lost');
    expect(
      await client.topic('events').publishMessage({ data: Buffer.from('x') }),
    ).toBe('msg-1');
    expect(client.peek()).toBe('s');
    expect(calls).toEqual([
      {
        fn: 'PubSub.topic.publishMessage',
        args: [{ data: Buffer.from('x') }],
        ts: expect.any(Number),
      },
    ]);
  });

  it('keeps static members', () => {
    const { env } = recordEnv({ PubSub: MockPubSub }, ['PubSub']);
    const Ctor = env.PubSub;
    expect(
      typeof Ctor === 'function' && 'version' in Ctor
        ? Ctor.version
        : undefined,
    ).toBe('1');
  });

  it('records a constructor leaf once per construction', () => {
    const { env, calls } = recordEnv({ PubSub: MockPubSub }, ['PubSub']);
    const client = construct(env.PubSub, [{ projectId: 'p' }]);
    expect(client instanceof MockPubSub).toBe(true);
    expect(calls).toEqual([
      { fn: 'PubSub', args: [{ projectId: 'p' }], ts: expect.any(Number) },
    ]);
  });

  it('records once on a chain that returns this', async () => {
    const client = new ChainClient();
    const { env, calls } = recordEnv({ client }, [
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
    recordEnv(original, ['call:PubSub.topic.publishMessage']);
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
    const { env } = recordEnv({ box: new Box() }, ['box.read']);
    const box = env.box;
    if (!(box instanceof Box)) throw new Error('instanceof lost');
    box.value = 5;
    expect(box.value).toBe(5);
  });

  it('keeps identity stable across reads', () => {
    const { env } = recordEnv({ client: new ChainClient() }, ['client.insert']);
    expect(env.client).toBe(env.client);
  });

  it('follows a mid-path Promise and records the leaf only', async () => {
    const prepared: string[] = [];
    const db = {
      prepare(sql: string) {
        prepared.push(sql);
        return 'stmt';
      },
    };
    const { env, calls } = recordEnv({ open: async () => db }, [
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
    const { env, calls } = recordEnv({ window: { dataLayer } }, [
      'call:window.dataLayer.push',
    ]);
    call(slot(slot(env.window, 'dataLayer'), 'push'), { event: 'x' });
    expect(dataLayer).toEqual([{ event: 'x' }]);
    expect(calls.map((x) => x.fn)).toEqual(['window.dataLayer.push']);
  });

  it('records once when a view is written back and read again', () => {
    const win: Record<string, unknown> = { dataLayer: [] };
    const { env, calls } = recordEnv({ window: win }, [
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
    const { env, calls } = recordEnv({ window: win }, ['window.gtag']);
    win.gtag = () => 'real';
    expect(call(slot(env.window, 'gtag'), 'event')).toBe('real');
    expect(calls.map((x) => x.fn)).toEqual(['window.gtag']);
  });

  it('records a call through a frozen object without mutating it', () => {
    const sent: unknown[] = [];
    const lib = Object.freeze({ send: (x: unknown) => sent.push(x) });
    const { env, calls } = recordEnv({ lib }, ['call:lib.send']);
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

  it('records a call through a frozen root without mutating it', () => {
    const sent: unknown[] = [];
    const root = Object.freeze({
      lib: { send: (x: unknown) => sent.push(x) },
    });
    const { env, calls } = recordEnv(root, ['call:lib.send']);
    call(slot(env.lib, 'send'), 'a');
    expect(sent).toEqual(['a']);
    expect(calls).toEqual([
      { fn: 'lib.send', args: ['a'], ts: expect.any(Number) },
    ]);
    expect(Object.isFrozen(root)).toBe(true);
    expect(Object.keys(env)).toEqual(['lib']);
  });

  it('records a call through a non-writable, non-configurable root key', () => {
    const sent: unknown[] = [];
    const lib = { send: (x: unknown) => sent.push(x) };
    const root = {};
    Object.defineProperty(root, 'lib', {
      value: lib,
      writable: false,
      configurable: false,
      enumerable: true,
    });
    const before = Object.getOwnPropertyDescriptor(root, 'lib');
    const { env, calls } = recordEnv(root, ['call:lib.send']);
    call(slot(slot(env, 'lib'), 'send'), 'a');
    expect(sent).toEqual(['a']);
    expect(calls.map((c) => [c.fn, c.args])).toEqual([['lib.send', ['a']]]);
    expect(Object.getOwnPropertyDescriptor(root, 'lib')).toEqual(before);
  });

  it('keeps a frozen callable root callable', () => {
    const root = Object.freeze(
      Object.assign(() => 'called', { lib: { send: () => 'sent' } }),
    );
    const { env } = recordEnv(root, ['call:lib.send']);
    expect(call(env)).toBe('called');
  });

  it('records a call through a frozen call result', () => {
    const client = Object.freeze({ send: () => 'ok' });
    const { env, calls } = recordEnv({ make: () => client }, [
      'call:make.send',
    ]);
    expect(call(slot(call(env.make), 'send'), 1)).toBe('ok');
    expect(calls.map((c) => c.fn)).toEqual(['make.send']);
  });

  it.each(['call', 'bind', 'apply', 'name', 'length', 'toString'])(
    'navigates a call result whose method is named %s',
    (key) => {
      const make = () => ({ [key]: (x: number) => x + 1 });
      const { env, calls } = recordEnv({ make }, [`call:make.${key}`]);
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
    const { env, calls } = recordEnv({ Child }, ['call:Child.create']);
    expect(call(Reflect.get(env.Child, 'create'))).toBe('made');
    expect(calls.map((c) => c.fn)).toEqual(['Child.create']);
  });

  it('skips malformed paths', () => {
    const { calls } = recordEnv({}, ['.a', 'a..b', '']);
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

describe('parseCallPath', () => {
  it('splits a plain dot-path', () => {
    expect(parseCallPath('a.b')).toEqual(['a', 'b']);
  });

  it('strips a leading call: prefix', () => {
    expect(parseCallPath('call:window.gtag')).toEqual(['window', 'gtag']);
  });

  it('returns a single segment for a no-prefix single path', () => {
    expect(parseCallPath('foo')).toEqual(['foo']);
  });

  it('keeps a single call: path after stripping', () => {
    expect(parseCallPath('call:a.b.c')).toEqual(['a', 'b', 'c']);
  });

  it('strips only the literal call: prefix, never any other word:', () => {
    // A `<word>:` that is not `call:` stays part of the path (wrapEnv parity).
    expect(parseCallPath('window:gtag')).toEqual(['window:gtag']);
    expect(parseCallPath('foo:bar.baz')).toEqual(['foo:bar', 'baz']);
  });

  it('strips only a single leading call: prefix', () => {
    expect(parseCallPath('call:call:x')).toEqual(['call:x']);
  });

  it('returns [] for an empty string', () => {
    expect(parseCallPath('')).toEqual([]);
  });

  it('returns [] for a lone call: prefix', () => {
    expect(parseCallPath('call:')).toEqual([]);
  });

  it('returns [] for dots-only paths', () => {
    expect(parseCallPath('..')).toEqual([]);
    expect(parseCallPath('.')).toEqual([]);
  });

  it('returns [] for a consecutive-dot segment', () => {
    expect(parseCallPath('a..b')).toEqual([]);
  });

  it('returns [] for a leading or trailing dot', () => {
    expect(parseCallPath('.a')).toEqual([]);
    expect(parseCallPath('a.')).toEqual([]);
  });
});
