import type { WalkerOS, Source as CoreSource } from '@walkeros/core';
import type { Request, Response, Application } from 'express';
import type { SettingsSchema, CorsOptionsSchema } from './schemas';
import { z } from '@walkeros/core/dev';

// Types inferred from Zod schemas
export type Settings = z.infer<typeof SettingsSchema>;
export type CorsOptions = z.infer<typeof CorsOptionsSchema>;

export interface Mapping {
  // Custom source event mapping properties
}

// Express-specific push type (uses Express Request/Response types)
export type Push = (req: Request, res: Response) => Promise<void>;

export interface Env extends CoreSource.Env {
  req?: Request;
  res?: Response;
}

// Type bundle (must be after Settings, Mapping, Push, Env are defined)
export type Types = CoreSource.Types<Settings, Mapping, Push, Env>;

export interface ExpressSource
  extends Omit<CoreSource.Instance<Types>, 'push'> {
  push: Push;
  app: Application; // Expose Express app for advanced usage
  server?: ReturnType<Application['listen']>; // HTTP server (if port configured)
}

export type PartialConfig = CoreSource.PartialConfig<Types>;

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
