import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

/**
 * Mock-friendly interface for the TrackClient methods the
 * destination actually calls. Tests provide this via env.trackClient
 * instead of the real SDK.
 */
export interface CustomerIoTrackClientMock {
  identify: (
    customerId: string | number,
    attributes: Record<string, unknown>,
  ) => Promise<void>;
  track: (
    customerId: string | number,
    eventData: {
      name: string;
      data?: Record<string, unknown>;
      timestamp?: number;
    },
  ) => Promise<void>;
  trackAnonymous: (
    anonymousId: string,
    eventData: {
      name: string;
      data?: Record<string, unknown>;
      timestamp?: number;
    },
  ) => Promise<void>;
  trackPageView: (
    customerId: string | number,
    url: string,
    data?: Record<string, unknown>,
  ) => Promise<void>;
  destroy: (customerId: string | number) => Promise<void>;
  suppress: (customerId: string | number) => Promise<void>;
  unsuppress: (customerId: string | number) => Promise<void>;
  addDevice: (
    customerId: string | number,
    deviceId: string,
    platform: string,
    data?: Record<string, unknown>,
  ) => Promise<void>;
  deleteDevice: (
    customerId: string | number,
    deviceId: string,
    platform: string,
  ) => Promise<void>;
  mergeCustomers: (
    primaryType: string,
    primaryId: string,
    secondaryType: string,
    secondaryId: string,
  ) => Promise<void>;
}

/**
 * Mock-friendly interface for the APIClient methods the
 * destination actually calls. Tests provide this via env.apiClient
 * instead of the real SDK.
 */
export interface CustomerIoApiClientMock {
  sendEmail: (request: unknown) => Promise<void>;
  sendPush: (request: unknown) => Promise<void>;
}

export interface Settings {
  /** Customer.io Site ID (required for Track API). */
  siteId: string;
  /** Customer.io API Key (required for Track API). */
  apiKey: string;
  /** App API Key for transactional messaging (optional). */
  appApiKey?: string;
  /** Region: 'us' or 'eu'. Default: 'us'. */
  region?: 'us' | 'eu';
  /** HTTP request timeout in ms. Default: 10000. */
  timeout?: number;
  /** walkerOS mapping value path to resolve customerId from each event. */
  customerId?: string;
  /** walkerOS mapping value path to resolve anonymousId from each event. */
  anonymousId?: string;
  /** Destination-level identify mapping (fires identify() on first push / change). */
  identify?: WalkerOSMapping.Value;
  /** Runtime state -- not user-facing. */
  _trackClient?: CustomerIoTrackClientMock;
  _apiClient?: CustomerIoApiClientMock;
  _state?: RuntimeState;
}

export interface RuntimeState {
  lastIdentity?: {
    customerId?: string;
    attributesHash?: string;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Controls which Customer.io methods are called
 * beyond the default track(). Resolved via getMappingValue() in push().
 */
export interface Mapping {
  /** Per-event identify attributes. Resolves to { email?, first_name?, ... }. */
  identify?: WalkerOSMapping.Value;
  /** Fire trackPageView(). Resolves to { url, ... }. */
  page?: WalkerOSMapping.Value;
  /** Fire destroy(). Boolean true triggers deletion. */
  destroy?: boolean;
  /** Fire suppress(). Boolean true triggers suppression. */
  suppress?: boolean;
  /** Fire unsuppress(). Boolean true triggers unsuppression. */
  unsuppress?: boolean;
  /** Fire addDevice(). Resolves to { deviceId, platform, data? }. */
  addDevice?: WalkerOSMapping.Value;
  /** Fire deleteDevice(). Resolves to { deviceId, platform }. */
  deleteDevice?: WalkerOSMapping.Value;
  /** Fire mergeCustomers(). Resolves to { primaryType, primaryId, secondaryType, secondaryId }. */
  merge?: WalkerOSMapping.Value;
  /** Fire sendEmail(). Resolves to { to, transactional_message_id, message_data?, identifiers? }. */
  sendEmail?: WalkerOSMapping.Value;
  /** Fire sendPush(). Resolves to { transactional_message_id, message_data?, identifiers? }. */
  sendPush?: WalkerOSMapping.Value;
}

/**
 * Env -- optional SDK override. Production leaves this undefined and the
 * destination creates real TrackClient/APIClient instances. Tests provide
 * mocks via env.trackClient and env.apiClient.
 */
export interface Env extends DestinationServer.Env {
  trackClient?: CustomerIoTrackClientMock;
  apiClient?: CustomerIoApiClientMock;
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
