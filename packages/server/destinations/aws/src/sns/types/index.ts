import type { DestinationServer } from '@walkeros/server-core';
import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  SetupFn as CoreSetupFn,
} from '@walkeros/core';
import type {
  SNSClientConfig,
  CreateTopicCommandInput,
  PublishCommandInput,
  GetTopicAttributesCommandInput,
  SubscribeCommandInput,
} from '@aws-sdk/client-sns';
import type {
  STSClientConfig,
  GetCallerIdentityCommandInput,
} from '@aws-sdk/client-sts';

/**
 * The part of an AWS SDK v3 client this destination calls: `send` with a
 * command. `SNSClient` and `STSClient` satisfy it, and so does an injected
 * mock (tests, simulate) without a cast.
 */
export interface SendClient {
  send(command: object): Promise<unknown>;
}

/** An AWS SDK v3 command class, as far as this destination builds one. */
export type CommandConstructor<Input> = new (input: Input) => {
  readonly input: Input;
};

export interface Settings {
  /** Topic name (without `.fifo` suffix unless fifoTopic is true). REQUIRED. */
  topicName: string;
  /** Pre-configured client. Optional; created from env if absent. */
  client?: SendClient;
  /** AWS region. Mirrors setup.region default ('eu-central-1'). */
  region?: string;
  /** SDK client config (credentials, etc.). Optional. */
  config?: SNSClientConfig;
  /** Topic ARN, populated at init() from CreateTopic. Operator may pre-set to skip init's CreateTopic call. */
  topicArn?: string;
}

export interface InitSettings {
  topicName: string;
  client?: SendClient;
  region?: string;
  config?: SNSClientConfig;
  topicArn?: string;
}

export interface Mapping {
  /**
   * Per-event message attributes resolved via mapping. Each attribute value
   * resolves to the SDK's expected `{ DataType, StringValue }` shape; operators
   * write either a literal `{ DataType: 'String', StringValue: '$path' }` value
   * or use `{ value: { DataType: 'String', StringValue: '$user.id' } }` style
   * to drive the StringValue from event data.
   */
  messageAttributes?: WalkerOSMapping.Map;
  /**
   * FIFO group ID for FIFO topics. `Mapping.Value` so operators can write
   * `messageGroupId: 'user.id'` (path) instead of hard-coding a literal.
   */
  messageGroupId?: WalkerOSMapping.Value;
  /** FIFO deduplication ID. `Mapping.Value`, same reasoning as `messageGroupId`. */
  messageDeduplicationId?: WalkerOSMapping.Value;
}

export interface Env extends DestinationServer.Env {
  AWS: {
    SNSClient: new (config: SNSClientConfig) => SendClient;
    CreateTopicCommand: CommandConstructor<CreateTopicCommandInput>;
    PublishCommand: CommandConstructor<PublishCommandInput>;
    GetTopicAttributesCommand: CommandConstructor<GetTopicAttributesCommandInput>;
    SubscribeCommand: CommandConstructor<SubscribeCommandInput>;
    STSClient: new (config: STSClientConfig) => SendClient;
    GetCallerIdentityCommand: CommandConstructor<GetCallerIdentityCommandInput>;
  };
}

/**
 * Provisioning options for `walkeros setup destination.<id>` when targeting SNS.
 * Triggered only by the explicit CLI command. Idempotent, never auto-run.
 *
 * `topicName` lives in Settings (one source of truth for setup AND runtime publish).
 */
export interface Setup {
  /** AWS region for the topic. Default: 'eu-central-1'. */
  region?: string;
  /** Display name. Optional. */
  displayName?: string;
  /** FIFO topic with content-based deduplication. Default: false. */
  fifoTopic?: boolean;
  /** KMS key for at-rest encryption. Optional. */
  kmsMasterKeyId?: string;
  /** Tags for cost allocation. Optional. */
  tags?: Record<string, string>;
  /** Subscriptions to create or update on the topic. Each is opt-in. */
  subscriptions?: SetupSubscription[];
}

export interface SetupSubscription {
  protocol: 'sqs' | 'lambda' | 'https' | 'http' | 'email' | 'sms';
  endpoint: string;
  rawMessageDelivery?: boolean;
  filterPolicy?: Record<string, unknown>;
  deadLetterTargetArn?: string;
}

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  Setup
>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type SetupFn = CoreSetupFn<Config, Env>;

// Local override of PartialConfig to forward the Setup (`U`) type arg.
// Mirrors the BigQuery destination's pattern.
export type PartialConfig = Omit<
  DestinationServer.PartialConfig<Types>,
  'settings' | 'setup'
> & {
  settings?: Partial<Settings> | Settings;
  setup?: boolean | Setup;
};

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
