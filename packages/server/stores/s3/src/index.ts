import type { Store, SetupFn } from '@walkeros/core';
import { storeS3Init } from './store';
import { setup } from './setup';
import type { Types } from './types';
import type { S3StoreConfig } from './setup';

export { storeS3Init } from './store';
export { setup, DEFAULT_SETUP } from './setup';
export type { SetupResult, S3StoreConfig } from './setup';
export type {
  S3StoreSettings,
  S3StoreInitSettings,
  S3StoreSetup,
  Types,
} from './types';

/**
 * Default export shape for store packages. The CLI (`walkeros setup store.<id>`)
 * reads `default.setup` to find the lifecycle function; the collector reads
 * `default.init` (or the named export) to construct the runtime instance.
 *
 * Soft breaking change: callers using `import storeS3Init from '@walkeros/server-store-s3'`
 * (default import) must now call `.init` on the returned object. Named imports
 * (`import { storeS3Init }`) are unaffected.
 */
export interface StoreS3Module {
  type: 's3';
  init: Store.Init<Types>;
  setup: SetupFn<S3StoreConfig, Store.BaseEnv>;
}

const storeS3: StoreS3Module = {
  type: 's3',
  init: storeS3Init,
  setup,
};

export default storeS3;
