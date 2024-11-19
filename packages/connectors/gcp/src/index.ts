import type { Request } from '@elbwalker/types';
import type { Request as GCPRequest } from '@google-cloud/functions-framework';
import type { HttpFunction } from './types';
import { getHashNode, isDefined } from '@elbwalker/utils';

export * as ConnectorGCP from './types';

export async function connectorGCPHttpFunction(
  request: GCPRequest,
  options: HttpFunction = { hash: 'hash' },
): Promise<Request.Context> {
  const context: Request.Context = {};
  const { hash } = options;

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
    if (isDefined(value)) context[key] = value;
  });

  if (hash)
    context[hash as keyof Request.Context] = await getHashNode(
      '' +
        new Date().getDate() + // day of the month
        context.origin +
        context.userAgent +
        context.language +
        context.encoding +
        context.ip,
    );

  return context;
}
