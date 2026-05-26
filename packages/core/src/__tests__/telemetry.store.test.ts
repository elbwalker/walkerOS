import { useHooks } from '../useHooks';
import { createTelemetryHooks } from '../telemetry';
import type { FlowState } from '../types/telemetry';

const FLOW_ID = 'default';

function makeEmit() {
  const states: FlowState[] = [];
  return { states, emit: (s: FlowState) => states.push(s) };
}

describe('createTelemetryHooks: store hooks', () => {
  test('per-store hook name registers handlers for each id', () => {
    const { emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID }, [
      'gcs',
      'session',
    ]);
    expect(hooks.preStoreGet_gcs).toBeDefined();
    expect(hooks.postStoreGet_gcs).toBeDefined();
    expect(hooks.preStoreSet_gcs).toBeDefined();
    expect(hooks.postStoreSet_gcs).toBeDefined();
    expect(hooks.preStoreDelete_gcs).toBeDefined();
    expect(hooks.postStoreDelete_gcs).toBeDefined();
    expect(hooks.preStoreGet_session).toBeDefined();
  });

  test('get emits in+out under meta with the key', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID }, ['gcs']);

    const get = async (_key: string) => 'value';
    const wrapped = useHooks(get, 'StoreGet_gcs', hooks);
    const result = await wrapped('k1');
    expect(result).toBe('value');

    expect(states.length).toBe(2);
    expect(states[0].stepId).toBe('store.gcs');
    expect(states[0].stepType).toBe('store');
    expect(states[0].phase).toBe('in');
    expect(states[0].meta).toEqual({ op: 'get', key: 'k1' });
    expect(states[1].phase).toBe('out');
    expect(states[1].meta).toEqual({ op: 'get', key: 'k1' });
    expect(typeof states[1].durationMs).toBe('number');
  });

  test('set emits in+out and records value on pre-state', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID }, ['gcs']);

    const set = async (_key: string, _value: unknown, _ttl?: number) =>
      undefined;
    const wrapped = useHooks(set, 'StoreSet_gcs', hooks);
    await wrapped('k1', { foo: 'bar' }, 60);

    expect(states.length).toBe(2);
    expect(states[0].phase).toBe('in');
    expect(states[0].meta).toEqual({
      op: 'set',
      key: 'k1',
      value: { foo: 'bar' },
    });
    expect(states[1].phase).toBe('out');
  });

  test('delete emits in+out', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID }, ['gcs']);

    const del = async (_key: string) => undefined;
    const wrapped = useHooks(del, 'StoreDelete_gcs', hooks);
    await wrapped('k1');

    expect(states.length).toBe(2);
    expect(states[0].meta?.op).toBe('delete');
    expect(states[1].meta?.op).toBe('delete');
  });

  test('get reject emits in+error with normalized message', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID }, ['gcs']);

    const get = async (_key: string): Promise<string> => {
      throw new Error('store kaboom');
    };
    const wrapped = useHooks(get, 'StoreGet_gcs', hooks);
    await expect(wrapped('k1')).rejects.toThrow('store kaboom');
    await Promise.resolve();

    expect(states.length).toBe(2);
    expect(states[0].phase).toBe('in');
    expect(states[1].phase).toBe('error');
    expect(states[1].error?.message).toBe('store kaboom');
  });

  test('get at trace level surfaces value under meta', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(
      emit,
      { flowId: FLOW_ID, level: 'trace' },
      ['gcs'],
    );

    const get = async (_key: string) => 'cached-value';
    const wrapped = useHooks(get, 'StoreGet_gcs', hooks);
    await wrapped('k1');

    const out = states.find((s) => s.phase === 'out');
    expect(out!.meta).toEqual({
      op: 'get',
      key: 'k1',
      value: 'cached-value',
    });
  });
});
