import type {
  Destination as CoreDestination,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
import type {
  D8aConfigParams,
  D8aEventParams,
  D8aFn,
  InstallD8aOptions,
  InstallD8aResult,
} from '@d8a-tech/wt';

declare global {
  interface Window {
    d8a?: D8aFn;
    d8aLayer?: unknown[];
    d8aDataLayerName?: string;
    d8aGlobalName?: string;
  }
}

export type ConsentMode = false | true | ConsentMapping;

export interface ConsentMapping {
  [walkerOSConsentGroup: string]: string | string[];
}

export interface Settings extends D8aConfigParams {
  property_id: string;
  server_container_url: string;
  como?: ConsentMode;
  data?: WalkerOSMapping.Value | WalkerOSMapping.Values;
  dataLayerName?: string;
  globalName?: string;
  snakeCase?: boolean;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {}

export interface Env extends DestinationWeb.Env {
  installD8a?: (opts?: InstallD8aOptions) => InstallD8aResult;
  window: DestinationWeb.Env['window'] & {
    d8a?: D8aFn;
    d8aLayer?: unknown[];
    [key: string]: unknown;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;
export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
export type Parameters = D8aEventParams;
