import { StepError } from '@walkeros/core';
import type { Store } from '@walkeros/core';

export interface Client {
  read(key: string): Promise<Store.StoreValue | undefined>;
  write(key: string, value: Store.StoreValue): Promise<void>;
  remove(key: string): Promise<void>;
}

type Types = Store.Types<{ bucket?: string }, { client?: Client }>;

function clientOf(env: { client?: Client }): Client {
  if (!env.client)
    throw new StepError('Store client missing', { code: 'config' });
  return env.client;
}

/** Reports a failed read as a StepError, never as a miss. */
export const remote: Store.Init<Types> = ({ config, env }) => {
  if (!config.settings?.bucket)
    throw new StepError('Config settings bucket missing', { code: 'config' });
  const fail = (error: unknown): never => {
    throw new StepError('Store request failed', {
      code: 'transport',
      cause: error,
    });
  };
  return {
    type: 'remote',
    config,
    get: (key) => clientOf(env).read(key).catch(fail),
    set: (key, value) => clientOf(env).write(key, value).catch(fail),
    delete: (key) => clientOf(env).remove(key).catch(fail),
  };
};

/** Turns a failed read into a miss: the failure is silent (item 2). */
export const missing: Store.Init<Types> = async (context) => {
  const store = await remote(context);
  return {
    ...store,
    get: async (key) => {
      try {
        return await store.get(key);
      } catch {
        return undefined;
      }
    },
  };
};
