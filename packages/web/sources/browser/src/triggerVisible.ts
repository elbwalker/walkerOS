import type { WalkerOS, Elb } from '@walkeros/core';
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

// Module-level visibility state management
interface VisibilityState {
  observer?: IntersectionObserver;
  timers: WeakMap<HTMLElement, number>;
  duration: number;
  elementConfigs?: WeakMap<
    HTMLElement,
    { multiple: boolean; blocked: boolean; context: Context }
  >;
}

// Global state for browser source visibility tracking
let browserVisibilityState: VisibilityState | null = null;

/**
 * Cached visibility check to reduce expensive isVisible() calls
 */
function isElementVisible(element: HTMLElement): boolean {
  const now = Date.now();
  let cached = visibilityCache.get(element);

  // Cache visibility result for 500ms to balance accuracy with performance
  if (!cached || now - cached.lastChecked > 500) {
    cached = {
      isVisible: isVisible(element),
      lastChecked: now,
    };
    visibilityCache.set(element, cached);
  }

  return cached.isVisible;
}

/**
 * Element cleanup (unobserve + timer + cache cleanup)
 */
export function unobserveElement(element: HTMLElement): void {
  const state = browserVisibilityState;
  if (!state) return;

  if (state.observer) {
    state.observer.unobserve(element);
  }

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
 * Creates an IntersectionObserver for the browser source
 */
function createObserver(): IntersectionObserver | undefined {
  if (!window.IntersectionObserver) return undefined;

  return tryCatch(
    () =>
      new window.IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            handleIntersection(entry);
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
function handleIntersection(entry: IntersectionObserverEntry): void {
  const target = entry.target as HTMLElement;
  const state = browserVisibilityState;

  if (!state) return;

  const existingTimer = state.timers.get(target);

  if (entry.intersectionRatio > 0) {
    // Optimize: Cache element size calculations to avoid repeated DOM queries
    const now = Date.now();
    let cached = elementSizeCache.get(target);

    // Cache element size for 1 second to reduce DOM queries
    if (!cached || now - cached.lastChecked > 1000) {
      cached = {
        isLarge: target.offsetHeight > window.innerHeight,
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
        const timer = window.setTimeout(async () => {
          // Final visibility check before triggering (cached for performance)
          if (isElementVisible(target)) {
            // Get element configuration to access context
            const elementConfig = state.elementConfigs?.get(target);
            if (elementConfig?.context) {
              await handleTrigger(
                elementConfig.context,
                target as Element,
                Triggers.Visible,
              );
            }

            // Get fresh element config reference for state update
            const currentConfig = state.elementConfigs?.get(target);

            // For multiple triggers, mark as visible after firing
            if (currentConfig?.multiple) {
              currentConfig.blocked = true;
            } else {
              // Clean up and unobserve only if not a multiple trigger
              unobserveElement(target);
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
 * Initializes visibility tracking for the browser source
 */
export function initVisibilityTracking(duration = 1000): void {
  if (browserVisibilityState) return; // Already initialized

  browserVisibilityState = {
    observer: createObserver(),
    timers: new WeakMap(),
    duration,
  };
}

/**
 * Main trigger function for visible elements
 */
export function triggerVisible(
  context: Context,
  element: HTMLElement,
  config: { multiple?: boolean } = { multiple: false },
): void {
  const state = browserVisibilityState;
  if (state?.observer && element) {
    // Store element config for later use in intersection handling
    if (!state.elementConfigs) {
      state.elementConfigs = new WeakMap();
    }
    state.elementConfigs.set(element, {
      multiple: config.multiple ?? false,
      blocked: false,
      context,
    });
    state.observer.observe(element);
  }
}

/**
 * Destroys visibility tracking for the browser source, cleaning up all resources
 */
export function destroyVisibilityTracking(): void {
  const state = browserVisibilityState;
  if (!state) return;

  if (state.observer) {
    state.observer.disconnect();
  }

  browserVisibilityState = null;
}
