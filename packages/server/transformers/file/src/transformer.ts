import type { RespondOptions, Store, Transformer } from '@walkeros/core';
import { StepError } from '@walkeros/core';
import { getMimeType } from './mime';
import type { FileSettings, Types } from './types';

// The answers for a path the step owns but cannot serve, in the express
// source's own error shape. `no-store` keeps a browser or proxy from holding
// on to a missing or briefly unavailable file. `settings.headers` are for
// served files and are not applied here.
const notFound: RespondOptions = {
  status: 404,
  body: { success: false, error: 'Not found' },
  headers: { 'Cache-Control': 'no-store' },
};

const unavailable: RespondOptions = {
  status: 503,
  body: { success: false, error: 'Service unavailable' },
  headers: { 'Cache-Control': 'no-store' },
};

/** A store the step can read from: an object with a `get` function. */
function isStore(value: unknown): value is Store.Instance {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    typeof value.get === 'function'
  );
}

export const transformerFile: Transformer.Init<Types> = (context) => {
  const { config } = context;
  const settings: Partial<FileSettings> = config.settings || {};
  const prefix = settings.prefix;
  const defaultHeaders = settings.headers;
  const mimeOverrides = settings.mimeTypes;

  // Without a store every request would fail: a missing store, or a
  // `$store.<id>` reference that did not resolve (a plain string), stops the
  // flow at startup instead.
  const store: unknown = context.env.store;
  if (!isStore(store))
    throw new StepError('Config env store missing', { code: 'config' });

  return {
    type: 'file',
    config,

    async push(event, context) {
      const respond = context.env.respond;

      const rawPath = context.ingest.path;
      if (typeof rawPath !== 'string' || !rawPath) return;

      // A prefix declares ownership: a path inside it is answered, a miss
      // with a 404. Without a prefix the step owns nothing and a miss passes on.
      let filePath = rawPath;
      if (prefix) {
        if (!filePath.startsWith(prefix)) return; // Not our path
        filePath = filePath.slice(prefix.length);
      }

      // Strip leading slash for store key
      if (filePath.startsWith('/')) filePath = filePath.slice(1);
      if (!filePath) return;

      let content: Store.StoreValue | undefined;
      try {
        content = await store.get(filePath);
      } catch (error) {
        // Answer the request, then fail the push with the store's own error:
        // the collector reports it and counts it as failed.
        respond?.(unavailable);
        throw error;
      }

      if (content == null) {
        if (!prefix) return;
        respond?.(notFound);
        return false;
      }

      // Derive Content-Type
      const contentType = getMimeType(filePath, mimeOverrides);
      const contentLength =
        content instanceof Buffer
          ? content.length
          : typeof content === 'string'
            ? Buffer.byteLength(content)
            : undefined;

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        ...defaultHeaders,
      };
      if (contentLength !== undefined) {
        headers['Content-Length'] = String(contentLength);
      }

      respond?.({
        body: content,
        status: 200,
        headers,
      });

      return false;
    },
  };
};
