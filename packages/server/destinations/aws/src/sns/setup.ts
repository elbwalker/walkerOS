import type { DestinationServer } from '@walkeros/server-core';
import type { Env, SendClient, Setup, SetupSubscription, Types } from './types';
import type { LifecycleContext } from '@walkeros/core';
import {
  CreateTopicCommand,
  GetTopicAttributesCommand,
  SubscribeCommand,
} from '@aws-sdk/client-sns';
import { resolveSetup } from '@walkeros/core';
import {
  DEFAULT_REGION,
  firstString,
  isHandlerInstance,
  loadSdkRegion,
  parseTopicArn,
} from '../lib/client';
import { parseCredentials } from '../lib/credentials';
import type { DeliveryTarget } from '../lib/errors';
import type { CallerIdentity, ClientOptions } from './lib/sns';
import { createSnsClient, createStsClient, getCallerIdentity } from './lib/sns';

// Setup is wired to the destination's `setup` slot which uses the broader
// `DestinationServer.Config<Types>` (settings is optional). We runtime-narrow
// instead of using the local Config alias so the assignment in index.ts
// type-checks without contravariance issues.
type WideConfig = DestinationServer.Config<Types>;

// No region default here: an unset `setup.region` falls through to the
// runtime region order, so setup and publish target the same region.
export const DEFAULT_SETUP: Required<Pick<Setup, 'fifoTopic'>> & Setup = {
  fifoTopic: false,
};

export interface SetupResult {
  topicArn: string;
  /** True when the GetTopicAttributes probe returned 404 (topic absent before this run). */
  topicCreated: boolean;
  tagsApplied: number;
  subscriptionsCreated: number;
}

// Module-level caller-identity cache so re-running setup in the same process
// is a no-op for the STS GetCallerIdentity call. Keyed by region (in case
// future versions support cross-region setup in one process).
const identityCache: Map<string, CallerIdentity> = new Map();

/** Test-only: clear the caller-identity cache between test cases. */
export function __resetAccountIdCache(): void {
  identityCache.clear();
}

interface CreateTopicResponse {
  TopicArn?: string;
}

interface AwsErrorMeta {
  name?: string;
  $metadata?: { httpStatusCode?: number };
}

function isAwsError(err: unknown): err is AwsErrorMeta {
  return typeof err === 'object' && err !== null;
}

function isNotFound(err: unknown): boolean {
  if (!isAwsError(err)) return false;
  if (err.name === 'NotFoundException' || err.name === 'NotFound') return true;
  if (err.$metadata && err.$metadata.httpStatusCode === 404) return true;
  return false;
}

function resolveTopicName(name: string, fifo: boolean): string {
  if (fifo) {
    if (name.endsWith('.fifo')) return name;
    return `${name}.fifo`;
  }
  if (name.endsWith('.fifo')) {
    throw new Error(
      `FIFO suffix '.fifo' on standard topic name '${name}'. Set setup.fifoTopic: true or rename the topic.`,
    );
  }
  return name;
}

/**
 * Account id and partition of the setup credentials, from STS once per region.
 * The partition (aws, aws-cn, aws-us-gov) comes from the caller ARN, so the
 * candidate topic ARN is right outside the standard partition too.
 */
async function getIdentity(
  env: Env | undefined,
  options: ClientOptions,
  target: DeliveryTarget,
): Promise<CallerIdentity> {
  const cached = identityCache.get(options.region);
  if (cached) return cached;
  const stsClient = createStsClient(env, options);
  try {
    const identity = await getCallerIdentity(stsClient, env, target);
    identityCache.set(options.region, identity);
    return identity;
  } finally {
    stsClient.destroy?.();
  }
}

function isCreateTopicResponse(v: unknown): v is CreateTopicResponse {
  return typeof v === 'object' && v !== null;
}

function extractTopicArn(res: unknown): string {
  if (isCreateTopicResponse(res) && typeof res.TopicArn === 'string')
    return res.TopicArn;
  throw new Error('SNS CreateTopic returned no TopicArn');
}

