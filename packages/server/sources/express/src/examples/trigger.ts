import type { Trigger, Collector } from '@walkeros/core';
import { isObject } from '@walkeros/core';
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
 * The config with the triggered express source on a free port (0) when it
 * names none, so a simulation needs no port setting. The source is the one
 * `options.sourceId` names, else the config's only source. A configured port
 * and every other source stay as given.
 */
function withFreePort(
  config: Collector.InitConfig,
  options: unknown,
): Collector.InitConfig {
  const sources = config.sources ?? {};
  const ids = Object.keys(sources);
  const sourceId =
    isObject(options) && typeof options.sourceId === 'string'
      ? options.sourceId
      : ids.length === 1
        ? ids[0]
        : undefined;
  const source = sourceId ? sources[sourceId] : undefined;
  if (!sourceId || !source) return config;

  const sourceConfig = source.config ?? {};
  const settings = isObject(sourceConfig.settings) ? sourceConfig.settings : {};
  if (settings.port !== undefined) return config;

  return {
    ...config,
    sources: {
      ...sources,
      [sourceId]: {
        ...source,
        config: { ...sourceConfig, settings: { ...settings, port: 0 } },
      },
    },
  };
}

/**
 * Express source createTrigger.
 *
 * Boots a real express server via startFlow, then fires real HTTP requests.
 * Blackbox: no source instance access, no mocked req/res — just fetch().
 *
 * Without `settings.port` the triggered source listens on a free port.
 *
 * @example
 * const { trigger, flow } = await createTrigger(config);
 * const result = await trigger('POST')({ path: '/collect', body: { name: 'page view' } });
 * console.log(result.status, result.body);
 */
const createTrigger: Trigger.CreateFn<Content, Result> = async (
  initConfig: Collector.InitConfig,
  options?: unknown,
) => {
  const config = withFreePort(initConfig, options);
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
            'Express source server not found: the triggered source did not start a server',
          );
        baseUrl = `http://localhost:${port}`;
      }

      // Build URL
      let url = `${baseUrl}${content.path}`;
      if (content.query) {
        url += `?${new URLSearchParams(content.query).toString()}`;
      }

      // Build fetch options — only set default Content-Type if user doesn't provide one
      const hasContentType =
        content.headers &&
        Object.keys(content.headers).some(
          (k) => k.toLowerCase() === 'content-type',
        );
      const fetchOptions: RequestInit = {
        method,
        headers: {
          ...(hasContentType ? {} : { 'Content-Type': 'application/json' }),
          ...content.headers,
        },
      };
      if (method !== 'GET' && method !== 'HEAD' && content.body !== undefined) {
        // String bodies sent raw (e.g., base64 beacon with text/plain).
        // Object bodies JSON-serialized.
        fetchOptions.body =
          typeof content.body === 'string'
            ? content.body
            : JSON.stringify(content.body);
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
