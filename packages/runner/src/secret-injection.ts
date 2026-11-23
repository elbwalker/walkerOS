/**
 * Which delivered secrets the runner sets in its environment. One source per
 * name: a name the flow reads from the app is never also set by the host, so
 * the runner never overwrites a variable, and it never sets a name that steers
 * the process, Node, the network path or the runner itself.
 */

import {
  isReservedEnvName,
  type DeclaredEnv,
  type RefusalCheck,
} from '@walkeros/core';

export type SecretRefusal = Extract<
  RefusalCheck,
  'secret-in-env' | 'secret-reserved' | 'secret-missing'
>;

export interface InjectionPlan {
  /** Names to set, with their delivered values. */
  set: Record<string, string>;
  /** Delivered names the flow does not read: not set. */
  notDeclared: string[];
  /** Names that refuse the boot, each with its reason. */
  refused: Array<{ name: string; reason: SecretRefusal }>;
}

/**
 * The value of `name` in `env`: an own string property only. The
 * environment inherits from Object.prototype, so `env['__proto__']` and
 * `env['constructor']` are an object and a function, never a variable.
 */
function envValue(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = Object.hasOwn(env, name) ? env[name] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function isDeclared(name: string, declared: DeclaredEnv): boolean {
  return declared.secrets.includes(name) || declared.env.includes(name);
}

/**
 * Plan the injection of the delivered secrets `fetched` for an artifact that
 * declares the names its flow reads (`declared`), or for one built before the
 * declaration existed (`undefined`), where every delivered name counts as
 * declared. Per name: not declared, not set; reserved, `secret-reserved`;
 * already in `env` with any value, the empty string included, `secret-in-env`;
 * else set.
 */
export function planSecretInjection(
  fetched: Readonly<Record<string, string>>,
  declared: DeclaredEnv | undefined,
  env: NodeJS.ProcessEnv,
): InjectionPlan {
  const plan: InjectionPlan = { set: {}, notDeclared: [], refused: [] };
  for (const [name, value] of Object.entries(fetched)) {
    if (declared && !isDeclared(name, declared)) plan.notDeclared.push(name);
    else if (isReservedEnvName(name))
      plan.refused.push({ name, reason: 'secret-reserved' });
    else if (envValue(env, name) !== undefined)
      plan.refused.push({ name, reason: 'secret-in-env' });
    else plan.set[name] = value;
  }
  return plan;
}

/**
 * The values the runner masks: every delivered value, and the environment
 * value of every name the flow declares, since the runner cannot tell a
 * credential read through `$env` from a plain setting.
 */
export function knownValuesOf(
  fetched: Readonly<Record<string, string>>,
  declared: DeclaredEnv | undefined,
  env: NodeJS.ProcessEnv,
): string[] {
  const values = Object.values(fetched);
  if (!declared) return values;
  for (const name of [...declared.secrets, ...declared.env]) {
    const value = envValue(env, name);
    if (value !== undefined) values.push(value);
  }
  return values;
}

/** The boot error for refused names: each name and its reason, no value. */
export function refusalMessage(refused: InjectionPlan['refused']): string {
  return `Secrets refused: ${refused
    .map(({ name, reason }) => `${name} (${reason})`)
    .join(', ')}`;
}

/** Refused names as an error, so a caller can read them, not only the text. */
export class SecretRefusalError extends Error {
  constructor(readonly refused: InjectionPlan['refused']) {
    super(refusalMessage(refused));
    this.name = 'SecretRefusalError';
  }
}

/**
 * Check a release's secret names against the environment its flow would
 * start in, before anything of the release runs: at a swap and on every load
 * from the cache. Per name: reserved, in either list, `secret-reserved` (the
 * flow could not read it, and the app must never set it); a walkerOS name
 * (`app`) already set, the empty string included, `secret-in-env`, since one
 * name has one source; a server name not set, `secret-missing`. A server name
 * set to the empty string counts as set, as a set name does for the
 * injection.
 */
export function checkReleaseSecrets(
  secrets: { app: readonly string[]; server: readonly string[] },
  env: NodeJS.ProcessEnv,
): InjectionPlan['refused'] {
  const refused: InjectionPlan['refused'] = [];
  for (const name of secrets.app) {
    if (isReservedEnvName(name))
      refused.push({ name, reason: 'secret-reserved' });
    else if (envValue(env, name) !== undefined)
      refused.push({ name, reason: 'secret-in-env' });
  }
  for (const name of secrets.server) {
    if (isReservedEnvName(name))
      refused.push({ name, reason: 'secret-reserved' });
    else if (envValue(env, name) === undefined)
      refused.push({ name, reason: 'secret-missing' });
  }
  return refused;
}

/** The values of the named server secrets that are set, for masking. */
export function serverSecretValues(
  names: readonly string[],
  env: NodeJS.ProcessEnv,
): string[] {
  const values: string[] = [];
  for (const name of names) {
    const value = envValue(env, name);
    if (value !== undefined) values.push(value);
  }
  return values;
}
