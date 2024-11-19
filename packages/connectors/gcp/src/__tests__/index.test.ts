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
      }[header];
    },
  } as GCPRequest;

  beforeEach(() => {});

  test('basic', async () => {
    expect(await connectorGCPHttpFunction(request)).toStrictEqual({
      city: 'Hamburg',
      country: 'DE',
      encoding: 'gzip',
      hash: expect.any(String),
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
    expect(first.hash).not.toEqual(second.hash);
  });

  test('hash', async () => {
    expect(
      await connectorGCPHttpFunction(request, { hash: 'fingerprint' }),
    ).toStrictEqual(
      expect.objectContaining({ fingerprint: expect.any(String) }),
    );
  });
});
