import type { WalkerOS } from '@walkeros/core';
import type { StorageType } from '@walkeros/core';
import { castValue, Const } from '@walkeros/core';

export interface StorageValue {
  e: number; // Expiration timestamp
  v: string; // Value
}

export interface StorageEnv {
  window?: Window & typeof globalThis;
  document?: Document;
}

export function storageDelete(
  key: string,
  storage: StorageType = Const.Utils.Storage.Session,
  env?: StorageEnv,
) {
  switch (storage) {
    case Const.Utils.Storage.Cookie:
      storageWrite(key, '', 0, storage, undefined, env);
      break;
    case Const.Utils.Storage.Local:
      (env?.window ?? window).localStorage.removeItem(key);
      break;
    case Const.Utils.Storage.Session:
      (env?.window ?? window).sessionStorage.removeItem(key);
      break;
  }
}

export function storageRead(
  key: string,
  storage: StorageType = Const.Utils.Storage.Session,
  env?: StorageEnv,
): WalkerOS.PropertyType {
  // Helper function for local and session storage to support expiration
  function parseItem(string: string | null): StorageValue {
    try {
      return JSON.parse(string || '');
    } catch (err) {
      let e = 1,
        v = '';

      // Remove expiration date
      if (string) {
        e = 0;
        v = string;
      }

      return { e, v };
    }
  }
  let value, item;

  switch (storage) {
    case Const.Utils.Storage.Cookie:
      value = decodeURIComponent(
        (env?.document ?? document).cookie
          .split('; ')
          .find((row) => row.startsWith(key + '='))
          ?.split('=')[1] || '',
      );
      break;
    case Const.Utils.Storage.Local:
      item = parseItem((env?.window ?? window).localStorage.getItem(key));
      break;
    case Const.Utils.Storage.Session:
      item = parseItem((env?.window ?? window).sessionStorage.getItem(key));
      break;
  }

  // Check if item is expired
  if (item) {
    value = item.v;

    if (item.e != 0 && item.e < Date.now()) {
      storageDelete(key, storage, env);
      value = ''; // Conceal the outdated value
    }
  }

  return castValue(value || '');
}

export function storageWrite(
  key: string,
  value: WalkerOS.PropertyType,
  maxAgeInMinutes = 30,
  storage: StorageType = Const.Utils.Storage.Session,
  domain?: string,
  env?: StorageEnv,
): WalkerOS.PropertyType {
  const e = Date.now() + 1000 * 60 * maxAgeInMinutes;
  const item: StorageValue = { e, v: String(value) };
  const stringifiedItem = JSON.stringify(item);

  switch (storage) {
    case Const.Utils.Storage.Cookie: {
      value = typeof value === 'object' ? JSON.stringify(value) : value;
      let cookie = `${key}=${encodeURIComponent(value)}; max-age=${
        maxAgeInMinutes * 60
      }; path=/; SameSite=Lax; secure`;

      if (domain) cookie += '; domain=' + domain;

      (env?.document ?? document).cookie = cookie;
      break;
    }
    case Const.Utils.Storage.Local:
      (env?.window ?? window).localStorage.setItem(key, stringifiedItem);
      break;
    case Const.Utils.Storage.Session:
      (env?.window ?? window).sessionStorage.setItem(key, stringifiedItem);
      break;
  }

  return storageRead(key, storage, env);
}
