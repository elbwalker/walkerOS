import { buildScope } from '../scope';
import { createMockEventV1, createMockEventV2 } from './fixtures';

const body = JSON.stringify({ name: 'page view' });
const headers = {
  Host: 'x.example',
  'User-Agent': 'UA',
  'X-Forwarded-Proto': 'https',
};

// The same logical request in both API Gateway envelopes.
const v1 = createMockEventV1('POST', body, { a: '1' }, headers);
const v2 = createMockEventV2('POST', body, 'a=1', {
  host: 'x.example',
  'user-agent': 'UA',
  'x-forwarded-proto': 'https',
});

describe('buildScope', () => {
  it.each([
    ['v1', v1],
    ['v2', v2],
  ])('%s produces the same scope', (_, event) => {
    expect(buildScope(event)).toEqual({
      method: 'POST',
      url: 'https://x.example/collect?a=1',
      path: '/collect',
      query: { a: '1' },
      headers: {
        host: 'x.example',
        'user-agent': 'UA',
        'x-forwarded-proto': 'https',
      },
      body: { name: 'page view' },
      ip: '127.0.0.1',
      raw: event,
    });
  });

  it('decodes a base64 body', () => {
    const event = createMockEventV2(
      'POST',
      Buffer.from(body).toString('base64'),
      '',
      headers,
    );
    event.isBase64Encoded = true;

    expect(buildScope(event).body).toEqual({ name: 'page view' });
  });

  it('joins repeated v1 headers instead of keeping only the last', () => {
    const event = createMockEventV1('POST', body, undefined, headers);
    event.multiValueHeaders = { 'X-Forwarded-For': ['1.2.3.4', '5.6.7.8'] };

    expect(buildScope(event).headers['x-forwarded-for']).toBe(
      '1.2.3.4, 5.6.7.8',
    );
  });

  it('joins repeated v1 query keys instead of keeping only the last', () => {
    const event = createMockEventV1('POST', body, { a: '2' }, headers);
    event.multiValueQueryStringParameters = { a: ['1', '2'] };

    expect(buildScope(event).query.a).toBe('1,2');
  });
});
