import type { Destination, WalkerOS } from '@walkeros/core';
import { isObject } from '@walkeros/core';

export type DataLayerPush = Record<string, unknown> & {
  event: string;
  _clear: true;
};

// Keys left out while empty: with _clear an empty object would wipe a site's
// own key of that name, and sites often set their own `user`. Every other key
// is always pushed, so an empty `data` or `globals` wipes the previous values.
const OMIT_WHEN_EMPTY = ['user', 'consent'];

const isEmptyObject = (value: unknown): boolean =>
  isObject(value) && Object.keys(value).length === 0;

// The page's dataLayer array, created when there is none. Read at push time:
// a page may reassign window.dataLayer after load.
function getDataLayer(): unknown[] {
  const existing: unknown = Reflect.get(window, 'dataLayer');
  if (Array.isArray(existing)) return existing;
  const dataLayer: unknown[] = [];
  Reflect.set(window, 'dataLayer', dataLayer);
  return dataLayer;
}

export function toDataLayerPush(event: WalkerOS.Event): DataLayerPush {
  const push: DataLayerPush = { event: event.name, _clear: true };
  for (const [key, value] of Object.entries(event)) {
    if (!OMIT_WHEN_EMPTY.includes(key) || !isEmptyObject(value))
      push[key] = value;
  }
  // `event` and `_clear` are set first for readability in GTM Preview and
  // cannot be overwritten: a walkerOS event has neither key.
  return push;
}

export function dataLayerDestination(): Destination.Instance {
  getDataLayer();
  return {
    type: 'dataLayer',
    config: {},
    push: (event) => {
      getDataLayer().push(toDataLayerPush(event));
    },
  };
}
