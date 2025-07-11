import type { WebCollector } from '../types';
import { tryCatch } from '@walkerOS/core';
import { isVisible } from '../utils';
import { handleTrigger, Trigger } from './trigger';

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
export function unobserveElement(
  collector: WebCollector.Collector,
  element: HTMLElement,
): void {
  const state = collector._visibilityState;
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
 * Creates an IntersectionObserver for the given collector
 */
function createObserver(
  collector: WebCollector.Collector,
): IntersectionObserver | undefined {
  if (!window.IntersectionObserver) return undefined;

  return tryCatch(
    () =>
      new window.IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            handleIntersection(collector, entry);
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
  collector: WebCollector.Collector,
  entry: IntersectionObserverEntry,
): void {
  const target = entry.target as HTMLElement;
  const state = collector._visibilityState;
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
      // Only create timer if none exists
      if (!existingTimer) {
        const timer = window.setTimeout(async () => {
          // Final visibility check before triggering (cached for performance)
          if (isElementVisible(target)) {
            await handleTrigger(collector, target as Element, Trigger.Visible);
            // Clean up and unobserve
            unobserveElement(collector, target);
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
}

/**
 * Initializes visibility tracking for a collector
 */
export function initVisibilityTracking(
  collector: WebCollector.Collector,
  duration = 1000,
): void {
  if (collector._visibilityState) return; // Already initialized

  collector._visibilityState = {
    observer: createObserver(collector),
    timers: new WeakMap(),
    duration,
  };
}

/**
 * Main trigger function for visible elements
 */
export function triggerVisible(
  collector: WebCollector.Collector,
  element: HTMLElement,
): void {
  const state = collector._visibilityState;
  if (state?.observer) {
    state.observer.observe(element);
  }
}

/**
 * Destroys visibility tracking for a collector, cleaning up all resources
 */
export function destroyVisibilityTracking(
  collector: WebCollector.Collector,
): void {
  const state = collector._visibilityState;
  if (!state) return;

  // Disconnect observer
  if (state.observer) {
    state.observer.disconnect();
  }

  // Clear state
  delete collector._visibilityState;
}
