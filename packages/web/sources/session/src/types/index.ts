import type { Source, Elb } from '@walkeros/core';
import type { SessionConfig } from '@walkeros/web-core';

// Settings: configuration for session source
export interface Settings extends SessionConfig {
  // All settings inherited from SessionConfig:
  // - consent?: string | string[]
  // - storage?: boolean
  // - cb?: SessionCallback | false
  // - pulse?: boolean
  // - sessionStorage?: 'local' | 'session'
  // - deviceStorage?: 'local' | 'session'
  // - sessionKey?: string
  // - deviceKey?: string
  // - length?: number (session timeout in minutes)
}

// InitSettings: user input (all optional)
export type InitSettings = Partial<Settings>;

export interface Mapping {}

export type Push = Elb.Fn;

export interface Env extends Source.BaseEnv {}

export type Types = Source.Types<Settings, Mapping, Push, Env, InitSettings>;

export type Config = Source.Config<Types>;

// Re-export session types from web-core
export type { SessionConfig, SessionCallback } from '@walkeros/web-core';
