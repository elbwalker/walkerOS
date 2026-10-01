import type { Logger } from '@walkeros/core';
import { FirehoseClient } from '@aws-sdk/client-firehose';
import { isObject } from '@walkeros/core';
import type {
  Config,
  CredentialSource,
  Env,
  FirehoseConfig,
  InitSettings,
  PartialConfig,
  Settings,
} from './types';
import {
  DEFAULT_REGION,
  InFlight,
  firstString,
  isHandlerInstance,
  loadSdkRegion,
} from '../lib/client';
import { parseCredentials } from '../lib/credentials';
import { configError } from '../lib/errors';
import { STREAM_NAME_PATTERN, createClient } from './lib/firehose';

/**
 * Equal as written in a flow: the same value, or plain objects and arrays with
 * equal contents. Anything else (a client, a provider function, a handler
 * instance) is equal only to itself.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  if (!isObject(a) || !isObject(b)) return false;
  if (!isPlain(a) || !isPlain(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => key in b && sameValue(a[key], b[key]))
  );
}

function isPlain(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Reads a flat key and its deprecated `settings.firehose` alias. Both set to
 * different values throws: a silent winner could route events to the wrong
 * stream after a half-done migration.
 */
function pick<K extends keyof FirehoseConfig>(
  key: K,
  flat: FirehoseConfig[K],
  alias: FirehoseConfig[K],
): FirehoseConfig[K] {
  if (flat !== undefined && alias !== undefined && !sameValue(flat, alias))
    throw configError(
      `Firehose: settings.${key} and settings.firehose.${key} are both set and differ. Remove settings.firehose.`,
    );
  return flat ?? alias;
}

/**
 * Resolves the settings once, offline: no credentials are loaded and no AWS
 * call is made. The caller's config is never mutated.
 */
export async function getConfig(
  partialConfig: PartialConfig = {},
  env: Env | undefined,
  logger: Logger.Instance,
): Promise<Config> {
  const input: InitSettings = partialConfig.settings ?? {};
  const alias: FirehoseConfig = input.firehose ?? {};

  const streamName = pick('streamName', input.streamName, alias.streamName);
  const sdkConfig = pick('config', input.config, alias.config);
  const userClient = pick('client', input.client, alias.client);
  const regionSetting = pick('region', input.region, alias.region);

  if (!streamName)
    throw configError(
      'Firehose: settings.streamName is missing. Set it to the name of your Firehose stream.',
    );
  if (!STREAM_NAME_PATTERN.test(streamName))
    throw configError(
      `Firehose: settings.streamName "${streamName}" is not a valid stream name. Use 1 to 64 letters, digits, "_", "." or "-".`,
    );

  const sdkRegion =
    typeof sdkConfig?.region === 'string' ? sdkConfig.region : undefined;
  const region =
    firstString(regionSetting, sdkRegion, await loadSdkRegion()) ??
    DEFAULT_REGION;

  const credentials = parseCredentials(partialConfig.credentials);
  const credentialSource: CredentialSource = userClient
    ? 'client'
    : credentials
      ? 'config.credentials'
      : sdkConfig?.credentials !== undefined
        ? 'settings.config.credentials'
        : 'default chain';

  const client =
    userClient ??
    createClient(env?.AWS?.FirehoseClient ?? FirehoseClient, {
      region,
      config: sdkConfig,
      credentials,
      timeout: partialConfig.timeout,
    });

  const settings: Settings = {
    streamName,
    region,
    newline: input.newline !== false,
    client,
    runtime: {
      ownsClient: !userClient && !isHandlerInstance(sdkConfig?.requestHandler),
      inflight: new InFlight(),
      credentialSource,
    },
  };
  if (sdkConfig) settings.config = sdkConfig;

  logger.debug('Firehose client ready', {
    stream: streamName,
    region,
    credentials: credentialSource,
  });

  return { ...partialConfig, settings };
}

/**
 * Narrows the settings a push receives. Core types them as the slot a user
 * writes, so the fields `init` set are optional there.
 */
export function resolveSettings(settings: InitSettings | undefined): Settings {
  const { streamName, region, client, runtime } = settings ?? {};
  if (!streamName || !region || !client || !runtime)
    throw configError('Firehose: the destination was not initialized.');
  return {
    streamName,
    region,
    newline: settings?.newline !== false,
    client,
    runtime,
  };
}
