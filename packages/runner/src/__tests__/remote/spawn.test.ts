import { ChildProcess, type ForkOptions } from 'child_process';
import type childProcess from 'child_process';
import type { ChildMessage, ChildStart } from '../../remote/ipc.js';
import { childEnvironment, spawnRemoteChild } from '../../remote/spawn.js';

const start: ChildStart = {
  type: 'start',
  instanceId: '3f9a2b7c1d4e5f60',
  sequence: 17,
  flowFile: '/tmp/walkeros-abc/releases/17/flow.mjs',
  folder: '/tmp/walkeros-abc',
  port: 8080,
  values: { API_KEY: 'delivered-value-v17' },
  known: ['delivered-value-v17'],
};

const env: NodeJS.ProcessEnv = {
  PATH: '/usr/bin',
  SALT: 'server-salt-value',
  WALKEROS_CREDENTIAL: 'wos_cred_runner-credential-value',
  WALKEROS_CACHE_DIR: '/tmp/walkeros-cache',
  WALKEROS_X: 'x',
};

/** A fork that records its call and answers an unspawned child process. */
function fakeFork() {
  const calls: Array<{
    modulePath: string | URL;
    args: readonly string[] | ForkOptions | undefined;
    options: ForkOptions | undefined;
  }> = [];
  const sent: unknown[] = [];
  const child = new ChildProcess();
  child.send = jest.fn((message: unknown) => {
    sent.push(message);
    return true;
  });
  const fork: typeof childProcess.fork = (
    modulePath: string | URL,
    args?: readonly string[] | ForkOptions,
    options?: ForkOptions,
  ) => {
    calls.push({ modulePath, args, options });
    return child;
  };
  return { fork, calls, sent, child };
}

describe('childEnvironment', () => {
  it('drops every WALKEROS_ name and keeps the others', () => {
    expect(childEnvironment(env)).toEqual({
      PATH: '/usr/bin',
      SALT: 'server-salt-value',
    });
  });
});

describe('spawnRemoteChild', () => {
  const options = {
    childEntry: '/app/dist/remote-child.js',
    heapMb: 324,
    cwd: '/tmp/walkeros-abc/releases/17',
    env,
  };

  it('forks the entry with the child environment, the folder, the heap and an IPC slot, and no other user', () => {
    const { fork, calls } = fakeFork();

    spawnRemoteChild(start, options, fork);

    expect(calls).toHaveLength(1);
    const [{ modulePath, args, options: forked }] = calls;
    expect(modulePath).toBe('/app/dist/remote-child.js');
    expect(args).toEqual([]);
    expect(forked?.env).toEqual({
      PATH: '/usr/bin',
      SALT: 'server-salt-value',
    });
    expect(forked?.cwd).toBe('/tmp/walkeros-abc/releases/17');
    expect(forked?.execArgv?.[forked.execArgv.length - 1]).toBe(
      '--max-old-space-size=324',
    );
    expect(forked?.stdio).toEqual(['ignore', 'inherit', 'inherit', 'ipc']);
    expect(forked).not.toHaveProperty('uid');
    expect(forked).not.toHaveProperty('gid');
  });

  it('sends the start once, the only place the values travel', () => {
    const { fork, calls, sent } = fakeFork();

    spawnRemoteChild(start, options, fork);

    expect(sent).toEqual([start]);
    expect(JSON.stringify(calls)).not.toContain('delivered-value-v17');
  });

  it('passes on only the messages that hold the child shape', () => {
    const { fork, child } = fakeFork();
    const handle = spawnRemoteChild(start, options, fork);
    const received: ChildMessage[] = [];
    handle.onMessage((message) => received.push(message));

    child.emit('message', { type: 'ready', extra: 'ignored' });
    child.emit('message', { type: 'report', reason: 'boasting' });
    child.emit('message', 'ready');

    expect(received).toEqual([{ type: 'ready', extra: 'ignored' }]);
  });

  it('tells of the exit once the channel has closed too, so every message came first', () => {
    const { fork, child } = fakeFork();
    Object.defineProperty(child, 'connected', {
      value: true,
      configurable: true,
    });
    const handle = spawnRemoteChild(start, options, fork);
    const exits: Array<[number | null, NodeJS.Signals | null]> = [];
    handle.onExit((code, signal) => exits.push([code, signal]));

    child.emit('exit', 0, null);
    expect(exits).toEqual([]);
    Object.defineProperty(child, 'connected', { value: false });
    child.emit('disconnect');

    expect(exits).toEqual([[0, null]]);
  });

  it('tells of a fork that never started as an exit with code 1', () => {
    const { fork, child } = fakeFork();
    const handle = spawnRemoteChild(start, options, fork);
    const exits: Array<[number | null, NodeJS.Signals | null]> = [];
    handle.onExit((code, signal) => exits.push([code, signal]));

    child.emit('error', new Error('spawn EAGAIN'));

    expect(exits).toEqual([[1, null]]);
  });
});
