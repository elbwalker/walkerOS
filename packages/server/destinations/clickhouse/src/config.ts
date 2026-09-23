import type {
  ClickHouseClientConfigOptions,
  ClickHouseSettings,
} from '@clickhouse/client';
import type { Logger } from '@walkeros/core';
import { createClient } from '@clickhouse/client';
import type {
  ClickHouseClientFactory,
  Config,
  Credentials,
  Env,
  InitSettings,
  PartialConfig,
  Settings,
} from './types';

/** Database written to when a flow names none. */
export const DEFAULT_DATABASE = 'default';

/** Table written to when a flow names none. */
export const DEFAULT_TABLE = 'events';

/** Retries added on top of the first attempt when a flow names none. */
export const DEFAULT_MAX_RETRIES = 1;

/** The collector's own per-delivery race, used when `config.timeout` is unset. */
export const DEFAULT_TIMEOUT_MS = 10_000;

/** Delay before the first retry. Every further retry doubles it. */
export const RETRY_BASE_DELAY_MS = 250;

/** Highest multiplier the retry jitter can apply to a single delay. */
export const RETRY_JITTER_MAX = 1.5;

/** Floor for the derived per-attempt timeout. */
export const MIN_REQUEST_TIMEOUT_MS = 1_000;

/**
 * `maxRetries` as the retry mechanism agrees to read it: a whole, finite count,
 * never negative. Everything else means no retries at all.
 *
 * A flow's config arrives as JSON and reaches the resolution helpers without
 * passing the schema, so `int().min(0)` does not stand between a config file and
 * this code. `JSON.parse('{"maxRetries": 1e999}')` yields `Infinity`, which
 * would spin the budget loop below inside `init`, on the collector's startup
 * path. `NaN` is quieter and reaches the client as a `request_timeout` of `NaN`.
 *
 * Every part of the retry mechanism normalizes through this one function, so the
 * budget the timeout was derived from and the loop that spends it cannot
 * disagree about what a valid count is.
 */
export function normalizeMaxRetries(maxRetries: number): number {
  return Number.isFinite(maxRetries) ? Math.max(0, Math.floor(maxRetries)) : 0;
}

/**
 * How long to wait before the retry at `retry`, counting the first retry as 0:
 * the base delay doubled once per retry, scaled by the jitter.
 *
 * The retry loop and the budget below call this same function, so what the
 * per-attempt timeout was derived from and what the loop actually waits cannot
 * drift apart. A loop passes its own drawn jitter; the budget takes the default,
 * which is the largest jitter that can be drawn.
 */
export function retryDelay(
  retry: number,
  jitter: number = RETRY_JITTER_MAX,
): number {
  return RETRY_BASE_DELAY_MS * 2 ** retry * jitter;
}

/**
 * Longest total time the retry delays alone can take: every one of the
 * `maxRetries` delays at its longest jittered length. The delays sit between
 * the `1 + maxRetries` attempts, so they spend the same budget the attempts do.
 *
 * The delays double, so they pass what a float can hold after about a thousand
 * of them and the total stops changing. Returning at that point bounds the loop
 * for any count at all, without inventing a maximum number of retries.
 */
export function retryDelayBudget(maxRetries: number): number {
  const retries = normalizeMaxRetries(maxRetries);
  let budget = 0;

  for (let retry = 0; retry < retries; retry += 1) {
    budget += retryDelay(retry);

    if (!Number.isFinite(budget)) return budget;
  }

  return budget;
}

/**
 * Per-request timeout for the client, derived so that every attempt and every
 * retry delay finishes inside the collector's race.
 *
 * The client's own default is 30 s, three times the collector's 10 s. Left
 * there, the collector stops waiting at 10 s, dead-letters the batch and counts
 * it lost while the client is still sending, and the rows land at 12 s anyway:
 * a batch counted lost and actually written. Splitting what the delays leave
 * over across the attempts keeps the last attempt finishing first.
 *
 * The floor keeps a short timeout or a high retry count from deriving a useless
 * or negative value. Such a configuration cannot fit its own retries either
 * way, and the collector's race is what bounds it there. Once the floor fires,
 * the attempts and their delays add up to more than `timeout`, and the
 * collector cuts the later attempts off when it stops waiting.
 */
export function resolveRequestTimeout(
  timeout: number,
  maxRetries: number,
): number {
  // Both arguments are normalized rather than trusted. A retry count of NaN
  // would otherwise carry straight through the arithmetic into a
  // `request_timeout` of NaN, and a non-finite timeout into one of Infinity:
  // a hung insert the collector can only end by dead-lettering the batch.
  const retries = normalizeMaxRetries(maxRetries);
  const attempts = retries + 1;

  return Math.max(
    MIN_REQUEST_TIMEOUT_MS,
    Math.floor(
      (resolveTimeout(timeout) - retryDelayBudget(retries)) / attempts,
    ),
  );
}

/**
 * The collector's per-delivery race, as this destination reads it: a positive,
 * finite number of milliseconds, or the collector's own default.
 */
export function resolveTimeout(timeout?: number): number {
  if (timeout === undefined || !Number.isFinite(timeout) || timeout <= 0)
    return DEFAULT_TIMEOUT_MS;

  return timeout;
}

