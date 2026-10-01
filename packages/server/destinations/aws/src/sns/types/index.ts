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
import type { InFlight, SendClient } from '../../lib/client';
import type { CredentialsInput } from '../../lib/credentials';

export type { SendClient } from '../../lib/client';

/** An AWS SDK v3 command class, as far as this destination builds one. */
export type CommandConstructor<Input> = new (input: Input) => {
  readonly input: Input;
};

/**
 * Settings as a user writes them. `topicArn` alone is enough: region and
 * topic name derive from it. `topicName` (with `region`) also works, and the
 * ARN is then completed with the account id at the first publish.
 */
export interface InitSettings {
  /** Topic ARN. Region and topic name derive from it. */
  topicArn?: string;
  /** Topic name (with `.fifo` for FIFO topics). Needed by `walkeros setup`. */
  topicName?: string;
  /** AWS region. Default: the ARN's region, `AWS_REGION` or the profile, else `eu-central-1`. */
  region?: string;
  /** Raw `SNSClient` options, passed through to the SDK. */
  config?: SNSClientConfig;
  /** A client of your own. Used as is and never closed by the destination. */
  client?: SendClient;
  /** Runtime-only, set by `init`: what the destination owns. Not user-facing. */
  runtime?: Runtime;
}

/** What `init` resolved. */
export interface Settings {
  topicArn?: string;
  topicName?: string;
  region: string;
  config?: SNSClientConfig;
  client: SendClient;
  runtime: Runtime;
}

/** Runtime-only state of one initialized instance. */
export interface Runtime {
  /**
   * True when the destination built the client from nothing the user owns,
   * and so closes it. A user client, or a user request handler instance in
   * `settings.config`, keeps it false.
   */
  ownsClient: boolean;
  /** Publishes in flight, awaited by `destroy`. */
  inflight: InFlight;
  /** The topic ARN, completed once with the account id when only a name was given. */
  topicArn: () => Promise<string>;
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
  /**
   * FIFO deduplication ID. `Mapping.Value`, same reasoning as
   * `messageGroupId`. Defaults to the event id on FIFO topics.
   */
  messageDeduplicationId?: WalkerOSMapping.Value;
}

/**
 * Optional SDK overrides. Each one present wins over the SDK the package
 * imports; tests and simulate inject mocks here.
 */
export interface Env extends DestinationServer.Env {
  AWS?: {
    SNSClient?: new (config: SNSClientConfig) => SendClient;
    CreateTopicCommand?: CommandConstructor<CreateTopicCommandInput>;
    PublishCommand?: CommandConstructor<PublishCommandInput>;
    GetTopicAttributesCommand?: CommandConstructor<GetTopicAttributesCommandInput>;
    SubscribeCommand?: CommandConstructor<SubscribeCommandInput>;
    STSClient?: new (config: STSClientConfig) => SendClient;
    GetCallerIdentityCommand?: CommandConstructor<GetCallerIdentityCommandInput>;
  };
}

/**
 * Provisioning options for `walkeros setup destination.<id>` when targeting SNS.
 * Triggered only by the explicit CLI command. Idempotent, never auto-run.
 *
 * `topicName` lives in Settings (one source of truth for setup AND runtime publish).
 */
export interface Setup {
  /** AWS region for the topic. Default: the runtime region order. */
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
  Setup,
  CredentialsInput
>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: InitSettings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type SetupFn = CoreSetupFn<Config, Env>;

export type PartialConfig = DestinationServer.PartialConfig<Types>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
