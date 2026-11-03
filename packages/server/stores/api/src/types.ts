import type { Store } from '@walkeros/core';

export interface ApiStoreSettings {
  /**
   * Absolute `http:` or `https:` URL with exactly one `{key}` placeholder
   * after the host, e.g. `https://crm.example.com/customers/{key}` or
   * `https://crm.example.com/customers?id={key}`. The URL-encoded key is the
   * only variable part.
   */
  url: string;
}

/** Sent as `Authorization: Bearer <token>`; back it with `$secret.NAME`. */
export interface ApiStoreCredentials {
  token: string;
}

/**
 * Injected dependencies (tests, simulate). Every request goes through
 * `fetch`; without it the global `fetch` is used.
 */
export interface ApiStoreEnv extends Store.BaseEnv {
  fetch?: typeof fetch;
}

export type Types = Store.Types<
  ApiStoreSettings,
  ApiStoreEnv,
  ApiStoreSettings,
  unknown,
  ApiStoreCredentials
>;
