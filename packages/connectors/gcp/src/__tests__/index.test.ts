import type { Request as GCPRequest } from '@google-cloud/functions-framework';
import { connectorGCPHttpFunction } from '..';

describe('connector GCP', () => {
  const request: GCPRequest = {
    get: (header: string) => {
      return {
        origin: 'localhost',
        'X-Real-Ip': '127.0.0.1',
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'ts',
        'Accept-Encoding': 'gzip',
        'X-AppEngine-Country': 'DE',
        'X-AppEngine-Region': 'Hamburg',
        'X-AppEngine-City': 'Hamburg',
        'X-Custom-Header': 'custom',
      }[header];
    },
  } as GCPRequest;

  beforeEach(() => {});

  test('basic', async () => {
    expect(await connectorGCPHttpFunction(request)).toStrictEqual({
      city: 'Hamburg',
      country: 'DE',
      encoding: 'gzip',
      ip: '127.0.0.0',
      language: 'ts',
      origin: 'localhost',
      region: 'Hamburg',
      userAgent: 'Mozilla/5.0',
    });
  });

  test('anonymizeIp', async () => {
    const first = await connectorGCPHttpFunction(request, {
      anonymizeIp: true,
    });
    const second = await connectorGCPHttpFunction(request, {
      anonymizeIp: false,
    });

    expect(first).toStrictEqual(expect.objectContaining({ ip: '127.0.0.0' }));
    expect(second).toStrictEqual(expect.objectContaining({ ip: '127.0.0.1' }));
  });

  test('mapping', async () => {
    const context = await connectorGCPHttpFunction(request, {
      mapping: {
        origin: 'foo',
        'X-Real-Ip': false,
        'X-Custom-Header': 'custom',
      },
    });

    expect(context).toStrictEqual(
      expect.objectContaining({ foo: 'localhost', custom: 'custom' }),
    );
    expect(context.ip).toBeUndefined();
  });
});
