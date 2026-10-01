import {
  loadConfig,
  NODE_REGION_CONFIG_FILE_OPTIONS,
  NODE_REGION_CONFIG_OPTIONS,
} from '@smithy/core/config';

/** Region used when neither the flow nor the environment names one. */
export const DEFAULT_REGION = 'eu-central-1';

/** The collector's per-delivery race when `config.timeout` is unset. */
export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Share of `config.timeout` one SDK attempt may take. The SDK standard retry
 * makes up to three attempts; at a quarter each, three attempts plus the SDK's
 * longest documented waits end before the collector stops waiting.
 */
export const REQUEST_TIMEOUT_SHARE = 0.25;

/**
 * The part of an AWS SDK v3 client this package calls: `send` with a command,
 * and `destroy` on a client it created. The SDK clients satisfy it, and so
 * does an injected mock (tests, simulate) without a cast.
 */
export interface SendClient {
  send(command: object): Promise<unknown>;
  destroy?(): void;
}

/**
 * True for a request handler instance (anything with a `handle` method), as
 * opposed to handler options. An instance the user passed belongs to the
 * user: a client closed by this package would close its sockets too.
 */
export function isHandlerInstance(handler: unknown): boolean {
  return (
    typeof handler === 'object' &&
    handler !== null &&
    'handle' in handler &&
    typeof handler.handle === 'function'
  );
}

/** `requestHandler` options for a client this package builds. */
export interface RequestHandlerOptions {
  requestTimeout: number;
  throwOnRequestTimeout: true;
}

/** The collector's race as this package reads it: positive and finite. */
export function resolveTimeout(timeout?: number): number {
  if (timeout === undefined || !Number.isFinite(timeout) || timeout <= 0)
    return DEFAULT_TIMEOUT_MS;
  return timeout;
}

/**
 * Per-attempt timeout for a client this package builds. Without it the SDK
 * waits on a hung request forever (its default is 0, off), so the retry it
 * keeps never fires and the collector's race is the only bound.
 */
export function requestHandlerOptions(timeout?: number): RequestHandlerOptions {
  return {
    requestTimeout: Math.floor(resolveTimeout(timeout) * REQUEST_TIMEOUT_SHARE),
    throwOnRequestTimeout: true,
  };
}

/** The parts of an SNS topic ARN this package reads. */
export interface TopicArn {
  region: string;
  accountId: string;
  name: string;
}

/** Parses `arn:<partition>:sns:<region>:<account>:<name>`. */
export function parseTopicArn(arn: string): TopicArn | undefined {
  const parts = arn.split(':');
  if (parts.length !== 6) return undefined;
  const [prefix, partition, service, region, accountId, name] = parts;
  if (prefix !== 'arn' || !partition || service !== 'sns') return undefined;
  if (!region || !accountId || !name) return undefined;
  return { region, accountId, name };
}

/**
 * The region the SDK would pick on its own: `AWS_REGION`, else the active
 * profile's `region`. Local files and variables only, never the network.
 * `undefined` when neither names one.
 */
export async function loadSdkRegion(): Promise<string | undefined> {
  try {
    const region = await loadConfig(
      NODE_REGION_CONFIG_OPTIONS,
      NODE_REGION_CONFIG_FILE_OPTIONS,
    )();
    return typeof region === 'string' && region.length > 0 ? region : undefined;
  } catch {
    return undefined;
  }
}

/** The first non-empty string, used for the region order. */
export function firstString(
  ...candidates: Array<string | undefined>
): string | undefined {
  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && candidate.length > 0,
  );
}

/**
 * Tracks the sends an instance has in flight, so `destroy` can let them land
 * before it closes the client under them.
 */
export class InFlight {
  private readonly pending = new Set<Promise<unknown>>();

  track<T>(promise: Promise<T>): Promise<T> {
    this.pending.add(promise);
    const remove = () => {
      this.pending.delete(promise);
    };
    promise.then(remove, remove);
    return promise;
  }

  get size(): number {
    return this.pending.size;
  }

  /** Resolves once every tracked send settled, whatever its outcome. */
  async settle(): Promise<void> {
    while (this.pending.size > 0) {
      await Promise.allSettled([...this.pending]);
    }
  }
}
