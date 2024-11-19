import type { Request } from '@google-cloud/functions-framework';

export * as ConnectorGCP from './types';

export function connectorGCPHttpFunction(request: Request): undefined {
  console.log('🚀 ~ request:', request);
  return;
}
