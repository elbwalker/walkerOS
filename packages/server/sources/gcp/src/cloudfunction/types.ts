import type { WalkerOS, Source as CoreSource } from '@walkeros/core';
import type { SettingsSchema, CorsOptionsSchema } from './schemas';
import { z } from '@walkeros/core/dev';

// Minimal request/response interfaces
export interface Request {
  method: string;
  body?: unknown;
  headers: Record<string, string | string[]>;
  get(name: string): string | undefined;
}

export interface Response {
  status(code: number): Response;
  json(body: unknown): Response;
  send(body?: unknown): Response;
  set(key: string, value: string): Response;
}

// Types inferred from Zod schemas
export type Settings = z.infer<typeof SettingsSchema>;
export type CorsOptions = z.infer<typeof CorsOptionsSchema>;

// InitSettings: user input (all optional)
export type InitSettings = Partial<Settings>;

export interface Mapping {
  // Custom source event mapping properties
}

// CloudFunction-specific push type
export type Push = (req: Request, res: Response) => Promise<void>;

export interface Env extends CoreSource.Env {
  req?: Request;
  res?: Response;
}

// Type bundle (must be after Settings, Mapping, Push, Env are defined)
export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings
>;

export interface CloudFunctionSource
  extends Omit<CoreSource.Instance<Types>, 'push'> {
  push: Push;
}

// Convenience Config type
export type Config = CoreSource.Config<Types>;
export type PartialConfig = CoreSource.PartialConfig<Types>;

// Cloud function source doesn't follow standard Source.Init pattern due to HTTP handler interface

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
  error?: string;
}

export type RequestBody = EventRequest;
export type ResponseBody = EventResponse;
