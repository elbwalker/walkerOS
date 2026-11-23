import type { AddressInfo } from 'net';
import type { IncomingMessage, Server, ServerResponse } from 'http';
import http from 'http';
import { getEvent } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import destination from '..';

interface Received {
  method?: string;
  url?: string;
  body: string;
}

describe('without env, against a local Matomo', () => {
  let server: Server;
  let received: Received[];

  beforeEach(async () => {
    received = [];
    server = http.createServer(
      (request: IncomingMessage, response: ServerResponse) => {
        let body = '';
        request.on('data', (chunk) => (body += String(chunk)));
        request.on('end', () => {
          received.push({ method: request.method, url: request.url, body });
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end('{"status":"success","tracked":1,"invalid":0}');
        });
      },
    );
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('posts one bulk request to matomo.php', async () => {
    const { port }: AddressInfo = (() => {
      const address = server.address();
      if (address === null || typeof address === 'string')
        throw new Error('no port');
      return address;
    })();
    const config = JSON.parse(
      JSON.stringify({
        settings: { url: `http://127.0.0.1:${port}/`, siteId: '1' },
      }),
    );
    const { collector } = await startFlow({
      destinations: { matomo: { code: destination, config } },
    });

    const result = await collector.push(getEvent('page view'));

    expect(result.done?.matomo).toBeDefined();
    expect(received).toHaveLength(1);
    const [{ method, url, body }] = received;
    expect(method).toBe('POST');
    expect(url).toBe('/matomo.php');
    const parsed: unknown = JSON.parse(body);
    expect(parsed).toEqual({ requests: [expect.any(String)] });
    expect(JSON.stringify(parsed)).toContain('"?idsite=1&rec=1&apiv=1');
  });
});
