import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
  Credential,
  ServiceAccount,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';
import type {
  CART_DATA_KEYS,
  CART_ITEM_KEYS,
  EVENT_SOURCES,
} from '../constants';

export interface Settings {
  /**
   * Service account credentials (client_email + private_key)
   * Recommended for serverless environments (AWS Lambda, Docker, etc.)
   *
   * @deprecated Use `config.credentials` instead. This field still works but
   * will be removed in a future major version.
   */
  credentials?: Credential<ServiceAccount>;

  /** Absolute path to a service account JSON file */
  keyFilename?: string;

  /**
   * OAuth scopes for Data Manager API
   * @default ['https://www.googleapis.com/auth/datamanager']
   */
  scopes?: string[];

  /** Destination accounts and conversion actions (max 10); every event goes to every entry */
  destinations: Destination[];

  /** Event source for all events. Defaults to WEB if not specified */
  eventSource?: EventSource;

  /** If true, validate request without ingestion (testing mode) */
  validateOnly?: boolean;

  /** Override API endpoint (for testing) */
  url?: string;

  /** Request-level consent for all events */
  consent?: Consent;

  /** Guided helpers: User data mapping (applies to all events) */
  userData?: WalkerOSMapping.Map;

  /** Guided helper: First-party user ID */
  userId?: WalkerOSMapping.Value;

  /** Guided helper: GA4 client ID */
  clientId?: WalkerOSMapping.Value;

  /** Guided helper: GA4 app instance ID (Firebase) */
  appInstanceId?: WalkerOSMapping.Value;

  /** Guided helper: Privacy-safe attribution (Google's sessionAttributes) */
  sessionAttributes?: WalkerOSMapping.Value;

  /** Consent mapping: Map consent field to adUserData (string = field name, boolean = static value) */
  consentAdUserData?: string | boolean;

  /** Consent mapping: Map consent field to adPersonalization (string = field name, boolean = static value) */
  consentAdPersonalization?: string | boolean;

  /**
   * Client IP, sent as eventDeviceInfo.ipAddress. Resolves against
   * { ingest, event }. Filled by default only when an entry is `GOOGLE_ADS`;
   * a Google Analytics-only step sends none unless this is set or
   * `ipAddress` is mapped. `false` switches it off. A mapped `ipAddress` wins.
   * @default ['ingest.ip', 'event.user.ip'] with a `GOOGLE_ADS` entry
   */
  ip?: WalkerOSMapping.Value | false;

  /**
   * Client user agent, sent as eventDeviceInfo.userAgent. Resolves against
   * { ingest, event }. Filled by default only when an entry is `GOOGLE_ADS`;
   * a Google Analytics-only step sends none unless this is set or
   * `userAgent` is mapped. `false` switches it off. A mapped `userAgent` wins.
   * @default ['ingest.userAgent', 'event.user.userAgent'] with a `GOOGLE_ADS` entry
   */
  userAgent?: WalkerOSMapping.Value | false;
}

// A rule's mapped data goes in `data`; the destination has no rule settings.
export interface Mapping {}

/**
 * The part of a Google auth client this destination calls. Structural so an
 * injected client (tests, simulate) needs no cast; every client
 * `GoogleAuth.getClient()` returns satisfies it.
 */
export interface AuthClient {
  getRequestHeaders(): Promise<Headers>;
}

export interface Env extends DestinationServer.Env {
  sendServer?: typeof sendServer;
  authClient?: AuthClient | null;
}

export type InitSettings = Partial<Settings>;

export type Types = CoreDestination.Types<
  Settings,
  Mapping,
  Env,
  InitSettings,
  unknown,
  Credential<ServiceAccount>
>;

export interface DestinationInterface extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

/**
 * Config after validation - settings is guaranteed to exist with required fields
 * Use this type after calling getConfig() to get proper type narrowing
 * After validation, eventSource is always set (defaults to 'WEB')
 */
export type ValidatedConfig = Omit<Config, 'settings'> & {
  settings: Settings & { eventSource: EventSource };
};

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
  /** Login account (account initiating the request) */
  loginAccount?: ProductAccount;

  /** Operating account (account where data is sent) */
  operatingAccount?: ProductAccount;

  /** Product-specific destination ID: a Google Ads conversion action ID, or a Google Analytics measurement ID or Firebase App ID */
  productDestinationId?: string;
}

