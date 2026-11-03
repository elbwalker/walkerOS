import type { Store } from '@walkeros/core';
import { StepError, isObject, isStoreValue } from '@walkeros/core';
import type { ApiStoreCredentials, Types } from './types';

const PLACEHOLDER = '{key}';

/** How long one request may take, in ms. */
const TIMEOUT = 5000;

function configError(message: string): StepError {
  return new StepError(message, { code: 'config' });
}

/**
 * The parts of `settings.url` around its one `{key}`. The URL must be an
 * absolute http or https URL whose placeholder comes after the host: the
 * text before it starts with the URL's origin followed by `/` or `?`, so a
 * key can never change which host is asked.
 */
function parseUrl(url: unknown): {
  url: string;
  before: string;
  after: string;
} {
  if (typeof url !== 'string' || !url)
    throw configError('Config settings url missing');
  const index = url.indexOf(PLACEHOLDER);
  if (index < 0 || url.indexOf(PLACEHOLDER, index + 1) >= 0)
    throw configError(
      'Config settings url needs exactly one {key} placeholder',
    );
  let parsed: URL;
  try {
    parsed = new URL(url.replace(PLACEHOLDER, 'key'));
  } catch {
    throw configError('Config settings url is not an absolute URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    throw configError('Config settings url must use http or https');
  const before = url.slice(0, index);
  const { origin } = parsed;
  const next = before.charAt(origin.length);
  // A {key} in the fragment is never sent: every key would ask one URL.
  if (
    before.slice(0, origin.length).toLowerCase() !== origin ||
    (next !== '/' && next !== '?') ||
    before.includes('#')
  )
    throw configError(
      'Config settings url must place {key} after the host, in the path or the query',
    );
  return { url, before, after: url.slice(index + PLACEHOLDER.length) };
}

function isCredentials(value: unknown): value is ApiStoreCredentials {
  return (
    isObject(value) && typeof value.token === 'string' && value.token !== ''
  );
}

/** No credentials: no header. Anything else must be `{ token }`. */
function authorization(credentials: unknown): string | undefined {
  if (credentials === undefined) return undefined;
  if (!isCredentials(credentials))
    throw configError('Config credentials must be { token } with a token');
  return `Bearer ${credentials.token}`;
}

/** An empty key, or one with a `.` or `..` segment, is never requested. */
function isValidKey(key: string): boolean {
  if (!key) return false;
  return !key.split(/[/\\]/).some((part) => part === '.' || part === '..');
}

function requestFailed(cause: unknown): StepError {
  return new StepError('API request failed', { code: 'transport', cause });
}

/** An API answer that is neither a success nor a miss, with its status. */
function failedResponse(res: Response): StepError {
  return new StepError(`API read failed (HTTP ${res.status})`, {
    code: 'transport',
    status: res.status,
  });
}

function decodeError(cause?: unknown): StepError {
  return new StepError('API value could not be decoded', {
    code: 'decode',
    retryable: false,
    cause,
  });
}

/**
 * The parsed body. JSON `null` is a miss: it would otherwise replace the
 * whole `state` target. A body that does not parse is a failed read.
 */
function decode(text: string): Store.StoreValue | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    throw decodeError(err);
  }
  if (value === null) return undefined;
  if (!isStoreValue(value)) throw decodeError();
  return value;
}

export const storeApiInit: Store.Init<Types> = (context) => {
  const { config, logger } = context;
  if (config.file === true)
    throw configError(
      'API store does not support file mode (file: true): it reads structured JSON',
    );
  const { url, before, after } = parseUrl(config.settings?.url);
  const auth = authorization(config.credentials);
  // An injected fetch (tests, simulate) carries every request; the global
  // fetch is the runtime default.
  const doFetch = context.env?.fetch ?? config.env?.fetch ?? fetch;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (auth) headers.Authorization = auth;

  const readOnly = async (): Promise<never> => {
    throw configError('API store is read-only');
  };

  return {
    type: 'api',
    config: {
      // Credentials stay out: the token lives only in the request headers.
      settings: { url },
      env: config.env,
      id: config.id,
      logger: config.logger,
    },

    async get(key: string): Promise<Store.StoreValue | undefined> {
      if (!isValidKey(key)) {
        logger.debug('API store key rejected without a request');
        return undefined;
      }
      let res: Response;
      try {
        // A redirect fails the request: it is a misconfiguration, and the
        // one way the token could leave the configured origin.
        res = await doFetch(before + encodeURIComponent(key) + after, {
          method: 'GET',
          headers,
          redirect: 'error',
          signal: AbortSignal.timeout(TIMEOUT),
        });
      } catch (err) {
        throw requestFailed(err);
      }
      // 404 and 204 are a miss; any other failed read is reported.
      if (res.status === 404 || res.status === 204) return undefined;
      if (!res.ok) throw failedResponse(res);
      let text: string;
      try {
        text = await res.text();
      } catch (err) {
        throw requestFailed(err);
      }
      return decode(text);
    },

    set: readOnly,
    delete: readOnly,
  };
};
