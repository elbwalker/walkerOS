import type { Flow } from '@walkeros/core';
import { isObject, isThenable, parseCallPath } from '@walkeros/core';

/**
 * The network boundary the runner and the conformance kit control: the
 * global `fetch`, for web and server alike (`sendServer` runs on it), and on
 * a web step's page (`Flow.StepPage`, from `@walkeros/web-core/dev`) the
 * page's own transports, which answer through `record`. Each is replaced
 * for the duration of one run and restored after it. Every request is
 * answered by the boundary and recorded, so a request that never shows up
 * here escaped it (its own `https.request`).
 */

/** One request the boundary answered. */
export interface Request {
  effect: Flow.StepEffect;
  /** The run phase when it was made (`init` or `push`). */
  phase: string;
  settled: boolean;
}

export interface Boundary {
  requests: Request[];
  /** The phase recorded with each request; the kit sets `init` during init. */
  phase: string;
  /** The page the step runs on, opened on this boundary's `record`. */
  page?: Flow.StepPageSession;
  /** Requests whose answer is still outstanding. */
  pending(): number;
  restore(): void;
}

type Answers = (index: number) => Flow.StepAnswer;

type BodyMethod<K extends keyof Response> = ReturnType<
  Extract<Response[K], () => unknown>
>;

/** A Response the boundary answers with; jsdom has no fetch API of its own. */
class KitResponse implements Response {
  readonly headers = new Headers();
  readonly redirected = false;
  readonly type: Response['type'] = 'basic';
  readonly url = '';
  readonly body = null;
  readonly bodyUsed = false;
  readonly ok: boolean;

  constructor(
    private readonly content: string,
    readonly status: number,
    readonly statusText: string,
  ) {
    this.ok = status >= 200 && status < 300;
  }

  clone(): Response {
    return new KitResponse(this.content, this.status, this.statusText);
  }
  text(): Promise<string> {
    return Promise.resolve(this.content);
  }
  json(): Promise<unknown> {
    return Promise.resolve().then(() => JSON.parse(this.content));
  }
  arrayBuffer(): BodyMethod<'arrayBuffer'> {
    return Promise.reject(new Error('Not supported by the kit boundary'));
  }
  blob(): BodyMethod<'blob'> {
    return Promise.reject(new Error('Not supported by the kit boundary'));
  }
  bytes(): BodyMethod<'bytes'> {
    return Promise.reject(new Error('Not supported by the kit boundary'));
  }
  formData(): BodyMethod<'formData'> {
    return Promise.reject(new Error('Not supported by the kit boundary'));
  }
}

function bodyText(body: unknown): string {
  if (body === undefined) return '';
  return typeof body === 'string' ? body : JSON.stringify(body);
}

function urlOf(input: string | URL | { url: string }): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** The request init as recorded: without the abort signal, a transport detail. */
function recordedInit(init?: RequestInit): Record<string, unknown> | undefined {
  if (!init) return undefined;
  const recorded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(init))
    if (key !== 'signal' && value !== undefined) recorded[key] = value;
  return recorded;
}

const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function abortError(): Error {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

/**
 * Replace one global property for a run; returns its restore. A property
 * that did not exist is deleted again.
 */
function replace(target: object, key: string, value: unknown): () => void {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    value,
    configurable: true,
    writable: true,
  });
  return () => {
    if (original) Object.defineProperty(target, key, original);
    else Reflect.deleteProperty(target, key);
  };
}

/**
 * Install the boundary; `answers(n)` answers the n-th request (0-based). With
 * a page, the step's page is opened on it and closed at restore.
 */
export function installBoundary(
  answers: Answers = () => ({}),
  page?: Flow.StepPage,
): Boundary {
  const requests: Request[] = [];
  const closers: Array<() => void> = [];
  const restores: Array<() => void> = [];
  const boundary: Boundary = {
    requests,
    phase: 'push',
    pending: () => requests.filter((request) => !request.settled).length,
    restore: () => {
      closers.splice(0).forEach((close) => close());
      restores.splice(0).forEach((restore) => restore());
    },
  };

  const track = (effect: Flow.StepEffect): [Request, Flow.StepAnswer] => {
    const request: Request = { effect, phase: boundary.phase, settled: false };
    const answer = answers(requests.length);
    requests.push(request);
    return [request, answer];
  };

  const record: Flow.StepRecord = (effect) => {
    const [request, answer] = track(effect);
    return {
      answer,
      settle: () => {
        request.settled = true;
      },
    };
  };

  const kitFetch = (
    input: string | URL | { url: string },
    init?: RequestInit,
  ): Promise<Response> => {
    const initRecord = recordedInit(init);
    const [request, answer] = track(
      initRecord
        ? ['fetch', urlOf(input), initRecord]
        : ['fetch', urlOf(input)],
    );

    return new Promise<Response>((resolve, reject) => {
      const fail = (error: Error) => {
        request.settled = true;
        reject(error);
      };
      init?.signal?.addEventListener('abort', () => fail(abortError()));
      // At restore an unanswered request fails, so nothing waits forever.
      closers.push(() => {
        if (!request.settled) fail(abortError());
      });
      if (answer.error === 'timeout') return;

      const settle = () => {
        if (request.settled) return;
        if (answer.error === 'network') {
          fail(new TypeError('fetch failed'));
          return;
        }
        request.settled = true;
        resolve(
          new KitResponse(
            bodyText(answer.body),
            answer.status ?? 200,
            answer.statusText ?? '',
          ),
        );
      };
      if (answer.late) macrotask().then(settle);
      else settle();
    });
  };

  // Opened first: a page that cannot open leaves nothing replaced.
  const opened = page?.open(record);
  restores.push(replace(globalThis, 'fetch', kitFetch));
  if (opened) {
    boundary.page = opened;
    restores.push(() => opened.close());
  }

  return boundary;
}

