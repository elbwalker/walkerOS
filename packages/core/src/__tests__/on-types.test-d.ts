import type { On, WalkerOS, Collector, Logger } from '../types';

declare const collectorInstance: Collector.Instance;
declare const loggerInstance: Logger.Instance;

const ctx: On.Context = {
  collector: collectorInstance,
  logger: loggerInstance,
};
void ctx;

// Unified shape compiles for every typed alias.
const consentFn: On.ConsentFn = async (consent, context) => {
  void consent.marketing;
  void context.collector;
  void context.logger;
};
const sessionFn: On.SessionFn = (session, context) => {
  void session;
  void context.logger;
};
const userFn: On.UserFn = (user, context) => {
  void user.id;
  void context.collector;
};
const readyFn: On.ReadyFn = (_, context) => {
  void context.collector;
};
const runFn: On.RunFn = (_, context) => {
  void context.collector;
};
const genericFn: On.GenericFn = (data, context) => {
  void data;
  void context.collector;
};
void consentFn;
void sessionFn;
void userFn;
void readyFn;
void runFn;
void genericFn;

// `Fn<TData>` is the underlying generic.
const customStringFn: On.Fn<string> = (data, context) => {
  void data.toUpperCase();
  void context.logger;
};
void customStringFn;

// Old positional (collector, consent) shape must not compile when the body
// uses Collector.Instance methods. Under the new ConsentFn the first arg is
// WalkerOS.Consent (an index-signature record `{ [name: string]: boolean }`),
// so `.push({})` resolves to a boolean call, which TS rejects.
const oldConsent: On.ConsentFn = (collector, _consent) =>
  // @ts-expect-error - Collector.Instance.push is callable; Consent[name] is boolean (not callable)
  void collector.push({});
void oldConsent;
// Legacy Context interface fields removed.
type _LegacyContextHasConsent = 'consent' extends keyof On.Context
  ? true
  : false;
const _legacyConsentRemoved: _LegacyContextHasConsent = false;
void _legacyConsentRemoved;
type _LegacyContextHasSession = 'session' extends keyof On.Context
  ? true
  : false;
const _legacySessionRemoved: _LegacyContextHasSession = false;
void _legacySessionRemoved;
// @ts-expect-error - *Config aliases removed
type _NoConsentConfig = On.ConsentConfig;
// @ts-expect-error - Options discriminated union removed
type _NoOptions = On.Options;
