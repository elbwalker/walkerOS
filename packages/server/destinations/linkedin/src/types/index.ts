import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';

export interface Settings {
  accessToken: string;
  conversionRuleId: string;
  apiVersion?: string;
  doNotHash?: string[];
  url?: string;
  user_data?: WalkerOSMapping.Map;
}

export type InitSettings = Partial<Settings>;

export interface Mapping {
  conversion?: WalkerOSMapping.Value;
}

export interface Env extends DestinationServer.Env {
  sendServer?: typeof sendServer;
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

// LinkedIn API types

export type UserIdType =
  | 'SHA256_EMAIL'
  | 'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID'
  | 'ACXIOM_ID'
  | 'ORACLE_MOAT_ID';

export interface UserIdentifier {
  idType: UserIdType;
  idValue: string;
}

export interface UserInfo {
  firstName: string;
  lastName: string;
  title?: string;
  companyName?: string;
  countryCode?: string;
}

export interface ConversionUser {
  userIds: UserIdentifier[];
  userInfo?: UserInfo;
}

export interface ConversionValue {
  currencyCode: string;
  amount: string;
}

export interface ConversionEvent {
  conversion: string;
  conversionHappenedAt: number;
  conversionValue?: ConversionValue;
  user: ConversionUser;
  eventId?: string;
}

export interface ConversionEventsRequest {
  elements: ConversionEvent[];
}
