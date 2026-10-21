import type { ObserveSlot } from '@walkeros/core';
import { OBSERVE_STORAGE_KEY } from '@walkeros/core';

/**
 * Last `elbObserve` URL param value, or null. The param name and the
 * storage slot share the `elbObserve` key by design (the preview activator
 * ferries the former into the latter). Never throws.
 */
function readObserveParam(): string | null {
  try {
    const search = new URLSearchParams(
      window.location.search.replace(/^\?/, ''),
    );
    const values = search.getAll(OBSERVE_STORAGE_KEY);
    return values.length > 0 ? (values[values.length - 1] ?? null) : null;
  } catch {
    return null;
  }
}

/** Stored `elbObserve` slot, or null. Never throws (Safari private mode). */
function readObserveSlot(): string | null {
  try {
    return window.localStorage.getItem(OBSERVE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeObserveSlot(value: string): void {
  try {
    window.localStorage.setItem(OBSERVE_STORAGE_KEY, value);
  } catch {
    // Slot persistence is best-effort; the session still attaches this page.
  }
}

/**
 * CAS-style slot clear: remove the slot only when it still holds exactly
 * `expected`, so a credential re-minted by another tab (or a later
 * activation) is never destroyed by a stale poster's self-heal.
 */
function clearObserveSlotIf(expected: string): void {
  try {
    if (window.localStorage.getItem(OBSERVE_STORAGE_KEY) === expected) {
      window.localStorage.removeItem(OBSERVE_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable: nothing to heal.
  }
}

/**
 * Remove the `elbObserve` param from the address bar after it has been
 * persisted to the slot, keeping every other param and the hash intact.
 * Same history.replaceState mechanics as the preview activator's
 * stripParam, but scoped to the one param this slot owns.
 */
function stripObserveParam(): void {
  try {
    const href = window.location.href;
    const hashIdx = href.indexOf('#');
    const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';
    const withoutHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    const qIdx = withoutHash.indexOf('?');
    const path = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;
    const params = new URLSearchParams(
      qIdx >= 0 ? withoutHash.slice(qIdx + 1) : '',
    );
    params.delete(OBSERVE_STORAGE_KEY);
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${path}${query ? `?${query}` : ''}${hash}`,
    );
  } catch {
    // A page that forbids history writes still attaches; the param stays.
  }
}

/**
 * The page's Observe credential slot, for a web `observe` config:
 * `startFlow({ observe: { url, binding, slot: pageObserveSlot() } })`.
 *
 * The credential arrives out-of-band as the `elbObserve` URL param, or in
 * the `localStorage` slot the preview activator ferries it into. A URL
 * credential wins over a stored one. Once kept, a URL-borne copy is
 * stripped from the address bar: it is a bearer credential and must not
 * linger there. Every page access is guarded, so no method throws.
 */
export function pageObserveSlot(): ObserveSlot {
  return {
    read() {
      const param = readObserveParam();
      const raw = param ?? readObserveSlot();
      // Truly absent (or empty) is null: the web arm does zero work.
      if (!raw) return null;
      return { raw, fromUrl: param !== null };
    },
    keep(raw, fromUrl) {
      writeObserveSlot(raw);
      if (fromUrl) stripObserveParam();
    },
    clear(raw) {
      clearObserveSlotIf(raw);
    },
  };
}
