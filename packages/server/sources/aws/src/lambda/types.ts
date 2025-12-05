import type { WalkerOS, Source as CoreSource } from '@walkeros/core';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import type { SettingsSchema, CorsOptionsSchema } from './schemas';
import { z } from '@walkeros/core/dev';

// Lambda event types
export type LambdaEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;
export type LambdaResult = APIGatewayProxyResult;
export type LambdaContext = Context;

// Types inferred from Zod schemas
export type Settings = z.infer<typeof SettingsSchema>;
export type CorsOptions = z.infer<typeof CorsOptionsSchema>;

// InitSettings: user input (all optional)
export type InitSettings = Partial<Settings>;

export interface Mapping {
  // Custom source event mapping properties
}

// Lambda-specific push type
export type Push = (
  event: LambdaEvent,
  context: LambdaContext,
) => Promise<LambdaResult>;

export interface Env extends CoreSource.Env {
  lambdaEvent?: LambdaEvent;
  lambdaContext?: LambdaContext;
}

// Type bundle (must be after Settings, Mapping, Push, Env are defined)
export type Types = CoreSource.Types<
  Settings,
  Mapping,
  Push,
  Env,
  InitSettings
>;

export interface LambdaSource extends Omit<CoreSource.Instance<Types>, 'push'> {
  push: Push;
}

// Convenience Config type
export type Config = CoreSource.Config<Types>;
export type PartialConfig = CoreSource.PartialConfig<Types>;

// Lambda source doesn't follow standard Source.Init pattern due to Lambda handler interface

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

// Parsed request data structure
export interface ParsedRequest {
  method: string;
  body: unknown;
  queryString: string | null;
  headers: Record<string, string>;
  isBase64Encoded: boolean;
}
