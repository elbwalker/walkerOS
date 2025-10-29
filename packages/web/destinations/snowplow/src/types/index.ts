import type {
  Mapping as WalkerOSMapping,
  WalkerOS,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

declare global {
  interface Window {
    snowplow?: SnowplowFunction;
    GlobalSnowplowNamespace?: string;
  }
}

// Snowplow tracker queue function type (similar to gtag or fbq)
export interface SnowplowFunction {
  (...args: unknown[]): void;
  q?: unknown[];
}

// Snowplow structured event parameters
export interface StructuredEventParams {
  category: string;
  action: string;
  label?: string;
  property?: string;
  value?: number;
}

// Snowplow self-describing event
export interface SelfDescribingEvent {
  schema: string;
  data: WalkerOS.Properties;
}

/**
 * Configuration settings for Snowplow destination
 */
export interface Settings {
  /**
   * Snowplow collector endpoint URL
   *
   * Required. The URL of your Snowplow collector.
   *
   * @example "https://collector.example.com"
   */
  collectorUrl?: string;

  /**
   * Application ID
   *
   * Identifier for your application in Snowplow.
   *
   * @default undefined
   */
  appId?: string;

  /**
   * Tracker instance name
   *
   * Name for the tracker instance. Useful when running multiple trackers.
   *
   * @default "sp"
   */
  trackerName?: string;

  /**
   * Platform identifier
   *
   * Platform the tracker is running on.
   *
   * @default "web"
   */
  platform?: string;

  /**
   * Event method
   *
   * Which Snowplow method to use for tracking events:
   * - "struct": Use trackStructEvent (category/action/label/property/value)
   * - "self": Use trackSelfDescribingEvent (schema-based events)
   *
   * @default "struct"
   */
  eventMethod?: 'struct' | 'self';

  /**
   * Schema for self-describing events
   *
   * Iglu schema URI to use when eventMethod is "self".
   *
   * @example "iglu:com.example/event/jsonschema/1-0-0"
   */
  schema?: string;

  /**
   * Enable automatic page view tracking
   *
   * If true, page view events will be tracked automatically.
   *
   * @default false
   */
  pageViewTracking?: boolean;
}

/**
 * Custom mapping parameters for Snowplow events
 */
export interface Mapping {
  /**
   * Event category for structured events
   */
  category?: string;

  /**
   * Event action for structured events
   */
  action?: string;

  /**
   * Event label for structured events
   */
  label?: string;

  /**
   * Event property for structured events
   */
  property?: string;

  /**
   * Event value for structured events
   */
  value?: number;

  /**
   * Schema for self-describing event
   */
  schema?: string;
}

/**
 * Environment dependencies for Snowplow destination
 */
export interface Env extends DestinationWeb.Env {
  window: {
    snowplow?: SnowplowFunction;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
export type Param = WalkerOSMapping.Value;
