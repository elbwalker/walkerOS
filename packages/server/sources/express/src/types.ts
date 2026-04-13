import type { Lifecycle, WalkerOS, Source as CoreSource } from '@walkeros/core';
import type express from 'express';
import type cors from 'cors';
import type { Request, Response, Application } from 'express';
import type {
  SettingsSchema,
  CorsOptionsSchema,
  RouteConfigSchema,
} from './schemas';
import type { z } from '@walkeros/core/dev';

// Types inferred from Zod schemas
export type Settings = z.infer<typeof SettingsSchema>;
export type CorsOptions = z.infer<typeof CorsOptionsSchema>;
export type RouteConfig = z.infer<typeof RouteConfigSchema>;
export type RouteMethod = 'GET' | 'POST';
export type InitSettings = Partial<Settings>;

export interface Mapping {
  // Custom source event mapping properties
}

// Express-specific push type (uses Express Request/Response types)
export type Push = (req: Request, res: Response) => Promise<void>;

export interface Env extends CoreSource.Env {
  req?: Request;
  res?: Response;
  express?: typeof express;
  cors?: typeof cors;
}

// Type bundle (must be after Settings, Mapping, Push, Env are defined)
export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings
>;

// Convenience type exports
export type Config = CoreSource.Config<Types>;
export type PartialConfig = CoreSource.PartialConfig<Types>;

export interface ExpressSource extends Omit<
  CoreSource.Instance<Types>,
  'push'
> {
  push: Push;
  httpHandler: Application; // Standard http request handler for runner integration
  app: Application; // Expose Express app for advanced usage
  server?: ReturnType<Application['listen']>; // HTTP server (if port configured)
  destroy(context: Lifecycle.DestroyContext): Promise<void>;
}

// Event request/response types
export interface EventRequest {
  event: string;
  data?: WalkerOS.AnyObject;
  context?: WalkerOS.AnyObject;
  user?: WalkerOS.AnyObject;
  globals?: WalkerOS.AnyObject;
  consent?: WalkerOS.AnyObject;
}

export interface EventResponse {
  success: boolean;
  id?: string;
  timestamp?: number;
  error?: string;
}

export type RequestBody = EventRequest;
export type ResponseBody = EventResponse;
