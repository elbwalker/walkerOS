import type { Ingest, Simulation, WalkerOS } from '@walkeros/core';
import type { BundleStats, PushResult } from '@walkeros/cli';

/**
 * The capability seam between the flow tools and the machine they run on.
 *
 * Every file read, URL fetch, bundle, simulation and push a tool performs goes
 * through a `FlowRuntime` and nothing else, so the runtime alone decides what
 * the process it lives in may do:
 *
 * - `createLocalRuntime()` keeps every capability. It is for the user's own
 *   machine (stdio, the developer CLI), where the user is responsible for what
 *   runs there.
 * - `createHostedRuntime(client)` is least privilege for a shared, network
 *   reached process: it loads inline JSON and saved flow ids only, refuses
 *   local paths and URLs, and has no `bundle`, `simulate` or `push` at all.
 *
 * A tool whose operation the runtime does not provide refuses with a hint that
 * names only out-of-process routes.
 */
export interface FlowRuntime {
  /**
   * Resolve a config input to parsed JSON. Local: a file path, an http(s) URL
   * or inline JSON. Hosted: inline JSON or a saved `flow_`/`cfg_` id; a local
   * path or URL is refused with a `RuntimeRefusal`.
   */
  load(input: string): Promise<unknown>;
  /** Compile a flow. Absent on a runtime that must not build in its process. */
  bundle?(input: string, opts: BundleOptions): Promise<BundleStats | void>;
  /** Build and run one step of a flow. Absent where that must not happen. */
  simulate?(input: string, opts: SimulateOptions): Promise<Simulation.Result>;
  /** Build and run a flow against real destinations. Absent where forbidden. */
  push?(
    input: string,
    event: Record<string, unknown>,
    opts: PushOptions,
  ): Promise<PushResult>;
}

export interface BundleOptions {
  flowName?: string;
  stats?: boolean;
  output?: string;
}

export type SimulateStepType =
  | 'source'
  | 'transformer'
  | 'collector'
  | 'destination';

export interface SimulateOptions {
  stepType: SimulateStepType;
  stepId: string;
  event: unknown;
  flow?: string;
  /**
   * Transformer, collector and destination steps: pipeline context the step
   * reads via `ctx.ingest`. Source steps ignore it.
   */
  ingest?: Omit<Ingest, '_meta'>;
  /** Collector steps only: state snapshot seeded before enrichment runs. */
  state?: {
    consent?: WalkerOS.Consent;
    user?: WalkerOS.User;
    globals?: WalkerOS.Properties;
    timing?: number;
  };
}

export interface PushOptions {
  flow?: string;
  platform?: 'web' | 'server';
}

/**
 * Thrown by a runtime when it refuses an input on principle rather than on a
 * fault. Carries the hint a tool should surface next to the message.
 */
export class RuntimeRefusal extends Error {
  readonly hint: string;

  constructor(message: string, hint: string) {
    super(message);
    this.name = 'RuntimeRefusal';
    this.hint = hint;
  }
}

/** The hint for a refused runtime error, or a tool's own fallback otherwise. */
export function refusalHint(error: unknown, fallback: string): string {
  return error instanceof RuntimeRefusal ? error.hint : fallback;
}

/**
 * Every route named here runs outside the tool's process: the app's own deploy
 * pipeline and simulation surface, or the caller's own machine. A refused
 * caller is never pointed at another in-process route, such as saving the
 * flow and simulating it by id, which would be the same execution one step
 * later.
 */
export const HINT_OUT_OF_PROCESS =
  'Build and deploy through the app with deploy_manage, or simulate the flow in the app. On your own machine, use the walkerOS CLI.';

/** The refusal a tool raises when its runtime does not provide an operation. */
export function unavailableOperation(
  operation: 'bundle' | 'simulate' | 'push',
): RuntimeRefusal {
  const verb =
    operation === 'bundle'
      ? 'Bundling'
      : operation === 'simulate'
        ? 'Simulating'
        : 'Running';
  return new RuntimeRefusal(
    `${verb} a flow is not available on the hosted walkerOS MCP server.`,
    HINT_OUT_OF_PROCESS,
  );
}
