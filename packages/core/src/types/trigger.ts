/**
 * Trigger — unified interface for invoking any walkerOS step in simulation
 * and testing. Every package exports a `createTrigger` factory from its
 * examples that conforms to `Trigger.CreateFn`.
 *
 * Usage:
 *   const { flow, trigger } = await createTrigger(initConfig);
 *   const result = await trigger(type?, options?)(content);
 *
 * @packageDocumentation
 */

import type { Collector, Elb } from '.';

/** Flow access handle returned by createTrigger. */
export interface FlowHandle {
  /** The collector instance created by startFlow. */
  collector: Collector.Instance;
  /** The elb push function for direct event injection. */
  elb: Elb.Fn;
}

/** What createTrigger returns — a flow handle (lazy) and a trigger function. */
export interface Instance<TContent = unknown, TResult = unknown> {
  /** Flow handle — undefined until first trigger() call, then stable. */
  readonly flow: FlowHandle | undefined;
  trigger: Fn<TContent, TResult>;
}

/**
 * Curried trigger function — always async.
 *
 * First call selects mechanism (type) and configures it (options).
 * Second call fires with content and returns result.
 *
 * @example
 * // Browser source — click trigger
 * trigger('click', 'button.cta')('<button data-elb="cta">Sign Up</button>')
 *
 * // Express source — POST request
 * trigger('POST')({ path: '/collect', body: { name: 'page view' } })
 *
 * // DataLayer — default mechanism
 * trigger()(['event', 'purchase', { value: 25.42 }])
 */
export type Fn<TContent = unknown, TResult = unknown> = (
  type?: string,
  options?: unknown,
) => (content: TContent) => Promise<TResult>;

/**
 * Factory function exported by each package's examples.
 *
 * Receives full Collector.InitConfig. Does NOT call startFlow eagerly —
 * startFlow is deferred to the first trigger() invocation (lazy init).
 * The flow property uses a getter to read the closure variable live.
 * createTrigger itself stays async for consistency (other packages may
 * need await during setup). Config is passed through UNMODIFIED —
 * validation is startFlow's job.
 *
 * @example
 * // Package exports:
 * export const createTrigger: Trigger.CreateFn<HTMLContent, void> = async (config) => {
 *   let flow: Trigger.FlowHandle | undefined;
 *
 *   const trigger: Trigger.Fn<HTMLContent, void> = (type?, options?) => async (content) => {
 *     // Pre-startFlow work (e.g., inject HTML for browser source)
 *     // ...
 *
 *     // Lazy init — only on first call
 *     if (!flow) flow = await startFlow(config);
 *
 *     // Post-startFlow work (e.g., dispatch click event)
 *     // ...
 *   };
 *
 *   return {
 *     get flow() { return flow; },
 *     trigger,
 *   };
 * };
 */
export type CreateFn<TContent = unknown, TResult = unknown> = (
  config: Collector.InitConfig,
  options?: unknown,
) => Promise<Instance<TContent, TResult>>;
