import type { DestinationServer } from '@walkeros/server-core';
import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type {
  FirehoseClientConfig,
  PutRecordBatchCommandInput,
} from '@aws-sdk/client-firehose';
import type { InFlight, SendClient } from '../../lib/client';
import type { CredentialsInput } from '../../lib/credentials';

export type { SendClient } from '../../lib/client';

/** Client and stream options, as the deprecated `settings.firehose` held them. */
export interface FirehoseConfig {
  streamName?: string;
  client?: SendClient;
  region?: string;
  config?: FirehoseClientConfig;
}

/**
 * Settings as a user writes them. Only `streamName` is required (here or in
 * the deprecated `firehose` alias); `init` fills in the rest.
 */
export interface InitSettings {
  /** Name of the Firehose stream. */
  streamName?: string;
  /** AWS region. Default: `AWS_REGION` or the profile, else `eu-central-1`. */
  region?: string;
  /** Append `\n` to every record. Default `true`. */
  newline?: boolean;
  /** Raw `FirehoseClient` options, passed through to the SDK. */
  config?: FirehoseClientConfig;
  /** A client of your own. Used as is and never closed by the destination. */
  client?: SendClient;
  /** @deprecated Use the flat fields. Read at `init` as an alias. */
  firehose?: FirehoseConfig;
  /** Runtime-only, set by `init`: what the destination owns. Not user-facing. */
  runtime?: Runtime;
}

/** What `init` resolved. Every field is present. */
export interface Settings {
  streamName: string;
  region: string;
  newline: boolean;
  config?: FirehoseClientConfig;
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
  /** Sends in flight, awaited by `destroy`. */
  inflight: InFlight;
  /** Where the client's credentials come from, for the debug line. */
  credentialSource: CredentialSource;
}

export type CredentialSource =
  | 'config.credentials'
  | 'settings.config.credentials'
  | 'default chain'
  | 'client';

export interface Mapping {}

export type FirehoseClientConstructor = new (
  config: FirehoseClientConfig,
) => SendClient;

export type PutRecordBatchCommandConstructor = new (
  input: PutRecordBatchCommandInput,
) => { readonly input: PutRecordBatchCommandInput };

/**
 * Optional SDK overrides. Each one present wins over the SDK the package
 * imports; tests and simulate inject mocks here.
 */
export interface Env extends DestinationServer.Env {
  AWS?: {
    FirehoseClient?: FirehoseClientConstructor;
    PutRecordBatchCommand?: PutRecordBatchCommandConstructor;
  };
}

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  unknown,
  CredentialsInput
>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: InitFn;
  pushBatch: PushBatchFn;
}

export type Config = {
  settings: InitSettings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PushBatchFn = CoreDestination.PushBatchFn<Types>;

export type PartialConfig = DestinationServer.PartialConfig<Types>;

export type PushEvents = DestinationServer.PushEvents<Mapping>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
