import {
  createWriteStream as nodeCreateWriteStream,
  type WriteStream,
} from 'node:fs';
import { mkdir as nodeMkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getByPath, isObject } from '@walkeros/core';
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
}

export function createState(env: Env | undefined): State {
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
  }) as FileWriteStream | WriteStream;
  state.handles.set(filename, handle);
  return handle;
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
