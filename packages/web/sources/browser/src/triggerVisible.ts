import type { WalkerOS } from '@walkeros/core';
import type { Settings, Context } from './types';
import { tryCatch } from '@walkeros/core';
import { isVisible } from '@walkeros/web-core';
import { handleTrigger, Triggers } from './trigger';

// Cache for element size calculations to reduce DOM queries
const elementSizeCache = new WeakMap<
  HTMLElement,
  { isLarge: boolean; lastChecked: number }
>();

// Cache for basic visibility checks to reduce expensive isVisible() calls
const visibilityCache = new WeakMap<
  HTMLElement,
  { isVisible: boolean; lastChecked: number }
>();

// Module-level visibility state management (stateless source architecture)
interface VisibilityState {
  observer?: IntersectionObserver;
  timers: WeakMap<HTMLElement, number>;
  duration: number;
  elementConfigs?: WeakMap<
    HTMLElement,
    { multiple: boolean; blocked: boolean; context: Context; trigger: string }
  >;
}

// Module-level visibility state keyed by the owner document. Both an element
// sub-scope and its document normalize to the same key (see getScopeKey), so
// there is exactly one IntersectionObserver per document: create-key and
// lookup-key can never diverge, and iframes still get their own observer.
const visibilityStates = new WeakMap<Document | Element, VisibilityState>();

/**
 * Normalize any scope (document or element) to its owner document. The
 * IntersectionObserver root is always the viewport, so per-sub-scope observers
 * would be meaningless; keying by ownerDocument gives one shared observer per
 * document and keeps the create/lookup keys aligned.
 */
export function getScopeKey(scope: Document | Element): Document | Element {
  return (scope as Element).ownerDocument || (scope as Document);
}

/**
 * Cached visibility check to reduce expensive isVisible() calls
 */
function isElementVisible(element: HTMLElement): boolean {
  const now = Date.now();
  let cached = visibilityCache.get(element);

  // Cache visibility result for 500ms to balance accuracy with performance
  if (!cached || now - cached.lastChecked > 500) {
    const win = element.ownerDocument.defaultView!;
    const doc = element.ownerDocument;
    cached = {
      isVisible: isVisible(element, win, doc),
      lastChecked: now,
    };
    visibilityCache.set(element, cached);
  }

  return cached.isVisible;
}

/**
 * Element cleanup (unobserve + timer + cache cleanup)
 */
export function unobserveElement(
  scope: Document | Element,
  element: HTMLElement,
): void {
  const state = visibilityStates.get(getScopeKey(scope));
  if (!state) return;

  if (state.observer) {
    state.observer.unobserve(element);
  }

  // Drop the element's config so a re-init or teardown leaves no stale config
  // behind (read back in handleIntersection).
  state.elementConfigs?.delete(element);

  // Clear timer
  const timer = state.timers.get(element);
  if (timer) {
    clearTimeout(timer);
    state.timers.delete(element);
  }

  // Clean up caches to prevent memory leaks
  elementSizeCache.delete(element);
  visibilityCache.delete(element);
}

/**
 * Creates an IntersectionObserver for the given scope
 */
function createObserver(
  scope: Document | Element,
): IntersectionObserver | undefined {
  const doc = (scope as Element).ownerDocument || (scope as Document);
  const win = doc.defaultView;
  if (!win || !win.IntersectionObserver) return undefined;

  return tryCatch(
    () =>
      new win.IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            handleIntersection(scope, entry);
          });
        },
        {
          rootMargin: '0px',
          threshold: [0, 0.5],
        },
      ),
    () => undefined,
  )();
}

/**
 * Handles intersection changes for observed elements
 */
