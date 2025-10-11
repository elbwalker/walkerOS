import type { WalkerOS, Source } from '@walkeros/core';

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

// CloudFunction-specific push type
export type Push = (req: Request, res: Response) => Promise<void>;

export interface CloudFunctionSource
  extends Omit<Source.Instance<Settings, Mapping>, 'push'> {
  push: Push;
}

// Removed custom Config type - using Source.Config<Settings, Mapping> directly
export type PartialConfig = Source.PartialConfig<Settings, Mapping>;

export interface Mapping {
  // Custom source event mapping properties
}

// Cloud function source doesn't follow standard Source.Init pattern due to HTTP handler interface

export interface Env extends Source.Env {
  req?: Request;
  res?: Response;
}

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
