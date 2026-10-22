import { getMappingValue, isString, isObject, StepError } from '@walkeros/core';
import type {
  Destination,
  FileWriteStream,
  InitFn,
  PushFn,
  Settings,
} from './types';
import {
  createState,
  ensureHandle,
  fileError,
  getState,
  registerState,
  removeState,
  serialize,
  writeLine,
} from './helpers';

export * as DestinationFile from './types';

const init: InitFn = async ({ id, config, env, reportError }) => {
  const partial: Partial<Settings> = config?.settings ?? {};
  if (partial.filename === undefined || partial.filename === null)
    throw new StepError('Config settings filename missing', {
      code: 'config',
    });
  if (
    !isString(partial.filename) &&
    !(isObject(partial.filename) || Array.isArray(partial.filename))
  )
    throw new StepError(
      'Config settings filename must be a string or a Mapping.Value',
      { code: 'config' },
    );

  const format = partial.format ?? 'jsonl';
  if (
    (format === 'tsv' || format === 'csv') &&
    (!partial.fields || partial.fields.length === 0)
  )
    throw new StepError(
      `Config settings format '${format}' requires non-empty fields`,
      { code: 'config' },
    );

  const settings: Settings = {
    filename: partial.filename,
    format,
    fields: partial.fields,
  };

  const state = createState(env, reportError);

  // Eager open for static filename: a bad path shows at startup.
  if (isString(settings.filename)) {
    try {
      await ensureHandle(state, settings.filename);
    } catch (err) {
      throw new StepError(`file destination: failed to open the file`, {
        code: 'config',
        cause: err,
      });
    }
  }

  registerState(id, state);

  return {
    ...config,
    settings,
  };
};

// A silent rule has no line of its own: nothing to write.
const push: PushFn = async (event, context) => {
  if (!context.rule?.silent) await write(event, context);
};

const write: PushFn = async (event, { id, config, collector }) => {
  const settings = config.settings;
  const state = getState(id);
  if (!settings || !state)
    throw new StepError('file destination: not initialized', {
      code: 'not-ready',
    });

  let filename: string;
  if (isString(settings.filename)) {
    filename = settings.filename;
  } else {
    const resolved = await getMappingValue(event, settings.filename, {
      collector,
    });
    if (!isString(resolved) || resolved.length === 0)
      throw new StepError(
        'file destination: the filename mapping resolved to no name',
        { code: 'missing-input' },
      );
    filename = resolved;
  }

  let handle: FileWriteStream;
  try {
    handle = await ensureHandle(state, filename);
  } catch (err) {
    throw fileError('open', err);
  }
  try {
    await writeLine(
      handle,
      serialize(event, settings.format ?? 'jsonl', settings.fields),
    );
  } catch (err) {
    throw fileError('write', err);
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
