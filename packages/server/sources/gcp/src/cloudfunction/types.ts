import type { WalkerOS, Source as CoreSource } from '@walkeros/core';

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

export interface Settings {
  cors?: boolean | CorsOptions;
  timeout?: number;
}

export interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

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
export type Types = CoreSource.Types<Settings, Mapping, Push, Env>;

export interface CloudFunctionSource
  extends Omit<CoreSource.Instance<Types>, 'push'> {
  push: Push;
}

// Removed custom Config type - using Source.Config<Types> directly
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
