import type { Source as CoreSource, WalkerOS } from '@walkeros/core';

/**
 * Type definitions for a server source (an HTTP handler: a fetch `Request`
 * in, a `Response` out). Customize for your platform's requirements.
 */

/** The body the platform sends: adapt to its documented format. */
export interface Input {
  event: string;
  properties?: WalkerOS.Properties;
  userId?: string;
}

/** The source's settings: add the ones it reads (none in this template). */
export interface Settings {}

export type InitSettings = Partial<Settings>;

export interface Mapping {}

/** The source's push: the HTTP handler a server or runtime calls. */
export type Push = (request: Request) => Promise<Response>;

export interface Env extends CoreSource.BaseEnv {}

export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings
>;

export type Config = CoreSource.Config<Types>;
