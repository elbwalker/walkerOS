import type { WebCollector } from '../types';
import { tryCatch } from '@walkerOS/core';
import { isVisible } from '../utils';
import { handleTrigger, Trigger } from './trigger';

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
    // Check if a large target element is in viewport
    const largeElemInViewport =
      target.offsetHeight > window.innerHeight && isVisible(target);

    // Element is more than 50% in viewport
    if (largeElemInViewport || entry.intersectionRatio >= 0.5) {
      // Only create timer if none exists
      if (!existingTimer) {
        const timer = window.setTimeout(async () => {
          if (isVisible(target)) {
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

  // Element isn't sufficiently in viewport - clear any existing timer
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
 * Adds an element to be observed for visibility changes
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
 * Removes an element from observation and cleans up any associated timers
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

  // Clean up any pending timer
  const timer = state.timers.get(element);
  if (timer) {
    clearTimeout(timer);
    state.timers.delete(element);
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
