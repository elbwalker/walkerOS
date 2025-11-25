import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';
import type { OAuth2Client } from 'google-auth-library';
import type { LogLevel } from '../utils';

export interface Settings {
  /**
   * Service account credentials (client_email + private_key)
   * Recommended for serverless environments (AWS Lambda, Docker, etc.)
   */
  credentials?: {
    client_email: string;
    private_key: string;
  };

  /**
   * Path to service account JSON file
   * For local development or environments with filesystem access
   */
  keyFilename?: string;

  /**
   * OAuth scopes for Data Manager API
   * @default ['https://www.googleapis.com/auth/datamanager']
   */
  scopes?: string[];

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

  /** Guided helpers: User data mapping (applies to all events) */
  userData?: WalkerOSMapping.Map;

  /** Guided helper: First-party user ID */
  userId?: WalkerOSMapping.Value;

  /** Guided helper: GA4 client ID */
  clientId?: WalkerOSMapping.Value;

  /** Guided helper: Privacy-safe attribution (Google's sessionAttributes) */
  sessionAttributes?: WalkerOSMapping.Value;

  /** Consent mapping: Map consent field to adUserData (string = field name, boolean = static value) */
  consentAdUserData?: string | boolean;

  /** Consent mapping: Map consent field to adPersonalization (string = field name, boolean = static value) */
  consentAdPersonalization?: string | boolean;
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
  authClient?: OAuth2Client | null;
}

export type InitSettings = Partial<Settings>;

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

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
  /** Reference identifier for this destination */
  reference?: string;

  /** Login account (account initiating the request) */
  loginAccount?: ProductAccount;

  /** Linked account (child account linked to login account) */
  linkedAccount?: ProductAccount;

  /** Operating account (account where data is sent) */
  operatingAccount?: ProductAccount;

  /** Product-specific destination ID (conversion action or user list) */
  productDestinationId?: string;
}

/**
 * Product account information
 */
export interface ProductAccount {
  /** Account ID (e.g., "123-456-7890" for Google Ads) */
  accountId: string;

  /** Type of account */
  accountType: AccountType;
}

export type AccountType =
  | 'ACCOUNT_TYPE_UNSPECIFIED'
  | 'GOOGLE_ADS'
  | 'DISPLAY_VIDEO_ADVERTISER'
  | 'DISPLAY_VIDEO_PARTNER'
  | 'GOOGLE_ANALYTICS_PROPERTY'
  | 'DATA_PARTNER';

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
  /** Array of destinations for these events (max 10) */
  destinations: Destination[];

  /** Array of events to ingest (max 2000) */
  events: Event[];

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
  /** Destination references for routing */
  destinationReferences?: string[];

  /** Transaction ID for deduplication (max 512 chars) */
  transactionId?: string;

  /** Event timestamp in RFC 3339 format */
  eventTimestamp?: string;

  /** Last updated timestamp in RFC 3339 format */
  lastUpdatedTimestamp?: string;

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

  /** Custom variables for the event */
  customVariables?: CustomVariable[];

  /** Experimental fields (subject to change) */
  experimentalFields?: ExperimentalField[];

  /** User properties */
  userProperties?: UserProperties;

  /** Event name for GA4 (max 40 chars, required for GA4) */
  eventName?: string;

  /** Google Analytics client ID (max 255 chars) */
  clientId?: string;

  /** First-party user ID (max 256 chars) */
  userId?: string;

  /** Additional event parameters */
  additionalEventParameters?: EventParameter[];
}

/**
 * Device information
 */
export interface DeviceInfo {
  /** User agent string */
  userAgent?: string;
}

/**
 * Custom variable
 */
export interface CustomVariable {
  /** Variable name */
  name?: string;

  /** Variable value */
  value?: string;
}

/**
 * Experimental field
 */
export interface ExperimentalField {
  /** Field name */
  name?: string;

  /** Field value */
  value?: string;
}

/**
 * User properties
 */
export interface UserProperties {
  /** Property values */
  [key: string]: string | number | boolean | undefined;
}

/**
 * Event parameter
 */
export interface EventParameter {
  /** Parameter name */
  name?: string;

  /** Parameter value */
  value?: string | number;
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

  /** Device information for landing page */
  landingPageDeviceInfo?: DeviceInfo;
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
