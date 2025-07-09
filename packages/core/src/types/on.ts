import type {
  Collector,
  Consent,
  OrderedProperties,
  SessionData,
} from './walkeros';

// collector state for the on actions
export type Config = {
  consent?: Array<ConsentConfig>;
  ready?: Array<ReadyConfig>;
  run?: Array<RunConfig>;
  session?: Array<SessionConfig>;
};

// On types
export type Types = keyof Config;

// Parameters for the onAction function calls
export type Options = ConsentConfig | ReadyConfig | RunConfig | SessionConfig;

// Consent
export interface ConsentConfig {
  [key: string]: ConsentFn;
}
export type ConsentFn = (collector: Collector, consent: Consent) => void;

// Ready
export type ReadyConfig = ReadyFn;
export type ReadyFn = (collector: Collector) => void;

// Run
export type RunConfig = RunFn;
export type RunFn = (collector: Collector) => void;

// Session
export type SessionConfig = SessionFn;
export type SessionFn = (collector: Collector, session?: SessionData) => void;
