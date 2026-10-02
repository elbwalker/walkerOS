import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  SetupFn as CoreSetupFn,
  Credential,
  ServiceAccount,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';
import type { ClientConfig, TopicMetadata } from '@google-cloud/pubsub';

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/** Credentials value for this destination: JSON string or service account object. */
export type Credentials = Credential<ServiceAccount>;

/** The message `push` publishes. */
export interface PublishMessage {
  data: Buffer;
  attributes?: Record<string, string>;
  orderingKey?: string;
}

/** The part of a Pub/Sub topic handle `push` calls. */
export interface TopicPublisher {
  publishMessage(message: PublishMessage): Promise<string>;
  resumePublishing(orderingKey: string): void;
}

/**
 * The part of the Pub/Sub client `init`, `push` and `destroy` call. The SDK's
 * `PubSub` satisfies it, and so does an injected mock (tests, simulate)
 * without a cast. `setup` needs the admin surface and uses the SDK client.
 */
export interface PubSubPublisher {
  topic(name: string, options?: { messageOrdering?: boolean }): TopicPublisher;
  close(): Promise<void>;
}

export interface Settings {
  // User-supplied OR populated by init(); single field for both. Mirrors BigQuery.
  client: PubSubPublisher;
  // Top-level always wins over credentials.project_id (documented in config.ts).
  projectId: string;
  topic: string;
  /** @deprecated use config.credentials */
  credentials?: string | ServiceAccountCredentials;
  // SDK term, kept verbatim.
  apiEndpoint?: string;
  // Mapping value resolved per-event. Undefined = no ordering. Truthy = ordering enabled.
  orderingKey?: WalkerOSMapping.Value;
  // Dynamic per-event attributes.
  attributes?: WalkerOSMapping.Map;
}

export interface InitSettings {
  projectId: string;
  topic: string;
  client?: PubSubPublisher;
  /** @deprecated use config.credentials */
  credentials?: string | ServiceAccountCredentials;
  apiEndpoint?: string;
  orderingKey?: WalkerOSMapping.Value;
  attributes?: WalkerOSMapping.Map;
}

export interface Mapping {
  topic?: string;
  orderingKey?: WalkerOSMapping.Value;
  // Per-rule attributes are merged on top of settings.attributes.
  attributes?: WalkerOSMapping.Map;
}

/**
 * Provisioning options for `walkeros setup destination.<id>`.
 * Triggered only by the explicit CLI command. Idempotent, never auto-run.
 *
 * `projectId` and `topic` are read from `Settings` (not duplicated here)
 * so a single source of truth governs both setup and runtime publish.
 *
 * Subscription provisioning is owned by the source side, not here.
 */
export interface Setup {
  /** Geographic regions for at-rest storage. Default: EU multi-region (['eu-west1','eu-west3','eu-west4']). */
  messageStoragePolicy?: { allowedPersistenceRegions: string[] };
  /** Topic-level retention. Default: undefined (project default). */
  messageRetentionDuration?: { seconds: number };
  /** CMEK key. Optional. */
  kmsKeyName?: string;
  /** Topic labels. Optional. */
  labels?: Record<string, string>;
}

export interface Env extends DestinationServer.Env {
  PubSub?: new (options?: ClientConfig) => PubSubPublisher;
}

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  Setup,
  Credentials
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

export type PartialConfig = DestinationServer.PartialConfig<Types>;

// Re-export SDK types used across the package for convenience.
export type { TopicMetadata };
