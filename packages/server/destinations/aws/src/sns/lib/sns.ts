import type { SNSClientConfig } from '@aws-sdk/client-sns';
import type { STSClientConfig } from '@aws-sdk/client-sts';
import { SNSClient } from '@aws-sdk/client-sns';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { isObject } from '@walkeros/core';
import type { AwsCredentials } from '../../lib/credentials';
import type { SendClient } from '../../lib/client';
import type { DeliveryTarget } from '../../lib/errors';
import type { Env } from '../types';
import { isHandlerInstance, requestHandlerOptions } from '../../lib/client';
import { fromSdkError } from '../../lib/errors';

export interface ClientOptions {
  region: string;
  /** Raw SDK options from `settings.config`. Never mutated. */
  config?: SNSClientConfig;
  /** Parsed `config.credentials`; wins over the credentials of the SDK options. */
  credentials?: AwsCredentials;
  /** The collector's race, `config.timeout`. */
  timeout?: number;
}

/**
 * The options of a client this package builds: the region, the credentials
 * slot, and the per-attempt timeout unless the user passed a handler.
 */
export function clientConfig(options: ClientOptions): SNSClientConfig {
  const resolved: SNSClientConfig = {
    ...options.config,
    region: options.region,
  };
  if (options.credentials) resolved.credentials = options.credentials;
  if (resolved.requestHandler === undefined)
    resolved.requestHandler = requestHandlerOptions(options.timeout);
  return resolved;
}

/** Builds the SNS client the destination owns, from env or the SDK. */
export function createSnsClient(
  env: Env | undefined,
  options: ClientOptions,
): SendClient {
  const Client = env?.AWS?.SNSClient ?? SNSClient;
  return new Client(clientConfig(options));
}

/**
 * Builds the STS client for the account lookup, from env or the SDK. It shares
 * the region and credentials of the SNS client, never its endpoint (an SNS
 * endpoint does not answer STS) and never a user's handler instance (the
 * lookup client is closed after one call).
 *
 * One attempt only: the lookup runs before the first publish of a
 * `topicName`-only config, and one attempt of a quarter of `config.timeout`
 * plus the publish's own three still end inside the collector's race. A
 * failed lookup is not cached, so the next publish asks again.
 */
export function createStsClient(
  env: Env | undefined,
  options: ClientOptions,
): SendClient {
  const Client = env?.AWS?.STSClient ?? STSClient;
  const config: STSClientConfig = { region: options.region };
  const credentials = options.credentials ?? options.config?.credentials;
  if (credentials) config.credentials = credentials;
  const userHandler = options.config?.requestHandler;
  config.requestHandler =
    userHandler === undefined || isHandlerInstance(userHandler)
      ? requestHandlerOptions(options.timeout)
      : userHandler;
  config.maxAttempts = 1;
  return new Client(config);
}

/** Account id and partition of the caller, from `GetCallerIdentity`. */
export interface CallerIdentity {
  accountId: string;
  partition: string;
}

/** Asks STS who the credentials belong to. One call, no retry of its own. */
export async function getCallerIdentity(
  client: SendClient,
  env: Env | undefined,
  target: DeliveryTarget,
): Promise<CallerIdentity> {
  const Command =
    env?.AWS?.GetCallerIdentityCommand ?? GetCallerIdentityCommand;
  let response: unknown;
  try {
    response = await client.send(new Command({}));
  } catch (error) {
    throw fromSdkError(error, target);
  }

  if (!isObject(response) || typeof response.Account !== 'string')
    throw fromSdkError(
      new Error('STS GetCallerIdentity returned no Account.'),
      target,
    );

  // The caller ARN carries the partition (aws, aws-cn, aws-us-gov).
  const arn = typeof response.Arn === 'string' ? response.Arn : '';
  const partition = arn.split(':')[1] || 'aws';
  return { accountId: response.Account, partition };
}
