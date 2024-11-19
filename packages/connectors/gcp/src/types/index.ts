import type { Request as GCPRequest } from '@google-cloud/functions-framework';

export type Request = GCPRequest;

export interface HttpFunction {
  anonymizeIp?: boolean;
  hash?: string | false;
}