/**
 * Product account information
 */
export interface ProductAccount {
  /** Numeric account ID: a Google Ads customer ID without hyphens, or a Google Analytics property ID */
  accountId: string;

  /** Type of account */
  accountType: AccountType;
}

export type AccountType = 'GOOGLE_ADS' | 'GOOGLE_ANALYTICS_PROPERTY';

export type EventSource = (typeof EVENT_SOURCES)[number];

/**
 * Hash encoding for user identifiers (required for UserData uploads)
 * https://developers.google.com/data-manager/api/reference/rest/v1/Encoding
 */
export type Encoding = 'HEX' | 'BASE64';

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
  /** Array of destinations for these events (max 10) */
  destinations: Destination[];

  /** Array of events to ingest (max 2000) */
  events: Event[];

  /** Request-level consent (overridden by event-level) */
  consent?: Consent;

  /** If true, validate without ingestion */
  validateOnly?: boolean;

  /** Hash encoding for user identifiers. Required for UserData uploads. */
  encoding?: Encoding;
}

/**
 * Single event for ingestion
 * https://developers.google.com/data-manager/api/reference/rest/v1/Event
 */
export interface Event {
  /** Transaction ID for deduplication (max 512 chars) */
  transactionId?: string;

  /** Event timestamp in RFC 3339 format */
  eventTimestamp?: string;

  /** User data with identifiers (max 10 identifiers) */
  userData?: UserData;

  /** Event-level consent (overrides request-level) */
  consent?: Consent;

  /** Attribution identifiers */
  adIdentifiers?: AdIdentifiers;

  /** Currency code (ISO 4217, 3 chars) */
  currency?: string;

  /** Conversion value */
  conversionValue?: number;

  /** Source of the event */
  eventSource?: EventSource;

  /** Device information for the event */
  eventDeviceInfo?: DeviceInfo;

  /** Shopping cart data */
  cartData?: CartData;

  /** Event name for GA4 (max 40 chars, required for GA4) */
  eventName?: string;

  /** Google Analytics client ID (max 255 chars) */
  clientId?: string;

  /** First-party user ID (max 256 chars) */
  userId?: string;

  /** GA4 app instance ID (Firebase) */
  appInstanceId?: string;

  /** Event location (required for Store Sales / IN_STORE events) */
  eventLocation?: EventLocation;
}

/**
 * Event location data
 * https://developers.google.com/data-manager/api/reference/rest/v1/EventLocation
 */
export interface EventLocation {
  /** Required for Store Sales. Identifier of the physical store where the event happened. */
  storeId?: string;
}

/**
 * Device information
 */
export interface DeviceInfo {
  /** User agent string */
  userAgent?: string;

  /** IP address of the device */
  ipAddress?: string;
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
  /** Session attributes (privacy-safe attribution) */
  sessionAttributes?: string;

  /** Google Click ID (primary attribution) */
  gclid?: string;

  /** iOS attribution identifier (post-ATT) */
  gbraid?: string;

  /** Web-to-app attribution identifier */
  wbraid?: string;
}

/**
 * Shopping cart data
 * https://developers.google.com/data-manager/api/reference/rest/v1/CartData
 */
export type CartData = { items: CartItem[] } & {
  [K in Exclude<(typeof CART_DATA_KEYS)[number], 'items'>]?: unknown;
};

/**
 * Single cart item, its values as mapped
 * https://developers.google.com/data-manager/api/reference/rest/v1/Event#Item
 */
export type CartItem = { [K in (typeof CART_ITEM_KEYS)[number]]?: unknown };

/**
 * Response from events.ingest API
 * https://developers.google.com/data-manager/api/reference/rest/v1/IngestEventsResponse
 */
export interface IngestEventsResponse {
  /** Unique request ID for status checking */
  requestId?: string;

  /** Fields Google dropped from events it accepted */
  fieldWarnings?: FieldWarning[];
}

/**
 * A field Google dropped from an accepted event
 */
export interface FieldWarning {
  /** Warning reason enum, like WARNING_REASON_INVALID_CLIENT_ID */
  reason?: string;

  /** Google's text about the value: never logged */
  description?: string;

  /** Path of the dropped field, like events.events[0].client_id */
  field?: string;
}
