import type { Request } from '@elbwalker/types';
import type { Request as GCPRequest } from '@google-cloud/functions-framework';

export * as ConnectorGCP from './types';

export function connectorGCPHttpFunction(request: GCPRequest): Request.Context {
  const context: Request.Context = {};
  const headerMapping: Record<string, keyof typeof context> = {
    origin: 'origin',
    'X-Real-Ip': 'ip',
    'User-Agent': 'userAgent',
    'Accept-Language': 'language',
    'Accept-Encoding': 'encoding',
    'X-AppEngine-Country': 'country',
    'X-AppEngine-Region': 'region',
    'X-AppEngine-City': 'city',
  };

  Object.entries(headerMapping).forEach(([header, key]) => {
    const value = request.get(header);
    if (value) context[key] = value;
  });

  return context;
}
