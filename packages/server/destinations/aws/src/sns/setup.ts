import type { DestinationServer } from '@walkeros/server-core';
import type { Env, Setup, SetupSubscription, Settings, Types } from './types';
import type { LifecycleContext } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type { SNSClient as SNSClientType } from '@aws-sdk/client-sns';

// Setup is wired to the destination's `setup` slot which uses the broader
// `DestinationServer.Config<Types>` (settings is optional). We runtime-narrow
// instead of using the local Config alias so the assignment in index.ts
// type-checks without contravariance issues.
type WideConfig = DestinationServer.Config<Types>;

export const DEFAULT_SETUP: Required<Pick<Setup, 'region' | 'fifoTopic'>> &
  Setup = {
  region: 'eu-central-1',
  fifoTopic: false,
};

export interface SetupResult {
  topicArn: string;
  /** True when the GetTopicAttributes probe returned 404 (topic absent before this run). */
  topicCreated: boolean;
  tagsApplied: number;
  subscriptionsCreated: number;
}

// Module-level account-ID cache so re-running setup in the same process is
// a no-op for the STS GetCallerIdentity call. Keyed by region (in case
// future versions support cross-region setup in one process).
const accountIdCache: Map<string, string> = new Map();

/** Test-only: clear the account-ID cache between test cases. */
export function __resetAccountIdCache(): void {
  accountIdCache.clear();
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

function resolveClient(
  settings: Settings | undefined,
  env: Env,
  region: string,
): SNSClientType {
  if (settings?.client) return settings.client;
  const config = settings?.config ?? {};
  const merged = config.region ? config : { ...config, region };
  return new env.AWS.SNSClient(merged);
}

async function getAccountId(env: Env, region: string): Promise<string> {
  const cached = accountIdCache.get(region);
  if (cached) return cached;
  const stsClient = new env.AWS.STSClient({ region });
  const res: unknown = await stsClient.send(
    new env.AWS.GetCallerIdentityCommand({}),
  );
  if (
    typeof res === 'object' &&
    res !== null &&
    'Account' in res &&
    typeof (res as { Account?: unknown }).Account === 'string'
  ) {
    const accountId = (res as { Account: string }).Account;
    accountIdCache.set(region, accountId);
    return accountId;
  }
  throw new Error('STS GetCallerIdentity returned no Account');
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
  client: SNSClientType,
  env: Env,
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
    await client.send(new env.AWS.SubscribeCommand(input));
    count += 1;
  }
  return count;
}

export async function setup(
  ctx: LifecycleContext<WideConfig, Env>,
): Promise<SetupResult | undefined> {
  const { config, env, logger } = ctx;
  const merged = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!merged) {
    logger.debug('setup: skipped (config.setup is false or unset)');
    return;
  }

  const settings = config.settings;
  if (!settings || !settings.topicName) {
    logger.throw(
      'setup: settings.topicName is required. There is no safe default for the SNS topic name.',
    );
    return;
  }

  const region = merged.region ?? DEFAULT_SETUP.region;
  const fifo = merged.fifoTopic ?? false;
  const declaredName = settings.topicName;
  const finalName = resolveTopicName(declaredName, fifo);
  if (fifo && finalName !== declaredName) {
    logger.info(
      `setup: appended .fifo suffix to FIFO topic name '${declaredName}' -> '${finalName}'`,
    );
  }

  // Topic-existence probe via candidate ARN derived from STS account ID.
  const client = resolveClient(settings, env, region);
  const accountId = await getAccountId(env, region);
  const candidateArn = `arn:aws:sns:${region}:${accountId}:${finalName}`;

  let topicCreated = false;
  try {
    await client.send(
      new env.AWS.GetTopicAttributesCommand({ TopicArn: candidateArn }),
    );
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

  const createRes = await client.send(
    new env.AWS.CreateTopicCommand(createInput),
  );
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
}
