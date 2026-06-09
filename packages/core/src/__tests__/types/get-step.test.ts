import { Source, Destination, Transformer, Store } from '../../index';
import { createMockElb } from '../helpers/mocks';

describe('getSource', () => {
  type TestPushFn = (rawData: {
    method: string;
    path: string;
  }) => Promise<void>;
  type TestSourceTypes = Source.Types<unknown, unknown, TestPushFn>;

  function buildSource(): Source.Instance<TestSourceTypes> {
    return {
      type: 'test',
      config: {},
      push: async (rawData) => {
        // The rawData parameter type comes from the generic, not from a cast.
        expect(rawData.method).toBe('GET');
      },
    };
  }

  it('returns a narrowly typed instance whose push accepts the declared raw shape', async () => {
    const collector = { sources: { testSource: buildSource() } };
    const src = Source.getSource<TestSourceTypes>(collector, 'testSource');
    await src.push({ method: 'GET', path: '/api/data' });
  });

  it('defaults the generic when no type parameter is supplied', () => {
    const baseInstance: Source.Instance = {
      type: 'base',
      config: {},
      push: createMockElb(),
    };
    const collector = { sources: { id: baseInstance } };
    const src = Source.getSource(collector, 'id');
    expect(src.type).toBe('base');
  });

  it('throws when the id is unknown', () => {
    const collector = { sources: {} as { [id: string]: Source.Instance } };
    expect(() => Source.getSource(collector, 'nope')).toThrow(
      'Source not found: nope',
    );
  });
});

describe('getDestination', () => {
  type MyDestTypes = Destination.Types<{ apiKey: string }>;

  function buildDestination(): Destination.Instance<MyDestTypes> {
    return {
      type: 'test',
      config: { settings: { apiKey: 'secret' } },
      push: async (event, context) => {
        expect(event).toBeDefined();
        expect(context).toBeDefined();
      },
    };
  }

  it('returns a narrowly typed instance with the declared settings shape', () => {
    const collector = { destinations: { myDest: buildDestination() } };
    const dest = Destination.getDestination<MyDestTypes>(collector, 'myDest');
    expect(dest.config.settings?.apiKey).toBe('secret');
  });

  it('defaults the generic when no type parameter is supplied', () => {
    const baseInstance: Destination.Instance = {
      type: 'base',
      config: {},
      push: async () => {},
    };
    const collector = { destinations: { id: baseInstance } };
    const dest = Destination.getDestination(collector, 'id');
    expect(dest.type).toBe('base');
  });

  it('throws when the id is unknown', () => {
    const collector = {
      destinations: {} as { [id: string]: Destination.Instance },
    };
    expect(() => Destination.getDestination(collector, 'nope')).toThrow(
      'Destination not found: nope',
    );
  });
});

describe('getTransformer', () => {
  type MyTxTypes = Transformer.Types<{ key: string }>;

  function buildTransformer(): Transformer.Instance<MyTxTypes> {
    return {
      type: 'test',
      config: { settings: { key: 'value' } },
      push: () => undefined,
    };
  }

  it('returns a narrowly typed instance with the declared settings shape', () => {
    const collector = { transformers: { redact: buildTransformer() } };
    const tx = Transformer.getTransformer<MyTxTypes>(collector, 'redact');
    expect(tx.config.settings?.key).toBe('value');
  });

  it('defaults the generic when no type parameter is supplied', () => {
    const baseInstance: Transformer.Instance = {
      type: 'base',
      config: {},
      push: () => undefined,
    };
    const collector = { transformers: { id: baseInstance } };
    const tx = Transformer.getTransformer(collector, 'id');
    expect(tx.type).toBe('base');
  });

  it('throws when the id is unknown', () => {
    const collector = {
      transformers: {} as { [id: string]: Transformer.Instance },
    };
    expect(() => Transformer.getTransformer(collector, 'nope')).toThrow(
      'Transformer not found: nope',
    );
  });
});

describe('getStore', () => {
  type MyStoreTypes = Store.Types<{ host: string }>;

  function buildStore(): Store.Instance<MyStoreTypes> {
    const data: Record<string, Store.StoreValue> = {};
    return {
      type: 'memory',
      config: { settings: { host: 'localhost' } },
      get: async (key) => data[key],
      set: async (key, value) => {
        data[key] = value;
      },
      delete: async (key) => {
        delete data[key];
      },
    };
  }

  it('returns a narrowly typed instance with the declared settings shape', async () => {
    const collector = { stores: { cache: buildStore() } };
    const store = Store.getStore<MyStoreTypes>(collector, 'cache');
    expect(store.config.settings?.host).toBe('localhost');
    await store.set('k', 'v');
    expect(await store.get('k')).toBe('v');
  });

  it('defaults the generic when no type parameter is supplied', () => {
    const baseInstance: Store.Instance = {
      type: 'base',
      config: {},
      get: async () => undefined,
      set: async () => {},
      delete: async () => {},
    };
    const collector = { stores: { id: baseInstance } };
    const store = Store.getStore(collector, 'id');
    expect(store.type).toBe('base');
  });

  it('throws when the id is unknown', () => {
    const collector = { stores: {} as { [id: string]: Store.Instance } };
    expect(() => Store.getStore(collector, 'nope')).toThrow(
      'Store not found: nope',
    );
  });
});
