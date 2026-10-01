import type { FirehoseClientConfig } from '@aws-sdk/client-firehose';
import type { AwsCredentials } from '../../lib/credentials';
import type { SendClient } from '../../lib/client';
import type { FirehoseClientConstructor } from '../types';
import { requestHandlerOptions } from '../../lib/client';

/** Firehose stream names: 1 to 64 letters, digits, `_`, `.` or `-`. */
export const STREAM_NAME_PATTERN = /^[a-zA-Z0-9_.-]{1,64}$/;

export interface ClientOptions {
  region: string;
  /** Raw SDK options from `settings.config`. Never mutated. */
  config?: FirehoseClientConfig;
  /** Parsed `config.credentials`; wins over `config.credentials` of the SDK options. */
  credentials?: AwsCredentials;
  /** The collector's race, `config.timeout`. */
  timeout?: number;
}

/**
 * Builds the client the destination owns. The per-attempt timeout is added
 * only when the user passed no `requestHandler` of their own.
 */
export function createClient(
  Client: FirehoseClientConstructor,
  options: ClientOptions,
): SendClient {
  const clientConfig: FirehoseClientConfig = {
    ...options.config,
    region: options.region,
  };
  if (options.credentials) clientConfig.credentials = options.credentials;
  if (clientConfig.requestHandler === undefined)
    clientConfig.requestHandler = requestHandlerOptions(options.timeout);

  return new Client(clientConfig);
}
