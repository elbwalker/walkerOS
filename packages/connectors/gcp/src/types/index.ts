import type { Request as GCPRequest } from '@google-cloud/functions-framework';

export type Request = GCPRequest;

export interface HttpFunction {
  hash?: string | false;
}
