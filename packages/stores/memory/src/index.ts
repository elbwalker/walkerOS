export { createMemoryStore } from './store';
export { storeMemoryInit } from './init';
export { createMockStore } from './mock';
export { withNamespace } from './namespace';
export type {
  MemoryStoreOptions,
  MemoryStoreConfig,
  MemoryStoreInstance,
} from './types';
export type { MockStoreInstance } from './mock';

export { storeMemoryInit as default } from './init';
