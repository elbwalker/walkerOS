import type { WalkerOS } from '@elbwalker/types';
import type { StorageType } from '../core/constants';
import Const from '../core/constants';
import { castValue } from '../core/castValue';

export interface StorageValue {
  e: number; // Expiration timestamp
  v: string; // Value
}

export function storageDelete(
  key: string,
  storage: StorageType = Const.Utils.Storage.Session,
) {
  switch (storage) {
    case Const.Utils.Storage.Cookie:
      storageWrite(key, '', 0, storage);
      break;
    case Const.Utils.Storage.Local:
      window.localStorage.removeItem(key);
      break;
    case Const.Utils.Storage.Session:
      window.sessionStorage.removeItem(key);
      break;
  }
}

export function storageRead(
  key: string,
  storage: StorageType = Const.Utils.Storage.Session,
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
        document.cookie
          .split('; ')
          .find((row) => row.startsWith(key + '='))
          ?.split('=')[1] || '',
      );
      break;
    case Const.Utils.Storage.Local:
      item = parseItem(window.localStorage.getItem(key));
      break;
    case Const.Utils.Storage.Session:
      item = parseItem(window.sessionStorage.getItem(key));
      break;
  }

  // Check if item is expired
  if (item) {
    value = item.v;

    if (item.e != 0 && item.e < Date.now()) {
      storageDelete(key, storage); // Remove item
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

      document.cookie = cookie;
      break;
    }
    case Const.Utils.Storage.Local:
      window.localStorage.setItem(key, stringifiedItem);
      break;
    case Const.Utils.Storage.Session:
      window.sessionStorage.setItem(key, stringifiedItem);
      break;
  }

  return storageRead(key, storage);
}
