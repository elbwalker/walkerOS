/**
 * The one way `runneros remote` reaches the app. The supervisor uses only
 * what this returns: the origin, the deployment, the headers per request and
 * the reader of a release's secret set. Nothing else in `remote/` reads the
 * environment for the link, the deployment or the token.
 *
 * This body links by the runner's environment: the app URL, the deployment
 * id and a bearer token, the names `runneros start` reads, and a secret set
 * in plain JSON. The supervisor depends on the `AppLink` shape alone, so
 * another way to link changes this file only.
 */

import type { Authorize, Logger } from '@walkeros/core';
import type { KnownValues } from '@walkeros/core/node';
import { isRecord, jsonOf } from './json.js';
import { ReleaseRefusal } from './release-document.js';

export interface AppLink {
  /** The app's origin. Every request goes there, and to no other host but the archive's one redirect, sent without credentials. */
  readonly origin: string;
  /** The runner's own deployment: the document check and the high-water mark use it. */
  readonly deploymentId: string;
  /** The headers one request needs. */
  readonly authorize: Authorize;
  /** A release's secret values for this runner, checked to name this deployment and this sequence; throws ReleaseRefusal 'secret-set'. */
  readSecretSet(
    bytes: Uint8Array,
    expect: { deployment: string; sequence: number },
  ): Record<string, string>;
  /** Stops what the link runs. */
  close(): void;
}

/** The app's deployment ids: `dep_` and its id alphabet. */
const DEPLOYMENT_ID = /^dep_[a-z0-9]{1,64}$/;

/** A token as one header value carries it: visible ASCII, no space. */
const HEADER_TOKEN = /^[\x21-\x7E]+$/;

/** Every name this link reads; each is removed from the environment. */
const LINK_NAMES = [
  'WALKEROS_APP_URL',
  'WALKEROS_DEPLOYMENT_ID',
  'WALKEROS_DEPLOY_TOKEN',
  'WALKEROS_TOKEN',
] as const;

function originOf(url: string | undefined): string {
  if (!url) throw new Error('WALKEROS_APP_URL is not set');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('WALKEROS_APP_URL is not an http or https URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    throw new Error('WALKEROS_APP_URL is not an http or https URL');
  return parsed.origin;
}

function deploymentOf(id: string | undefined): string {
  if (!id) throw new Error('WALKEROS_DEPLOYMENT_ID is not set');
  if (!DEPLOYMENT_ID.test(id))
    throw new Error(
      'WALKEROS_DEPLOYMENT_ID is not a deployment id (dep_ and 1 to 64 lowercase letters or digits)',
    );
  return id;
}

/**
 * A secret set in plain JSON, `{ deployment, sequence, values }`, that names
 * this deployment and this sequence, with a string per value.
 */
function readPlainSecretSet(
  bytes: Uint8Array,
  expect: { deployment: string; sequence: number },
): Record<string, string> {
  const refused = new ReleaseRefusal('secret-set', expect.sequence);
  const set = jsonOf(bytes);
  if (
    !isRecord(set) ||
    set.deployment !== expect.deployment ||
    set.sequence !== expect.sequence ||
    !isRecord(set.values)
  )
    throw refused;
  const entries: Array<[string, string]> = [];
  for (const [name, value] of Object.entries(set.values)) {
    if (typeof value !== 'string') throw refused;
    entries.push([name, value]);
  }
  // Built from the entries, so a name such as `__proto__` stays a value of
  // its own instead of being dropped by an assignment.
  return Object.fromEntries(entries);
}

/**
 * Read the link once, then remove what was read from `env`, so no child
 * inherits it. The names are removed before a missing or malformed one
 * throws, so a refused start leaves none behind either. The token joins
 * `knownValues` as it is read, so no line shows it.
 */
export function appLinkFromEnvironment(options: {
  env: NodeJS.ProcessEnv;
  logger: Logger.Instance;
  knownValues: KnownValues;
}): AppLink {
  const { env } = options;
  const read = {
    url: env.WALKEROS_APP_URL,
    deployment: env.WALKEROS_DEPLOYMENT_ID,
    // The order of `runneros start`: an empty deploy token counts as unset.
    token: env.WALKEROS_DEPLOY_TOKEN || env.WALKEROS_TOKEN,
    tokenName: env.WALKEROS_DEPLOY_TOKEN
      ? 'WALKEROS_DEPLOY_TOKEN'
      : 'WALKEROS_TOKEN',
  };
  for (const name of LINK_NAMES) delete env[name];

  const origin = originOf(read.url);
  const deploymentId = deploymentOf(read.deployment);
  const { token } = read;
  if (!token)
    throw new Error('WALKEROS_DEPLOY_TOKEN and WALKEROS_TOKEN are not set');
  // A header value HTTP cannot carry would fail every request as a transport
  // failure: refused here, naming the variable, never the value.
  if (!HEADER_TOKEN.test(token))
    throw new Error(
      `${read.tokenName} holds a character an HTTP header cannot carry`,
    );
  options.knownValues.add([token]);
  const headers = { Authorization: `Bearer ${token}` };

  return {
    origin,
    deploymentId,
    authorize: async () => ({ ...headers }),
    readSecretSet: readPlainSecretSet,
    close() {},
  };
}
