import type { Transformer } from '@walkeros/core';
import type { RespondFn } from '@walkeros/core';
import { getMimeType } from './mime';
import type { FileSettings, FileEnv, Types } from './types';

export const transformerFile: Transformer.Init<Types> = (context) => {
  const { config } = context;
  const settings = (config.settings || {}) as Partial<FileSettings>;
  const prefix = settings.prefix;
  const defaultHeaders = settings.headers;
  const mimeOverrides = settings.mimeTypes;

  const store = (context.env as FileEnv).store;

  return {
    type: 'file',
    config: config as Transformer.Config<Types>,

    async push(event, context) {
      const { logger } = context;
      const ingest = (context.ingest || {}) as Record<string, unknown>;
      const envRespond = context.env.respond as RespondFn | undefined;

      const rawPath = ingest.path as string | undefined;
      if (!rawPath) return;

      if (!store) {
        logger.warn('No store provided to file transformer');
        return;
      }

      // Apply prefix stripping
      let filePath = rawPath;
      if (prefix) {
        if (!filePath.startsWith(prefix)) return; // Not our path
        filePath = filePath.slice(prefix.length);
      }

      // Strip leading slash for store key
      if (filePath.startsWith('/')) filePath = filePath.slice(1);
      if (!filePath) return;

      // Fetch from store
      const content = await store.get(filePath);
      if (content == null) return;

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

      envRespond?.({
        body: content,
        status: 200,
        headers,
      });

      return false;
    },
  };
};
