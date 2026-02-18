import type { Source, Elb } from '@walkeros/core';

/**
 * Type definitions for a CMP source.
 * Customize the CMP API interface, consent shape, and event names
 * for your specific CMP.
 */

/** CMP consent object -- adapt shape per CMP */
export interface CmpConsent {
  necessary?: boolean;
  functional?: boolean;
  performance?: boolean;
  advertising?: boolean;
  [category: string]: boolean | undefined;
}

/** CMP global API interface -- adapt per CMP */
export interface CmpAPI {
  consent: CmpConsent | null;
}

// TODO: Update global augmentation for your CMP's window object and events
declare global {
  interface Window {
    CmpName?: CmpAPI;
    [key: string]: CmpAPI | unknown;
  }

  interface WindowEventMap {
    cmp_init: Event; // TODO: Replace with CMP's init event name
    cmp_consent: CustomEvent<CmpConsent>; // TODO: Replace with CMP's consent event name
  }
}

/** Settings for CMP source */
export interface Settings {
  /** Map CMP categories to walkerOS consent groups */
  categoryMap?: Record<string, string>;

  /** Only process explicit consent (user made a choice). Default: true */
  explicitOnly?: boolean;

  /** Custom name for window.[CmpName] object. Default: 'CmpName' */
  globalName?: string;
}

/** All settings optional for user input */
export type InitSettings = Partial<Settings>;

/** No mapping configuration for CMP sources */
export interface Mapping {}

/** Push function type -- uses elb for consent commands */
export type Push = Elb.Fn;

/** Environment interface for CMP source */
export interface Env extends Source.BaseEnv {
  window?: Window & typeof globalThis;
}

/** Types bundle -- InitSettings as 5th param makes config.settings partial */
export type Types = Source.Types<Settings, Mapping, Push, Env, InitSettings>;

/** Config type alias */
export type Config = Source.Config<Types>;
