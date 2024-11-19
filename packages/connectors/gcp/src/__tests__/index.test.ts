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

  test('init new', () => {
    expect(connectorGCPHttpFunction(request)).toStrictEqual({
      city: 'Hamburg',
      country: 'DE',
      encoding: 'gzip',
      ip: '127.0.0.1',
      language: 'ts',
      origin: 'localhost',
      region: 'Hamburg',
      userAgent: 'Mozilla/5.0',
    });
  });
});
