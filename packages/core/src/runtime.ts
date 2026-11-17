import { ENV_MARKER_PREFIX, SECRET_MARKER_PREFIX } from './flow';
import { REF_CODE_PREFIX } from './references';

/**
 * Runtime contracts between a server artifact and the runner that starts it.
 */

/**
 * How long the collector's `shutdown` command may take, counted from its
 * start: every phase and the last Observe report share it. Under Cloud Run's
 * 10 s grace, with a second left for the runner to exit.
 */
export const SHUTDOWN_DEADLINE_MS = 8000;

/** The named export of a server artifact that lists the names its flow reads. */
export const DECLARED_ENV_EXPORT = '__walkerosEnv';

/**
 * The environment names a server flow reads: every deferred `$secret` name
 * and every deferred `$env` name, each list sorted and unique.
 */
export interface DeclaredEnv {
  secrets: string[];
  env: string[];
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

export function isDeclaredEnv(value: unknown): value is DeclaredEnv {
  return (
    typeof value === 'object' &&
    value !== null &&
    'secrets' in value &&
    isStringArray(value.secrets) &&
    'env' in value &&
    isStringArray(value.env)
  );
}

/**
 * Collect the deferred markers of a resolved flow config (`getFlowSettings`
 * with `deferred: true`), read the way the bundler turns them into
 * `process.env` reads: a secret marker is a whole string, env markers may sit
 * anywhere in a string, and a `$code:` value is emitted as code, so a marker
 * in it is never read. Object keys are emitted as written and hold none.
 */
export function declaredEnvOf(config: unknown): DeclaredEnv {
  const secrets = new Set<string>();
  const env = new Set<string>();
  // Built per call, not at module load, so a bundle that never calls this
  // keeps no regex construction from it.
  const envMarker = new RegExp(
    ENV_MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '([a-zA-Z_][a-zA-Z0-9_]*)',
    'g',
  );

  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      if (value.startsWith(REF_CODE_PREFIX)) return;
      if (value.startsWith(SECRET_MARKER_PREFIX)) {
        secrets.add(value.slice(SECRET_MARKER_PREFIX.length));
        return;
      }
      for (const match of value.matchAll(envMarker)) env.add(match[1]);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object' && value !== null)
      Object.values(value).forEach(visit);
  };
  visit(config);

  return { secrets: [...secrets].sort(), env: [...env].sort() };
}

/**
 * Names the runner never sets from a delivered secret: the process, the shell,
 * Node, the dynamic loader, the network path (proxies, TLS trust) and the
 * runner's own settings.
 */
export const RESERVED_ENV_NAMES: readonly string[] = [
  'NODE_ENV',
  'NODE_OPTIONS',
  'PATH',
  'HOME',
  'USER',
  'HOSTNAME',
  'SHELL',
  'LANG',
  'TERM',
  'TZ',
  'TMPDIR',
  'PORT',
  'BUNDLE',
  'CACHE_DIR',
  'HEARTBEAT_INTERVAL',
  'XDG_CACHE_HOME',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'no_proxy',
  'all_proxy',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
];

/**
 * Prefixes of reserved names, matched case-sensitively. `LD_` and `DYLD_`
 * steer the dynamic loader of every process a step spawns.
 */
export const RESERVED_ENV_PREFIXES: readonly string[] = [
  'WALKEROS_',
  'NODE_',
  'NPM_',
  'LD_',
  'DYLD_',
];

export function isReservedEnvName(name: string): boolean {
  return (
    RESERVED_ENV_NAMES.includes(name) ||
    RESERVED_ENV_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}
