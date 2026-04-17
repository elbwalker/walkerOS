import { getMappingValue, isString, isObject } from '@walkeros/core';
import type { Destination, InitFn, PushFn, Settings } from './types';
import {
  createState,
  ensureHandle,
  getState,
  registerState,
  removeState,
  serialize,
} from './helpers';

export * as DestinationFile from './types';

const init: InitFn = async ({ id, config, env, logger }) => {
  const partial = (config?.settings ?? {}) as Partial<Settings>;
  if (partial.filename === undefined || partial.filename === null) {
    logger.throw(
      "file destination: 'filename' is required (string or Mapping.Value)",
    );
    return false;
  }
  if (
    !isString(partial.filename) &&
    !(isObject(partial.filename) || Array.isArray(partial.filename))
  ) {
    logger.throw(
      "file destination: 'filename' must be a string or a Mapping.Value",
    );
    return false;
  }

  const format = partial.format ?? 'jsonl';
  if (
    (format === 'tsv' || format === 'csv') &&
    (!partial.fields || partial.fields.length === 0)
  ) {
    logger.throw(
      `file destination: format '${format}' requires non-empty 'fields'`,
    );
    return false;
  }

  const settings: Settings = {
    filename: partial.filename,
    format,
    fields: partial.fields,
  };

  const state = createState(env);

  // Eager open for static filename — fail-fast on bad path.
  if (isString(settings.filename)) {
    try {
      await ensureHandle(state, settings.filename);
    } catch (err) {
      logger.throw(
        `file destination: failed to open '${settings.filename}': ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  registerState(id, state);

  return {
    ...config,
    settings,
  };
};

const push: PushFn = async (event, { id, config, collector, logger }) => {
  const settings = config.settings as Settings | undefined;
  if (!settings) {
    logger.warn('file destination: settings missing');
    return;
  }
  const state = getState(id);
  if (!state) {
    logger.warn('file destination: state missing, init may have failed');
    return;
  }

  let filename: string;
  if (isString(settings.filename)) {
    filename = settings.filename;
  } else {
    const resolved = await getMappingValue(event, settings.filename, {
      collector,
    });
    if (!isString(resolved) || resolved.length === 0) {
      logger.warn(
        'file destination: dynamic filename resolved to empty or non-string, dropping event',
      );
      return;
    }
    filename = resolved;
  }

  try {
    const handle = await ensureHandle(state, filename);
    handle.write(serialize(event, settings.format ?? 'jsonl', settings.fields));
  } catch (err) {
    logger.warn(
      `file destination: write failed for ${filename}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
};

export const destinationFile: Destination = {
  type: 'file',

  config: {},

  init,

  push,

  async destroy({ id }) {
    const state = getState(id);
    if (!state) return;
    for (const handle of state.handles.values()) {
      try {
        handle.end();
      } catch {
        // idempotent — ignore end errors on already-closed streams
      }
    }
    state.handles.clear();
    removeState(id);
  },
};

export default destinationFile;