function handleIntersection(
  scope: Document | Element,
  entry: IntersectionObserverEntry,
): void {
  const target = entry.target as HTMLElement;
  const state = visibilityStates.get(getScopeKey(scope));

  if (!state) return;

  const existingTimer = state.timers.get(target);

  if (entry.intersectionRatio > 0) {
    // Optimize: Cache element size calculations to avoid repeated DOM queries
    const now = Date.now();
    let cached = elementSizeCache.get(target);

    // Cache element size for 1 second to reduce DOM queries
    if (!cached || now - cached.lastChecked > 1000) {
      const win = target.ownerDocument.defaultView!;
      cached = {
        isLarge: target.offsetHeight > win.innerHeight,
        lastChecked: now,
      };
      elementSizeCache.set(target, cached);
    }

    const meetsThreshold = entry.intersectionRatio >= 0.5;

    // Optimized visibility strategy:
    // - Standard elements: intersection ratio ≥ 0.5 is sufficient (fast)
    // - Large elements: need additional overlay/occlusion check (slower but necessary)
    const shouldTrigger =
      meetsThreshold || (cached.isLarge && isElementVisible(target));

    if (shouldTrigger) {
      // Get element configuration
      const elementConfig = state.elementConfigs?.get(target);

      // For multiple triggers, only proceed if this is a re-entry (was not visible, now visible)
      if (elementConfig?.multiple && elementConfig.blocked) return; // Don't trigger again

      // Only create timer if none exists
      if (!existingTimer) {
        const targetWin = target.ownerDocument.defaultView!;
        const timer = targetWin.setTimeout(async () => {
          // Final visibility check before triggering (cached for performance)
          if (isElementVisible(target)) {
            // Get element configuration to access context
            const elementConfig = state.elementConfigs?.get(target);
            if (elementConfig?.context) {
              await handleTrigger(
                elementConfig.context,
                target as Element,
                elementConfig.trigger,
              );
            }

            // Get fresh element config reference for state update
            const currentConfig = state.elementConfigs?.get(target);

            // For multiple triggers, mark as visible after firing
            if (currentConfig?.multiple) {
              currentConfig.blocked = true;
            } else {
              // Clean up and unobserve only if not a multiple trigger
              unobserveElement(scope, target);
            }
          }
        }, state.duration);

        state.timers.set(target, timer);
      }
      return;
    }
  }

  // Element isn't sufficiently in viewport - clear existing timer
  if (existingTimer) {
    clearTimeout(existingTimer);
    state.timers.delete(target);
  }

  // For multiple triggers, mark as not visible for re-entry detection
  const elementConfig = state.elementConfigs?.get(target);
  if (elementConfig?.multiple) {
    elementConfig.blocked = false;
  }
}

/**
 * Initializes visibility tracking for a scope (document/element)
 */
export function initVisibilityTracking(
  scope: Document | Element,
  duration = 1000,
): void {
  const key = getScopeKey(scope);
  if (visibilityStates.has(key)) return; // Already initialized for this document

  visibilityStates.set(key, {
    observer: createObserver(key),
    timers: new WeakMap(),
    duration,
  });
}

/**
 * Main trigger function for visible elements
 */
export function triggerVisible(
  context: Context,
  element: HTMLElement,
  config: { multiple?: boolean } = { multiple: false },
): void {
  const scope = context.settings.scope;
  if (!scope) return;
  const state = visibilityStates.get(getScopeKey(scope));

  if (state?.observer && element) {
    // Store element config for later use in intersection handling
    if (!state.elementConfigs) {
      state.elementConfigs = new WeakMap();
    }
    state.elementConfigs.set(element, {
      multiple: config.multiple ?? false,
      blocked: false,
      context,
      trigger: config.multiple ? 'visible' : 'impression',
    });
    state.observer.observe(element);
  }
}

/**
 * Destroys visibility tracking for a scope, cleaning up all resources
 */
export function destroyVisibilityTracking(scope?: Document | Element): void {
  if (!scope) return; // No scope provided, nothing to clean up

  const key = getScopeKey(scope);
  const state = visibilityStates.get(key);
  if (!state) return;

  if (state.observer) {
    state.observer.disconnect();
  }

  visibilityStates.delete(key);
}
