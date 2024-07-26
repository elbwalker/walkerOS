import type { WalkerOS } from '@elbwalker/types';
import type { DestinationWebEtag } from '.';

import { request } from 'https';
import { WebClient } from '@elbwalker/walker.js';

describe('Destination etag', () => {
  let res;
  const prom = new Promise((resolve) => {
    res = resolve;
  });
  jest.useFakeTimers();
  jest.mock('@elbwalker/utils', () => ({
    ...jest.requireActual('@elbwalker/utils'),
    getId: () => Date.now(),
    sendWebAsFetch: jest.fn().mockImplementation(async (url, body, options) => {
      await makePostRequest(url, body, options.headers)
        .then(res)
        .catch((error) => console.error('Error:', error));
    }),
  }));

  let destination: DestinationWebEtag.Destination;
  const measurementId = 'G-QPQMHPW8HG';
  const url = 'https://webhook.site/fd6b8a62-f918-4938-aef3-25eb68ee013b?';
  // const url = 'https://server-side-tagging-ybbfvkxhia-ey.a.run.app/g/collect?';
  // const url = '';
  const debug = false;
  const date = new Date();
  const prefix = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  const origin = 'https://test.elbwalker.com';
  const referer = 'https://www.bing.com/';

  const event = {
    user: {
      //   id: prefix + 'us3r',
      device: prefix + 'd3v1c3',
      session: prefix + 's3ss10n',
      language: 'de-de',
      screenSize: '1512x982',
    },
    source: {
      id:
        origin +
        '?utm_campaign=cmap&utm_medium=med&utm_source=src&utm_content=cnt',
      previous_id: referer,
    },
  };

  function push(event: unknown, custom?: DestinationWebEtag.CustomConfig) {
    destination.push(
      event as WalkerOS.Event,
      custom ? { custom } : destination.config,
      undefined,
      {
        session: { isNew: true, isStart: true, count: 1 },
      } as WebClient.Instance,
    );
  }

  beforeEach(() => {
    destination = jest.requireActual('.').default;
    destination.config = {
      // custom: { measurementId, url, debug, params: {} },
      custom: {
        measurementId,
        url,
        debug,
        headers: {
          Cookie:
            'gtm_auth=GTM-TMXZKR5=IMGvcoy9KwPmsDzE3netlw; gtm_debug=GTM-TMXZKR5=190d956a7517e26bd28f0; gtm_preview=GTM-TMXZKR5=env-3',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
        paramsEvent: {
          'ep.jest': 'test',
        },
        // params: {
        //   cn: prefix + 'cn',
        //   cs: prefix + 'cs',
        //   cm: prefix + 'cm',
        //   cc: prefix + 'cc',
        // },
      },
    };
    document.title = prefix + 'Demo Site';
  });

  test('live', async () => {
    push({
      ...event,
      event: prefix + 'entity action',
      data: {
        foo: 'bar',
        bool: true,
        number: 6,
      },
      globals: {
        every: prefix + 'where',
      },
      context: {
        env: [prefix + 'dev', 0],
      },
    });

    await prom;

    expect(1).toBe(1);
  });

  function makePostRequest(
    url: string,
    data: object | null,
    headers: object,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObject = new URL(url);

      const options = {
        hostname: urlObject.hostname,
        path: urlObject.pathname + urlObject.search,
        method: 'POST',
        headers: {
          ...headers,
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'no-cors',
          'sec-fetch-site': 'cross-site',
          Origin: origin,
          Referer: referer,
        },
      };

      const req = request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          resolve(responseData);
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      if (data) req.write(data);

      req.end();
    });
  }
});
