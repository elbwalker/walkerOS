/**
 * The one place `runneros remote` makes a child process. Every choice about
 * the flow child's process lives here: its environment, its user, its
 * working folder, its heap and its stdio, so a later choice (a user of its
 * own) changes this file only.
 *
 * The child runs as the runner's own user: a name removed from the
 * supervisor's environment stays readable to it in /proc. Removing the
 * walkerOS names stops an inherited environment from carrying the runner's
 * credential, not hostile flow code.
 */

import childProcess from 'child_process';
import { isChildMessage, type ChildStart } from './ipc.js';
import type { ChildHandle } from './supervisor.js';

/** The reserved prefix of the runner's own names. */
const WALKEROS_PREFIX = 'WALKEROS_';

/** The child's environment: the supervisor's without any WALKEROS_ name. */
export function childEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const child: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(env))
    if (!name.startsWith(WALKEROS_PREFIX)) child[name] = value;
  return child;
}

export interface SpawnOptions {
  /** `dist/remote-child.js`. */
  childEntry: string;
  heapMb: number;
  /** The release's extraction folder. */
  cwd: string;
  env: NodeJS.ProcessEnv;
}

/**
 * Forks the flow child and sends it its start message once. The release's
 * secret values travel in that message only, never in the arguments or the
 * environment. A command-line heap flag wins over one in `NODE_OPTIONS`.
 */
export function spawnRemoteChild(
  start: ChildStart,
  options: SpawnOptions,
  fork: typeof childProcess.fork = childProcess.fork,
): ChildHandle {
  const child = fork(options.childEntry, [], {
    env: childEnvironment(options.env),
    cwd: options.cwd,
    execArgv: [`--max-old-space-size=${options.heapMb}`],
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });

  const exitListeners: Array<
    (code: number | null, signal: NodeJS.Signals | null) => void
  > = [];
  let exit: [number | null, NodeJS.Signals | null] | undefined;
  let told = false;
  // The exit is told once the channel has closed as well, so every message
  // the child sent has been read before it.
  const tell = () => {
    if (told || !exit || child.connected) return;
    told = true;
    for (const listener of exitListeners) listener(...exit);
  };
  child.on('exit', (code, signal) => {
    exit = [code, signal];
    tell();
  });
  child.on('disconnect', tell);
  child.on('error', () => {
    // A fork that never started has no exit of its own; any other error
    // (a failed kill) is not an exit, and the child's own exit follows.
    if (child.pid !== undefined || exit) return;
    exit = [1, null];
    tell();
  });

  // A message that cannot be sent (the child is gone) needs no line: a
  // start that never arrives ends the child within 10 s, and an ask that is
  // not answered ends its wait after 1 s.
  const send = (message: Parameters<ChildHandle['send']>[0]) => {
    child.send(message, () => {});
  };
  send(start);

  return {
    send,
    onMessage(listener) {
      child.on('message', (message: unknown) => {
        if (isChildMessage(message)) listener(message);
      });
    },
    onExit(listener) {
      exitListeners.push(listener);
    },
    kill(signal) {
      child.kill(signal);
    },
    get pid() {
      return child.pid;
    },
  };
}
