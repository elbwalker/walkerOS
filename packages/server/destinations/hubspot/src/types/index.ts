import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

/** Shape of a single custom event occurrence sent to HubSpot. */
export interface HubSpotEventRequest {
  eventName: string;
  email?: string;
  objectId?: string;
  utk?: string;
  uuid?: string;
  occurredAt?: Date;
  properties?: Record<string, string>;
}

/**
 * Mock-friendly interface for the HubSpot Client methods the destination
 * actually calls. Tests provide this via env.client instead of the real SDK.
 */
export interface HubSpotClientMock {
  events: {
    send: {
      basicApi: {
        send: (data: HubSpotEventRequest) => Promise<void>;
      };
      batchApi: {
        send: (data: { inputs: HubSpotEventRequest[] }) => Promise<void>;
      };
    };
  };
  crm: {
    contacts: {
      basicApi: {
        update: (
          id: string,
          data: { properties: Record<string, string> },
          idProperty?: string,
        ) => Promise<void>;
      };
    };
  };
}

export interface Settings {
  /** HubSpot private app access token (required). */
  accessToken: string;

  /**
   * Fully qualified event name prefix: pe{HubID}_
   * Used to construct eventName from walkerOS event names.
   * Example: 'pe12345678_'
   */
  eventNamePrefix: string;

  /**
   * walkerOS mapping value path to resolve contact email from events.
   * Default: 'user.email'
   */
  email?: string;

  /**
   * walkerOS mapping value path to resolve HubSpot objectId from events.
   * Default: undefined (use email for association)
   */
  objectId?: string;

  /**
   * Destination-level contact upsert mapping.
   * Resolves to { email, properties } and upserts the contact on each push
   * (with dedup via state hash).
   */
  identify?: WalkerOSMapping.Value;

  /**
   * Static event properties added to every event occurrence.
   * Useful for hs_touchpoint_source, hs_page_content_type, etc.
   */
  defaultProperties?: Record<string, string>;

  /**
   * Whether to use batch API for events (accumulate and flush).
   * Default: false (single event sends).
   */
  batch?: boolean;

  /**
   * Batch size before auto-flush. Only used when batch: true.
   * Default: 50. Max: 500.
   */
  batchSize?: number;

  /** Runtime state -- not user-facing. Mutated by init/push. */
  _client?: HubSpotClientMock;
  _state?: RuntimeState;
  _eventQueue?: HubSpotEventRequest[];
}

export interface RuntimeState {
  lastIdentity?: {
    email?: string;
    propertiesHash?: string;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings.
 */
export interface Mapping {
  /**
   * Override eventName for this rule. If not set, the walkerOS event name
   * is transformed: spaces to underscores, lowercased, prefixed with
   * eventNamePrefix.
   */
  eventName?: string;

  /**
   * Per-event contact upsert. Resolves to { email, properties }.
   * Overrides destination-level identify.
   */
  identify?: WalkerOSMapping.Value;

  /**
   * Additional event properties mapping. Resolved values are merged
   * with defaultProperties and sent as the event's properties field.
   */
  properties?: WalkerOSMapping.Value;
}

/**
 * Env -- optional SDK override. Production leaves this undefined and the
 * destination creates a real Client instance. Tests provide a mock via
 * env.client.
 */
export interface Env extends DestinationServer.Env {
  client?: HubSpotClientMock;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushEvents = DestinationServer.PushEvents<Mapping>;
export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
