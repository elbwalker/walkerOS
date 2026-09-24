import { parseCallPath } from './observeEnv';

/**
 * Test helper for a step package's dev examples env: every declared
 * `simulation` path must resolve against the package's own `push` mock env,
 * so simulate records the vendor call instead of silently recording nothing.
 *
 * Stricter than the recorder's wrap-time check: it walks each path through
 * the mock. A segment is looked up as a property first; when it is not a
 * property of a function, the function is constructed (or, when it is not a
 * constructor, called) with no arguments, a Promise result is awaited, and
 * the walk continues on the result. The final leaf must be a function. So a
 * typo behind a constructor or factory (`PubSub.topik.publishMessage`) fails.
 * Throws with the offending paths; resolves silently otherwise.
 *
 * @example
 * it('declares simulation paths that resolve', () =>
 *   expectSimulationResolves(examples.env));
 */
export async function expectSimulationResolves(env: {
  push?: object;
  simulation?: string[];
}): Promise<void> {
  const simulation = env.simulation ?? [];
  if (simulation.length === 0) return;
  const push = env.push;
  if (!push) {
    throw new Error(
      `simulation declares ${simulation.join(', ')} but the examples env has no push mock`,
    );
  }

  const failed: string[] = [];
  for (const raw of simulation) {
    const segments = parseCallPath(raw);
    const reason =
      segments.length === 0 ? 'malformed path' : await walkPath(push, segments);
    if (reason) failed.push(`${raw} (${reason})`);
  }
  if (failed.length > 0) {
    throw new Error(
      `simulation paths do not resolve against the push mock env: ${failed.join(', ')}`,
    );
  }
}

type Callable = (...args: unknown[]) => unknown;

function isCallable(value: unknown): value is Callable {
  return typeof value === 'function';
}

/** Walk one path through the mock; returns why it failed, or undefined. */
async function walkPath(
  root: object,
  segments: string[],
): Promise<string | undefined> {
  let parent: unknown = undefined;
  let current: unknown = root;
  for (const segment of segments) {
    if (isCallable(current) && !(segment in current)) {
      try {
        current = await invoke(current, parent);
      } catch (err) {
        return `calling before "${segment}" threw: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    if (
      (typeof current !== 'object' && typeof current !== 'function') ||
      current === null ||
      !(segment in current)
    ) {
      return `"${segment}" not found`;
    }
    parent = current;
    current = Reflect.get(current, segment);
  }
  return typeof current === 'function' ? undefined : 'leaf is not a function';
}

/**
 * Construct a class or constructor function; call anything that is not a
 * constructor (arrow functions, methods, async factories). When both fail,
 * the constructor's own error is the one reported.
 */
async function invoke(fn: Callable, self: unknown): Promise<unknown> {
  let result: unknown;
  try {
    result = Reflect.construct(fn, []);
  } catch (constructError) {
    try {
      result = Reflect.apply(fn, self, []);
    } catch {
      throw constructError;
    }
  }
  return await result;
}
