import { mockEnv, Destination, WalkerOS } from '@walkeros/core';

/**
 * Formats captured function calls for display
 *
 * @param calls - Array of captured calls with path and args
 * @param defaultMessage - Message to show when no calls captured
 * @returns Formatted string of function calls
 *
 * @example
 * formatCapturedCalls([
 *   { path: ['window', 'gtag'], args: ['config', 'G-XXX'] }
 * ])
 * // Returns: "gtag('config', 'G-XXX');"
 */
export function formatCapturedCalls(
  calls: Array<{ path: string[]; args: unknown[] }>,
  defaultMessage = 'No function calls captured',
): string {
  if (calls.length === 0) return defaultMessage;

  return calls
    .map(({ path, args }) => {
      const functionName = path[path.length - 1];
      const formattedArgs = args
        .map((arg) => {
          if (typeof arg === 'string') return `'${arg}'`;
          if (typeof arg === 'object' && arg !== null)
            return JSON.stringify(arg, null, 2);
          return String(arg);
        })
        .join(', ');
      return `${functionName}(${formattedArgs});`;
    })
    .join('\n\n');
}

/**
 * Creates a capture function for destination init method
 * Uses walkerOS core mockEnv to intercept function calls
 *
 * @param destination - Destination instance with init method
 * @param destinationEnv - Destination's exported env (usually examples.env.push)
 * @returns Async function that executes init and returns formatted output
 *
 * @example
 * import destinationGtag, { examples } from '@walkeros/web-destination-gtag';
 *
 * const captureFn = captureDestinationInit(destinationGtag, examples.env.push);
 *
 * // Use in DestinationInitDemo
 * <DestinationInitDemo
 *   destination={destinationGtag}
 *   settings={{ measurementId: 'G-XXX' }}
 *   fn={captureFn}
 * />
 */
export function captureDestinationInit(
  destination: Destination.Instance,
  destinationEnv: unknown,
) {
  return async (context: Destination.Context): Promise<string> => {
    if (!destination.init) {
      return 'No init method found';
    }

    const calls: Array<{ path: string[]; args: unknown[] }> = [];

    // Use walkerOS core mockEnv to intercept all function calls
    const testEnv = mockEnv(
      (destinationEnv || {}) as Record<string, unknown>,
      (path, args) => {
        calls.push({ path, args });
      },
    );

    await destination.init({ ...context, env: testEnv } as Destination.Context);

    return formatCapturedCalls(calls, 'Destination initialized successfully');
  };
}

/**
 * Creates a capture function for destination push method
 * Uses walkerOS core mockEnv to intercept function calls
 *
 * @param destination - Destination instance with push method
 * @param destinationEnv - Destination's exported env (usually examples.env.push)
 * @returns Async function that executes push and returns formatted output
 *
 * @example
 * import destinationGtag, { examples } from '@walkeros/web-destination-gtag';
 * import { getEvent } from '@walkeros/core';
 *
 * const captureFn = captureDestinationPush(destinationGtag, examples.env.push);
 *
 * // Use in DestinationDemo
 * <DestinationDemo
 *   destination={destinationGtag}
 *   event={getEvent('order complete')}
 *   mapping={examples.mapping.purchase}
 *   fn={captureFn}
 * />
 */
export function captureDestinationPush(
  destination: Destination.Instance,
  destinationEnv: unknown,
) {
  return async (
    event: WalkerOS.Event,
    context: Destination.PushContext,
  ): Promise<string> => {
    const calls: Array<{ path: string[]; args: unknown[] }> = [];

    // Use walkerOS core mockEnv to intercept all function calls
    const testEnv = mockEnv(
      (destinationEnv || {}) as Record<string, unknown>,
      (path, args) => {
        calls.push({ path, args });
      },
    );

    // Call the real destination push with intercepted env
    await destination.push(event, { ...context, env: testEnv });

    return formatCapturedCalls(calls);
  };
}

/**
 * Advanced: Creates a raw capture function that returns call data
 * Use this when you need custom formatting or processing of calls
 *
 * @param destinationEnv - Destination's exported env
 * @returns Function that returns both env and getCalls function
 *
 * @example
 * const { env, getCalls } = createRawCapture(examples.env.push);
 * await destination.init({ ...context, env });
 * const calls = getCalls();
 * // Process calls as needed
 */
export function createRawCapture(destinationEnv: unknown) {
  const calls: Array<{ path: string[]; args: unknown[] }> = [];

  const testEnv = mockEnv(
    (destinationEnv || {}) as Record<string, unknown>,
    (path, args) => {
      calls.push({ path, args });
    },
  );

  return {
    env: testEnv,
    getCalls: () => calls,
  };
}
