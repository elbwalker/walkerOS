import { createWriteStream as nodeCreateWriteStream } from 'node:fs';
import { mkdir as nodeMkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getByPath, isObject, isThenable, StepError } from '@walkeros/core';
import type { WalkerOS } from '@walkeros/core';
import type { Env, FileWriteStream, Format } from './types';

/**
 * State held per destination instance. Created in init(), reused by
 * push() and destroy(). Keyed by a stable instance id so tests and
 * hot-swap do not share handles across instances.
 */
export interface State {
  handles: Map<string, FileWriteStream>;
  fs: NonNullable<Env['fs']>;
  /** Receives a stream's `error` event (a failed open or write). */
  onError?: (error: unknown) => void;
}

/** The code of a failed file operation (`EACCES`, `ENOSPC`), duck-typed. */
function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error))
    return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

/** A failed file operation as a StepError; the path stays in the cause. */
export function fileError(operation: string, error: unknown): StepError {
  const code = errorCode(error);
  return new StepError(
    `file destination: ${operation} failed${code ? ` (${code})` : ''}`,
    { code: 'transport', cause: error },
  );
}

export function createState(
  env: Env | undefined,
  onError?: (error: unknown) => void,
): State {
  const fsOverride = env?.fs;
  const defaultFs: NonNullable<Env['fs']> = {
    createWriteStream: (path: string, options: { flags: string }) =>
      nodeCreateWriteStream(path, options),
    mkdir: async (path: string, options: { recursive: boolean }) => {
      await nodeMkdir(path, options);
    },
  };
  return {
    handles: new Map(),
    fs: fsOverride ?? defaultFs,
    onError,
  };
}

/**
 * Idempotent open-or-cache. Ensures the parent directory exists and
 * appends to the file via flag 'a' (creates the file if missing).
 * Used by both init() (eager static open) and push() (lazy per-event open).
 */
export async function ensureHandle(
  state: State,
  filename: string,
): Promise<FileWriteStream> {
  const cached = state.handles.get(filename);
  if (cached) return cached;
  await state.fs.mkdir(dirname(filename) || '.', { recursive: true });
  const handle = state.fs.createWriteStream(filename, {
    flags: 'a',
  });
  // An unheard `error` event would crash the process. A broken stream is
  // dropped, so the next event opens the file again.
  handle.on?.('error', (error) => {
    if (state.handles.get(filename) === handle) state.handles.delete(filename);
    state.onError?.(fileError('stream', error));
  });
  state.handles.set(filename, handle);
  return handle;
}

/**
 * Write one line and wait until it is written; a failed write throws. A
 * node stream answers through the callback; an injected writer (tests,
 * simulation) may answer with a promise instead.
 */
export function writeLine(
  handle: FileWriteStream,
  line: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const answer: unknown = handle.write(line, (error) =>
      error ? reject(error) : resolve(),
    );
    if (isThenable(answer)) answer.then(() => resolve(), reject);
  });
}

/**
 * Format an event into a single output line (with trailing newline).
 * One implementation, used by push() for all three formats.
 */
export function serialize(
  event: WalkerOS.Event,
  format: Format,
  fields: string[] | undefined,
): string {
  if (format === 'jsonl') {
    return JSON.stringify(event) + '\n';
  }
  if (!fields || fields.length === 0) {
    throw new Error(
      `file destination: format '${format}' requires non-empty 'fields' setting`,
    );
  }
  const cells = fields.map((path) =>
    formatCell(getByPath(event as unknown as WalkerOS.Properties, path)),
  );
  if (format === 'tsv') {
    return cells.join('\t') + '\n';
  }
  // csv
  return cells.map(csvEscape).join(',') + '\n';
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (isObject(value) || Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}

/**
 * RFC 4180 CSV escaping: wrap in quotes if the value contains
 * comma, quote, CR, or LF; double up internal quotes.
 */
function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Module-level state map keyed by destination instance id. Plan Task 5
 * documents this as the fallback to config-attached symbols. Each
 * destination instance has a unique id; destroy() removes its entry.
 */
const states = new Map<string, State>();

export function registerState(id: string, state: State): void {
  states.set(id, state);
}

export function getState(id: string): State | undefined {
  return states.get(id);
}

export function removeState(id: string): void {
  states.delete(id);
}
