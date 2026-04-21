import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';

export interface Settings {
  /** Klaviyo private API key (required). Starts with 'pk_'. */
  apiKey: string;
  /** walkerOS mapping value path to resolve email from each event. */
  email?: string;
  /** walkerOS mapping value path to resolve phone number (E.164) from each event. */
  phoneNumber?: string;
  /** walkerOS mapping value path to resolve external ID from each event. */
  externalId?: string;
  /** Destination-level identify mapping. Resolves to profile attributes for upsert. */
  identify?: WalkerOSMapping.Value;
  /** Default currency for revenue events (ISO 4217, e.g. 'USD', 'EUR'). */
  currency?: string;
  /** Runtime state -- not user-facing. Mutated by init/push. */
  _eventsApi?: KlaviyoEventsApiMock;
  _profilesApi?: KlaviyoProfilesApiMock;
  _state?: RuntimeState;
}

export interface RuntimeState {
  lastIdentity?: {
    email?: string;
    externalId?: string;
    phoneNumber?: string;
    traitsHash?: string;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Resolved via getMappingValue() in push().
 */
export interface Mapping {
  /** Per-event identify mapping. Resolves to profile attributes for upsert. */
  identify?: WalkerOSMapping.Value;
  /** Revenue value mapping. Resolves to numeric value for Klaviyo's $value. */
  value?: WalkerOSMapping.Value;
}

/**
 * Env -- optional SDK override. Production leaves this undefined and the
 * destination creates real API instances. Tests provide mocks via
 * env.eventsApi and env.profilesApi.
 */
export interface Env extends DestinationServer.Env {
  eventsApi?: KlaviyoEventsApiMock;
  profilesApi?: KlaviyoProfilesApiMock;
}

/**
 * Mock-friendly interface for EventsApi.createEvent().
 */
export interface KlaviyoEventsApiMock {
  createEvent: (body: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Mock-friendly interface for ProfilesApi.createOrUpdateProfile().
 */
export interface KlaviyoProfilesApiMock {
  createOrUpdateProfile: (body: Record<string, unknown>) => Promise<unknown>;
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
