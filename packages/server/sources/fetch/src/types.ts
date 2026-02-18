import type { WalkerOS, Source as CoreSource } from '@walkeros/core';
import type {
  SettingsSchema,
  CorsOptionsSchema,
  RouteConfigSchema,
} from './schemas';
import { z } from '@walkeros/core/dev';

export type Settings = z.infer<typeof SettingsSchema>;
export type CorsOptions = z.infer<typeof CorsOptionsSchema>;
export type RouteConfig = z.infer<typeof RouteConfigSchema>;
export type RouteMethod = 'GET' | 'POST';
export type InitSettings = Partial<Settings>;

export interface Mapping {}

export type Push = (request: Request) => Response | Promise<Response>;

export interface Env extends CoreSource.Env {
  request?: Request;
}

export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings
>;
export type Config = CoreSource.Config<Types>;
export type PartialConfig = CoreSource.PartialConfig<Types>;

export interface FetchSource extends Omit<CoreSource.Instance<Types>, 'push'> {
  push: Push;
}

export interface EventResponse {
  success: boolean;
  id?: string;
  timestamp?: number;
  error?: string;
}
