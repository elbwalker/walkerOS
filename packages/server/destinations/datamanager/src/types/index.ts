import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';
import type { LogLevel } from '../utils';

export interface Settings {
  /** OAuth 2.0 access token with datamanager scope */
  accessToken: string;

  /** Array of destination accounts and conversion actions/user lists */
  destinations: Destination[];

  /** Default event source if not specified per event */
  eventSource?: EventSource;

  /** Maximum number of events to batch before sending (max 2000) */
  batchSize?: number;

  /** Time in milliseconds to wait before auto-flushing batch */
  batchInterval?: number;

  /** If true, validate request without ingestion (testing mode) */
  validateOnly?: boolean;

  /** Override API endpoint (for testing) */
  url?: string;

  /** Request-level consent for all events */
  consent?: Consent;

  /** Test event code for debugging (optional) */
  testEventCode?: string;

  /** Log level for debugging (optional) */
  logLevel?: LogLevel;
}

export interface Mapping {
  // Attribution identifiers (optional, for explicit mapping)
  gclid?: WalkerOSMapping.Value;
  gbraid?: WalkerOSMapping.Value;
  wbraid?: WalkerOSMapping.Value;
  sessionAttributes?: WalkerOSMapping.Value;
}

export interface Env extends DestinationServer.Env {
  fetch?: typeof fetch;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env>;

export interface DestinationInterface
  extends DestinationServer.Destination<Types> {
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

// Google Data Manager API Types
// https://developers.google.com/data-manager/api/reference

/**
 * Destination account and product identifier
 * https://developers.google.com/data-manager/api/reference/rest/v1/Destination
 */
export interface Destination {
  /** Operating account details */
  operatingAccount: OperatingAccount;

  /** Product-specific destination ID (conversion action or user list) */
  productDestinationId: string;
}

/**
 * Operating account information
 */
export interface OperatingAccount {
  /** Account ID (e.g., "123-456-7890" for Google Ads) */
  accountId: string;

  /** Type of account */
  accountType: AccountType;
}

export type AccountType =
  | 'GOOGLE_ADS'
  | 'DISPLAY_VIDEO_ADVERTISER'
  | 'DISPLAY_VIDEO_PARTNER'
  | 'GOOGLE_ANALYTICS_PROPERTY';

export type EventSource = 'WEB' | 'APP' | 'IN_STORE' | 'PHONE' | 'OTHER';

/**
 * Consent for Digital Markets Act (DMA) compliance
 * https://developers.google.com/data-manager/api/devguides/concepts/dma
 */
export interface Consent {
  /** Consent for data collection and use */
  adUserData?: ConsentStatus;

  /** Consent for ad personalization */
  adPersonalization?: ConsentStatus;
}

export type ConsentStatus = 'CONSENT_GRANTED' | 'CONSENT_DENIED';

/**
 * Request body for events.ingest API
 * https://developers.google.com/data-manager/api/reference/rest/v1/events/ingest
 */
export interface IngestEventsRequest {
  /** OAuth 2.0 access token */
  access_token?: string;

  /** Array of events to ingest (max 2000) */
  events: Event[];

  /** Array of destinations for these events (max 10) */
  destinations: Destination[];

  /** Request-level consent (overridden by event-level) */
  consent?: Consent;

  /** If true, validate without ingestion */
  validateOnly?: boolean;

  /** Test event code for debugging */
  testEventCode?: string;
}

/**
 * Single event for ingestion
 * https://developers.google.com/data-manager/api/reference/rest/v1/Event
 */
export interface Event {
  /** Event timestamp in RFC 3339 format */
  eventTimestamp: string;

  /** Transaction ID for deduplication (max 512 chars) */
  transactionId?: string;

  /** Google Analytics client ID (max 255 chars) */
  clientId?: string;

  /** First-party user ID (max 256 chars) */
  userId?: string;

  /** User data with identifiers (max 10 identifiers) */
  userData?: UserData;

  /** Attribution identifiers */
  adIdentifiers?: AdIdentifiers;

  /** Conversion value */
  conversionValue?: number;

  /** Currency code (ISO 4217, 3 chars) */
  currency?: string;

  /** Shopping cart data */
  cartData?: CartData;

  /** Event name for GA4 (max 40 chars, required for GA4) */
  eventName?: string;

  /** Source of the event */
  eventSource?: EventSource;

  /** Event-level consent (overrides request-level) */
  consent?: Consent;
}

/**
 * User data with identifiers
 * https://developers.google.com/data-manager/api/reference/rest/v1/UserData
 */
export interface UserData {
  /** Array of user identifiers (max 10) */
  userIdentifiers: UserIdentifier[];
}

/**
 * User identifier (email, phone, or address)
 */
export type UserIdentifier =
  | { emailAddress: string }
  | { phoneNumber: string }
  | { address: Address };

/**
 * Address for user identification
 * https://developers.google.com/data-manager/api/reference/rest/v1/Address
 */
export interface Address {
  /** Given name (first name) - SHA-256 hashed */
  givenName?: string;

  /** Family name (last name) - SHA-256 hashed */
  familyName?: string;

  /** ISO-3166-1 alpha-2 country code - NOT hashed (e.g., "US", "GB") */
  regionCode?: string;

  /** Postal code - NOT hashed */
  postalCode?: string;
}

/**
 * Attribution identifiers
 * https://developers.google.com/data-manager/api/reference/rest/v1/AdIdentifiers
 */
export interface AdIdentifiers {
  /** Google Click ID (primary attribution) */
  gclid?: string;

  /** iOS attribution identifier (post-ATT) */
  gbraid?: string;

  /** Web-to-app attribution identifier */
  wbraid?: string;

  /** Session attributes (privacy-safe attribution) */
  sessionAttributes?: string;
}

/**
 * Shopping cart data
 * https://developers.google.com/data-manager/api/reference/rest/v1/CartData
 */
export interface CartData {
  /** Array of cart items (max 200) */
  items: CartItem[];
}

/**
 * Single cart item
 * https://developers.google.com/data-manager/api/reference/rest/v1/CartItem
 */
export interface CartItem {
  /** Merchant product ID (max 127 chars) */
  merchantProductId?: string;

  /** Item price */
  price?: number;

  /** Item quantity */
  quantity?: number;
}

/**
 * Response from events.ingest API
 * https://developers.google.com/data-manager/api/reference/rest/v1/IngestEventsResponse
 */
export interface IngestEventsResponse {
  /** Unique request ID for status checking */
  requestId: string;

  /** Validation errors (only if validateOnly=true) */
  validationErrors?: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Field path that caused the error */
  fieldPath?: string;
}

/**
 * Request status response
 * https://developers.google.com/data-manager/api/reference/rest/v1/requestStatus/retrieve
 */
export interface RequestStatusResponse {
  /** Unique request ID */
  requestId: string;

  /** Processing state */
  state: RequestState;

  /** Number of events successfully ingested */
  eventsIngested?: number;

  /** Number of events that failed */
  eventsFailed?: number;

  /** Array of errors (if any) */
  errors?: RequestError[];
}

export type RequestState =
  | 'STATE_UNSPECIFIED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'PARTIALLY_SUCCEEDED';

/**
 * Request error
 */
export interface RequestError {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Number of events affected by this error */
  eventCount?: number;
}