/**
 * ClickHouse settings sent with every insert.
 *
 * `async_insert: 0` keeps the server's acknowledgement tied to a durable write.
 * An async insert is acknowledged before the data reaches the table, and an
 * error raised at the later flush has no way back to the caller, so a lost
 * write would neither retry nor reach the dead letter queue. The server-side
 * default is documented inconsistently, so the value travels explicitly.
 *
 * `input_format_skip_unknown_fields: 0` and `input_format_null_as_default: 0`
 * turn the server's silent repairs off. Both are on by default: the first drops
 * a JSON key the table does not know, the second rewrites an explicit null into
 * the column default. A walkerOS field missing from a partner's table would
 * disappear with no error and no warning, found weeks later in reporting. At 0
 * the whole batch fails loudly, is attributed and reaches the counters.
 *
 * A flow's own `clickhouseSettings` sit on top of all three.
 */
const INSERT_SETTINGS: ClickHouseSettings = {
  async_insert: 0,
  input_format_skip_unknown_fields: 0,
  input_format_null_as_default: 0,
};

/** The per-insert settings, with a flow's own `clickhouseSettings` on top. */
export function resolveInsertSettings(
  custom?: ClickHouseSettings,
): ClickHouseSettings {
  return { ...INSERT_SETTINGS, ...custom };
}

/**
 * The host of an endpoint, with any userinfo left behind.
 *
 * A url is one of the places a password can legitimately sit
 * (`https://user:pass@host:port`), so the configured string is never safe to
 * put in a log line and only the host ever is. A url the client would reject
 * still reaches here when the factory comes from `env`, which parses nothing.
 */
function endpointHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unparsed';
  }
}

/** The resolved settings before init attaches the live client. */
type ResolvedSettings = Omit<Settings, 'client'>;

function withDefaults(
  settings: InitSettings,
  logger: Logger.Instance,
): ResolvedSettings {
  const { url, clickhouse } = settings;

  if (!url) return logger.throw('Config settings url missing');

  return {
    url,
    database: settings.database || DEFAULT_DATABASE,
    table: settings.table || DEFAULT_TABLE,
    maxRetries: settings.maxRetries ?? DEFAULT_MAX_RETRIES,
    ...(clickhouse && { clickhouse }),
    clickhouseSettings: resolveInsertSettings(settings.clickhouseSettings),
  };
}

/**
 * The options `createClient` receives, merged lowest layer first:
 *
 * 1. `settings.clickhouse`, the raw SDK passthrough.
 * 2. The derived defaults, `request_timeout` and request compression, each
 *    applied only where the passthrough left its key unset.
 * 3. `url` and `database`, the destination's own first-class settings. They
 *    always win: an insert names only the table, so a passthrough `database`
 *    that disagreed would move every row to a different database in silence.
 * 4. `credentials`, the strictly typed slot backed by a managed secret. It wins
 *    over a username or password left in the passthrough; with the slot empty
 *    the passthrough reaches the client untouched.
 *
 * The table, the retry count and the per-insert settings are not client
 * options and stay off this object.
 */
export function resolveClientOptions(
  settings: ResolvedSettings,
  credentials: Credentials | undefined,
  timeout: number,
): ClickHouseClientConfigOptions {
  const options: ClickHouseClientConfigOptions = { ...settings.clickhouse };

  if (options.request_timeout === undefined)
    options.request_timeout = resolveRequestTimeout(
      timeout,
      settings.maxRetries,
    );

  // Both directions are off by default in this client. Compressing the request
  // is the one that pays here: insert bodies are large, repetitive JSON.
  if (options.compression === undefined)
    options.compression = { request: true };

  options.url = settings.url;
  options.database = settings.database;

  if (credentials) {
    options.username = credentials.username;
    options.password = credentials.password;
  }

  return options;
}

/**
 * Resolves the config init hands forward, and creates the one client every
 * insert reuses. Nothing is queried: a missing table surfaces at the first
 * insert, as a loud, attributable failure.
 */
export function getConfig(
  config: PartialConfig,
  env: Env | undefined,
  logger: Logger.Instance,
): Config {
  const { settings } = config;

  if (!settings) return logger.throw('Config settings missing');

  const resolved = withDefaults(settings, logger);
  const options = resolveClientOptions(
    resolved,
    config.credentials,
    resolveTimeout(config.timeout),
  );

  const factory: ClickHouseClientFactory =
    env?.ClickHouseClient || createClient;
  const client = factory(options);

  // Every credential stays out of this line deliberately, the url included:
  // init is the one place that holds them, and a debug log is the easiest way
  // to spill them.
  logger.debug('ClickHouse client created', {
    host: endpointHost(resolved.url),
    database: resolved.database,
    table: resolved.table,
  });

  return { ...config, settings: { ...resolved, client } };
}

/**
 * The settings the insert path works with.
 *
 * Core resolves `Config.settings` from the init slot, so a push receives the
 * settings as a user wrote them: the client optional, the defaults unapplied.
 * This narrows them once. It guards that init ran and re-applies the defaults,
 * so the insert path holds a live client and a complete configuration without
 * guarding field by field.
 */
export function resolveSettings(
  config: PartialConfig,
  logger: Logger.Instance,
): Settings {
  const { settings } = config;

  if (!settings) return logger.throw('Config settings missing, init() not run');

  const { client } = settings;

  if (!client) return logger.throw('ClickHouse client missing, init() not run');

  return { ...withDefaults(settings, logger), client };
}