/** One recorded call on the SDK boundary (an examples env path). */
export interface EnvCall {
  fn: string;
  args: unknown[];
  phase: string;
  settled: boolean;
}

/** How the SDK boundary answers a call: pass it on, reject it or delay it. */
export type EnvAnswer =
  | { kind: 'pass' }
  | { kind: 'reject'; error: Error }
  | { kind: 'hang' }
  | { kind: 'late' };

export interface EnvBoundary {
  env: Record<string, unknown>;
  calls: EnvCall[];
  phase: string;
  pending(): number;
}

interface Tracked {
  rest: string[];
  fn: string;
}

type Callable = (...args: unknown[]) => unknown;

function isCallable(value: unknown): value is Callable {
  return typeof value === 'function';
}

/**
 * A view of an examples env whose declared `simulation` paths are the SDK
 * boundary: each call on one is recorded and answered as `answer` says (the
 * original mock runs, rejects, never settles or settles one macrotask late).
 * After a function, a path continues on its result or constructed instance,
 * as `observeEnv` reads it.
 */
export function answerEnv(
  env: Record<string, unknown>,
  paths: string[],
  answer: (index: number) => EnvAnswer = () => ({ kind: 'pass' }),
): EnvBoundary {
  const calls: EnvCall[] = [];
  const boundary: EnvBoundary = {
    env: {},
    calls,
    phase: 'push',
    pending: () => calls.filter((call) => !call.settled).length,
  };

  const tracked: Tracked[] = [];
  for (const raw of paths) {
    const segments = parseCallPath(raw);
    if (segments.length)
      tracked.push({ rest: segments, fn: segments.join('.') });
  }

  const select = (all: Tracked[], key: string) => {
    const leafs: string[] = [];
    const deeper: Tracked[] = [];
    for (const t of all) {
      if (t.rest[0] !== key) continue;
      if (t.rest.length === 1) leafs.push(t.fn);
      else deeper.push({ rest: t.rest.slice(1), fn: t.fn });
    }
    return { leafs, deeper };
  };

  const leaf = (fn: Callable, name: string): Callable =>
    function (this: unknown, ...args: unknown[]) {
      const call: EnvCall = {
        fn: name,
        args,
        phase: boundary.phase,
        settled: false,
      };
      const reply = answer(calls.length);
      calls.push(call);
      const settle = <V>(value: V): V => {
        call.settled = true;
        return value;
      };
      if (reply.kind === 'reject') {
        call.settled = true;
        return Promise.reject(reply.error);
      }
      if (reply.kind === 'hang') return new Promise(() => undefined);
      if (reply.kind === 'late')
        return macrotask().then(() => settle(Reflect.apply(fn, this, args)));
      const result: unknown = Reflect.apply(fn, this, args);
      if (isThenable(result))
        return Promise.resolve(result).then(settle, (error: unknown) => {
          call.settled = true;
          throw error;
        });
      return settle(result);
    };

  const view = (value: unknown, next: Tracked[]): unknown => {
    if (next.length === 0) return value;
    if (isThenable(value))
      return Promise.resolve(value).then((resolved) => view(resolved, next));
    if (isCallable(value))
      return new Proxy(value, {
        apply: (target, thisArg, args) =>
          view(Reflect.apply(target, thisArg, args), next),
        construct: (target, args, newTarget) => {
          const instance: unknown = Reflect.construct(target, args, newTarget);
          const viewed = view(instance, next);
          return isObject(viewed) ? viewed : {};
        },
      });
    if (isObject(value))
      return new Proxy(value, {
        get: (target, key, receiver) => {
          const property: unknown = Reflect.get(target, key, receiver);
          if (typeof key !== 'string') return property;
          const { leafs, deeper } = select(next, key);
          if (leafs.length && isCallable(property))
            return leaf(property, leafs[0]);
          return view(property, deeper);
        },
      });
    return value;
  };

  const viewed = view(env, tracked);
  boundary.env = isObject(viewed) ? viewed : env;
  return boundary;
}
