import type { Env, FileWriteStream } from '../types';

/**
 * Captured file state for assertions in tests.
 */
export interface CapturedFile {
  filename: string;
  lines: string[];
  ended: boolean;
}

// Narrow helper type aliases so the mock fs is typed explicitly without `any`.
type CreateWriteStreamFn = (
  path: string,
  options: { flags: string },
) => FileWriteStream;
type MkdirFn = (path: string, options: { recursive: boolean }) => Promise<void>;

export interface SpyState {
  captured: Map<string, CapturedFile>;
  mkdirCalls: string[];
}

export interface SpyEnv extends Env {
  _spy: SpyState;
}

function makeSpyEnv(): SpyEnv {
  const state: SpyState = {
    captured: new Map(),
    mkdirCalls: [],
  };

  const createWriteStream: CreateWriteStreamFn = (path) => {
    const existing = state.captured.get(path);
    const file: CapturedFile = existing ?? {
      filename: path,
      lines: [],
      ended: false,
    };
    if (!existing) state.captured.set(path, file);
    const stream: FileWriteStream = {
      write(chunk) {
        file.lines.push(chunk);
        return true;
      },
      end() {
        file.ended = true;
      },
    };
    return stream;
  };

  const mkdir: MkdirFn = async (path) => {
    state.mkdirCalls.push(path);
  };

  return {
    _spy: state,
    fs: {
      createWriteStream,
      mkdir,
    },
  };
}

export const init: SpyEnv = makeSpyEnv();
export const push: SpyEnv = makeSpyEnv();
