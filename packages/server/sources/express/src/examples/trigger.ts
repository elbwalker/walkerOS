import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

export interface Content {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface Result {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Discover the port of a running HTTP server from the collector's sources.
 * Scans all registered sources for one with a `server` property (express pattern).
 */
function discoverPort(collector: Collector.Instance): number | undefined {
  for (const source of Object.values(collector.sources || {})) {
    const s = source as { server?: { address(): { port: number } | string } };
    if (s.server) {
      const addr = s.server.address();
      if (typeof addr === 'object' && addr !== null) return addr.port;
    }
  }
  return undefined;
}

/**
 * Express source createTrigger.
 *
 * Boots a real express server via startFlow, then fires real HTTP requests.
 * Blackbox: no source instance access, no mocked req/res — just fetch().
 *
 * Pass `port: 0` in the express source settings to use a random available port.
 *
 * @example
 * const { trigger, flow } = await createTrigger(config);
 * const result = await trigger('POST')({ path: '/collect', body: { name: 'page view' } });
 * console.log(result.status, result.body);
 */
const createTrigger: Trigger.CreateFn<Content, Result> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;
  let baseUrl: string | undefined;

  const trigger: Trigger.Fn<Content, Result> =
    () =>
    async (content: Content): Promise<Result> => {
      const method = content.method || 'POST';

      // Lazy startFlow — first call boots the server
      if (!flow) {
        const result = await startFlow(config);
        flow = { collector: result.collector, elb: result.elb };

        const port = discoverPort(result.collector);
        if (!port)
          throw new Error(
            'Express source server not found — ensure port is configured in source settings',
          );
        baseUrl = `http://localhost:${port}`;
      }

      // Build URL
      let url = `${baseUrl}${content.path}`;
      if (content.query) {
        url += `?${new URLSearchParams(content.query).toString()}`;
      }

      // Build fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...content.headers,
        },
      };
      if (method !== 'GET' && method !== 'HEAD' && content.body !== undefined) {
        fetchOptions.body = JSON.stringify(content.body);
      }

      // Real HTTP request
      const response = await fetch(url, fetchOptions);

      // Capture response
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let body: unknown;
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      return {
        status: response.status,
        body,
        headers: responseHeaders,
      };
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

export { createTrigger };