function buildSubscribeAttributes(
  sub: SetupSubscription,
): Record<string, string> | undefined {
  const attrs: Record<string, string> = {};
  if (sub.rawMessageDelivery !== undefined) {
    attrs.RawMessageDelivery = String(sub.rawMessageDelivery);
  }
  if (sub.filterPolicy !== undefined) {
    attrs.FilterPolicy = JSON.stringify(sub.filterPolicy);
  }
  if (sub.deadLetterTargetArn !== undefined) {
    attrs.RedrivePolicy = JSON.stringify({
      deadLetterTargetArn: sub.deadLetterTargetArn,
    });
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

async function applyDeclaredSubscriptions(
  client: SendClient,
  env: Env | undefined,
  topicArn: string,
  declared: SetupSubscription[],
): Promise<number> {
  let count = 0;
  for (const sub of declared) {
    const input: {
      TopicArn: string;
      Protocol: string;
      Endpoint: string;
      Attributes?: Record<string, string>;
    } = {
      TopicArn: topicArn,
      Protocol: sub.protocol,
      Endpoint: sub.endpoint,
    };
    const attrs = buildSubscribeAttributes(sub);
    if (attrs) input.Attributes = attrs;
    const Command = env?.AWS?.SubscribeCommand ?? SubscribeCommand;
    await client.send(new Command(input));
    count += 1;
  }
  return count;
}

export async function setup(
  ctx: LifecycleContext<WideConfig, Env | undefined>,
): Promise<SetupResult | undefined> {
  const { config, env, logger } = ctx;
  const merged = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!merged) {
    logger.debug('setup: skipped (config.setup is false or unset)');
    return;
  }

  const settings = config.settings ?? {};
  const arn = settings.topicArn ? parseTopicArn(settings.topicArn) : undefined;
  const topicName = settings.topicName ?? arn?.name;
  if (!topicName) {
    logger.throw(
      'setup: settings.topicName (or settings.topicArn) is required. There is no safe default for the SNS topic name.',
    );
    return;
  }

  const sdkRegion =
    typeof settings.config?.region === 'string'
      ? settings.config.region
      : undefined;
  const region =
    firstString(
      merged.region,
      settings.region,
      arn?.region,
      sdkRegion,
      await loadSdkRegion(),
    ) ?? DEFAULT_REGION;
  const fifo = merged.fifoTopic ?? false;
  const finalName = resolveTopicName(topicName, fifo);
  if (fifo && finalName !== topicName) {
    logger.info(
      `setup: appended .fifo suffix to FIFO topic name '${topicName}' -> '${finalName}'`,
    );
  }

  // Topic-existence probe via candidate ARN derived from STS account ID.
  const options: ClientOptions = {
    region,
    config: settings.config,
    credentials: parseCredentials(config.credentials),
    timeout: config.timeout,
  };
  const client = settings.client ?? createSnsClient(env, options);
  // A client setup built is closed on every path, unless something in it is
  // the user's (their client, or their request handler instance).
  const closesClient =
    !settings.client && !isHandlerInstance(settings.config?.requestHandler);

  try {
    const { accountId, partition } = await getIdentity(env, options, {
      service: 'SNS',
      resource: finalName,
      region,
      id: ctx.id,
    });
    const candidateArn = `arn:${partition}:sns:${region}:${accountId}:${finalName}`;

    let topicCreated = false;
    try {
      const Command =
        env?.AWS?.GetTopicAttributesCommand ?? GetTopicAttributesCommand;
      await client.send(new Command({ TopicArn: candidateArn }));
    } catch (err) {
      if (isNotFound(err)) {
        topicCreated = true;
      } else {
        throw err;
      }
    }

    // Authoritative-apply: full declared state in one CreateTopic call.
    // SNS:CreateTopic is idempotent on identical Name+Attributes+Tags inputs.
    const attributes: Record<string, string> = {};
    if (fifo) {
      attributes.FifoTopic = 'true';
      attributes.ContentBasedDeduplication = 'true';
    }
    if (merged.displayName !== undefined)
      attributes.DisplayName = merged.displayName;
    if (merged.kmsMasterKeyId !== undefined)
      attributes.KmsMasterKeyId = merged.kmsMasterKeyId;

    const tagEntries = merged.tags
      ? Object.entries(merged.tags).map(([Key, Value]) => ({ Key, Value }))
      : undefined;

    const createInput: {
      Name: string;
      Attributes?: Record<string, string>;
      Tags?: Array<{ Key: string; Value: string }>;
    } = { Name: finalName };
    if (Object.keys(attributes).length > 0) createInput.Attributes = attributes;
    if (tagEntries && tagEntries.length > 0) createInput.Tags = tagEntries;

    const CreateCommand = env?.AWS?.CreateTopicCommand ?? CreateTopicCommand;
    const createRes = await client.send(new CreateCommand(createInput));
    const topicArn = extractTopicArn(createRes);

    if (topicCreated) {
      logger.info('setup: topic created', { topicArn, region });
    } else {
      logger.debug('setup: topic exists; declared state re-applied', {
        topicArn,
        region,
      });
    }

    const subscriptionsCreated = await applyDeclaredSubscriptions(
      client,
      env,
      topicArn,
      merged.subscriptions ?? [],
    );

    return {
      topicArn,
      topicCreated,
      tagsApplied: merged.tags ? Object.keys(merged.tags).length : 0,
      subscriptionsCreated,
    };
  } finally {
    if (closesClient) client.destroy?.();
  }
}
