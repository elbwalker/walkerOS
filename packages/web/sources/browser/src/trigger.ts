import type { WalkerOS, Collector } from '@walkeros/core';
import type { Walker } from '@walkeros/web-core';
import type { Scope, Settings, Context, ScopeState } from './types';
import { throttle, tryCatch } from '@walkeros/core';
import { Const, onApply } from '@walkeros/collector';
import { elb as elbOrg, getAttribute } from '@walkeros/web-core';
import {
  getElbAttributeName,
  getEvents,
  getPageViewData,
  getTriggerActions,
  queryAllComposed,
} from './walker';
import {
  initVisibilityTracking,
  triggerVisible,
  destroyVisibilityTracking,
  unobserveElement,
} from './triggerVisible';
import { translateToCoreCollector } from './translation';

// Module-level state is intentional. The walker.js browser source is
// single-instance per window: one elb queue, one set of DOM listeners.
// If multi-instance ever becomes a real requirement (e.g., micro-frontends
// with isolated walker queues), refactor this into a per-instance closure
// returned by createSource() and route every trigger function through it.
//
// Root click/submit delegation lives on an instance-level controller, aborted
// only by destroyTriggers (or re-arming initGlobalTrigger). It is deliberately
// SEPARATE from the per-scope controllers below: a sub-scope re-init must
// never tear down page-wide click/submit.
let rootAbortController: AbortController | undefined;

// Iterable on purpose: destroyTriggers must enumerate every active scope to
// reach sub-scope intervals/observers (a WeakMap could not back full teardown).
// Note: this holds strong references to init'd scope nodes (including detached
// DOM elements). A node init'd via `walker init <el>` and later removed from
// the DOM without a re-init or source destroy is retained until re-init
// replaces its entry or destroyTriggers clears the Map. Bounded by the
// source/page session and accepted per plan §4.
const scopeStates = new Map<Document | Element, ScopeState>();

// Tear down a scope's prior state (if any), then install a fresh empty bucket.
function resetScope(scope: Document | Element): ScopeState {
  const previous = scopeStates.get(scope);
  if (previous) {
    previous.abort.abort(); // removes hover + scroll listeners
    previous.intervalIds.forEach((id) => clearInterval(id));
    previous.timeoutIds.forEach((id) => clearTimeout(id));
    // Drop this scope's elements from the shared per-document observer.
    previous.observed.forEach((element) => unobserveElement(scope, element));
  }

  const fresh: ScopeState = {
    abort: new AbortController(),
    intervalIds: [],
    timeoutIds: [],
    scrollElements: [],
    observed: new Set(),
  };
  scopeStates.set(scope, fresh);
  return fresh;
}

// Reset function for testing: clears each active scope's scroll state.
export function resetScrollListener() {
  scopeStates.forEach((state) => {
    state.scrollElements = [];
    state.scrollListener = undefined;
  });
}

export const createElb: (customLayer?: unknown) => unknown = (customLayer?) => {
  return (
    customLayer
      ? function () {
          (customLayer as unknown[]).push(arguments);
        }
      : elbOrg
  ) as unknown;
};

export const Triggers: { [key: string]: Walker.Trigger } = {
  Click: 'click',
  Custom: 'custom',
  Hover: 'hover',
  Load: 'load',
  Pulse: 'pulse',
  Scroll: 'scroll',
  Submit: 'submit',
  Impression: 'impression',
  Visible: 'visible',
  Wait: 'wait',
} as const;

export async function ready(
  fn: (context: Context, settings: Settings) => void,
  context: Context,
  settings: Settings,
): Promise<void> {
  const readyFn = () => {
    fn(context, settings);
  };

  const scope = settings.scope;
  if (!scope) {
    readyFn();
    return;
  }
  const doc = (scope as Element).ownerDocument || (scope as Document);
  if (doc.readyState !== 'loading') {
    readyFn();
  } else {
    doc.addEventListener('DOMContentLoaded', readyFn);
  }
}

// Called once during source initialization to setup global listeners
export function initTriggers(context: Context, settings: Settings) {
  if (!settings.scope) return; // Skip if no scope available
  const requiredSettings = settings as Required<Settings>;
  initGlobalTrigger(context, requiredSettings);
}

// Called on each walker run to process load triggers
export function processLoadTriggers(context: Context, settings: Settings) {
  if (!settings.scope) return; // Skip if no scope available
  const requiredSettings = settings as Required<Settings>;
  initScopeTrigger(context, requiredSettings);
}

export function initGlobalTrigger(context: Context, settings: Settings): void {
  const scope = settings.scope;

  if (!scope) return;

  // Abort any previously registered root listeners before re-registering.
  // This controller owns ONLY the root click/submit delegation.
  if (rootAbortController) rootAbortController.abort();
  rootAbortController = new AbortController();
  const { signal } = rootAbortController;

  scope.addEventListener(
    'click',
    tryCatch(function (this: Scope, ev: unknown) {
      triggerClick.call(this, context, ev as MouseEvent);
    }) as EventListener,
    { signal },
  );
  scope.addEventListener(
    'submit',
    tryCatch(function (this: Scope, ev: unknown) {
      triggerSubmit.call(this, context, ev as SubmitEvent);
    }) as EventListener,
    { signal },
  );
}

// Full teardown: aborts the root click/submit controller, then enumerates the
// scope registry so EVERY active scope (document and sub-scopes alike) has its
// hover/scroll listeners aborted, intervals/timeouts cleared, and shared
// per-document observer disconnected. Safe to call before any init.
export function destroyTriggers(_settings?: Settings): void {
  if (rootAbortController) {
    rootAbortController.abort();
    rootAbortController = undefined;
  }

  scopeStates.forEach((state, scope) => {
    state.abort.abort();
    state.intervalIds.forEach((id) => clearInterval(id));
    state.timeoutIds.forEach((id) => clearTimeout(id));
    // Normalizes to the owner document and disconnects the shared observer;
    // the second call for a same-document sub-scope is a harmless no-op.
    destroyVisibilityTracking(scope);
  });

  scopeStates.clear();
}

// Scope is the single carrier: it lives only in context.settings.scope. The
// optional second argument is kept for signature compatibility (the Context
// `initScope` slot calls this with a single, scope-aligned context) but is not
// read. `walker init <el>` and `walker run` (document) are the same path,
// differing only in the scope the carrier holds. Re-running on a scope tears
// down that scope's prior state, then attaches fresh = one fresh init.
export function initScopeTrigger(context: Context, _settings?: Settings) {
  const scope = context.settings.scope;
  if (!scope) return;

  const bucket = resetScope(scope);

  // Idempotent "ensure" of the per-document observer (one per ownerDocument).
  // Never disconnect on a sub-scope re-init — resetScope already unobserved
  // this scope's elements above.
  initVisibilityTracking(scope, 1000);

  // default data-elbaction
  const selectorAction = getElbAttributeName(
    context.settings.prefix,
    Const.Commands.Action,
    false,
  );
  const doc = (scope as Element).ownerDocument || (scope as Document);
  if (scope !== doc) {
    // Handle the elements action(s), too
    handleActionElem(context, scope as HTMLElement, selectorAction, bucket);
  }

  // Handle all children action(s)
  queryAllComposed(scope, `[${selectorAction}]`, (elem) => {
    handleActionElem(context, elem as HTMLElement, selectorAction, bucket);
  });

  if (bucket.scrollElements.length) scroll(context, scope, bucket);
}

export async function handleTrigger(
  context: Context,
  element: Element,
  trigger: string,
  // @TODO add triggerParams to filter for specific trigger
): Promise<unknown[]> {
  const events = getEvents(element, trigger, context.settings.prefix);
  return Promise.all(
    events.map((event: Walker.Event) =>
      translateToCoreCollector(context, {
        name: `${event.entity} ${event.action}`,
        ...event,
        trigger,
      }),
    ),
  );
}

function handleActionElem(
  context: Context,
  elem: HTMLElement,
  selectorAction: string,
  bucket: ScopeState,
) {
  const actionAttr = getAttribute(elem, selectorAction);

  if (!actionAttr) return;

  // TriggersActionGroups ([trigger: string]: TriggerActions)
  Object.values(getTriggerActions(actionAttr)).forEach((triggerActions) =>
    // TriggerActions (Array<TriggerAction>)
    triggerActions.forEach((triggerAction: Walker.TriggerActions[0]) => {
      // TriggerAction ({ trigger, triggerParams, action, actionParams })
      switch (triggerAction.trigger) {
        case Triggers.Hover:
          triggerHover(context, elem, bucket);
          break;
        case Triggers.Load:
          triggerLoad(context, elem);
          break;
        case Triggers.Pulse:
          triggerPulse(context, elem, bucket, triggerAction.triggerParams);
          break;
        case Triggers.Scroll:
          triggerScroll(elem, bucket, triggerAction.triggerParams);
          break;
        case Triggers.Impression:
          triggerVisible(context, elem);
          bucket.observed.add(elem);
          break;
        case Triggers.Visible:
          triggerVisible(context, elem, { multiple: true });
          bucket.observed.add(elem);
          break;
        case Triggers.Wait:
          triggerWait(context, elem, bucket, triggerAction.triggerParams);
          break;
      }
    }),
  );
}

/**
 * Get the actual event target, piercing open shadow DOM boundaries.
 * Uses composedPath() to find the real target inside shadow roots.
 * For closed shadow DOM, falls back to the host element (by design).
 */
function getComposedTarget(ev: Event): Element | undefined {
  const path = ev.composedPath?.();
  const target = path?.length ? path[0] : ev.target;
  if (!target || typeof target !== 'object' || !('tagName' in target))
    return undefined;
  return target as Element;
}

function triggerClick(context: Context, ev: MouseEvent) {
  const target = getComposedTarget(ev);
  if (target) handleTrigger(context, target, Triggers.Click);
}

function triggerHover(context: Context, elem: HTMLElement, bucket: ScopeState) {
  elem.addEventListener(
    'mouseenter',
    tryCatch(function (this: Document, ev: MouseEvent) {
      const target = getComposedTarget(ev);
      if (target) handleTrigger(context, target, Triggers.Hover);
    }),
    { signal: bucket.abort.signal },
  );
}

function triggerLoad(context: Context, elem: HTMLElement) {
  handleTrigger(context, elem, Triggers.Load);
}

function triggerPulse(
  context: Context,
  elem: HTMLElement,
  bucket: ScopeState,
  triggerParams: string = '',
) {
  const doc = elem.ownerDocument;
  const intervalId = setInterval(
    () => {
      // Only trigger when tab is active
      if (!doc.hidden) handleTrigger(context, elem, Triggers.Pulse);
    },
    parseInt(triggerParams || '') || 15000,
  );
  bucket.intervalIds.push(intervalId);
}

function triggerScroll(
  elem: HTMLElement,
  bucket: ScopeState,
  triggerParams: string = '',
) {
  // Scroll depth in percent, default 50%
  const depth = parseInt(triggerParams || '') || 50;

  // Ignore invalid parameters
  if (depth < 0 || depth > 100) return;

  bucket.scrollElements.push([elem, depth]);
}

function triggerSubmit(context: Context, ev: SubmitEvent) {
  const target = getComposedTarget(ev);
  if (target) handleTrigger(context, target, Triggers.Submit);
}

function triggerWait(
  context: Context,
  elem: HTMLElement,
  bucket: ScopeState,
  triggerParams: string = '',
) {
  const timeoutId = setTimeout(
    () => handleTrigger(context, elem, Triggers.Wait),
    parseInt(triggerParams || '') || 15000,
  );
  bucket.timeoutIds.push(timeoutId);
}

function scroll(context: Context, scope: Scope, bucket: ScopeState) {
  const doc = (scope as Element).ownerDocument || (scope as Document);
  const win = doc.defaultView!;
  const scrolling = (
    scrollElements: Walker.ScrollElements,
    context: Context,
  ) => {
    return scrollElements.filter(([element, depth]: [Element, number]) => {
      // Distance from top to the bottom of the visible screen
      const windowBottom = win.scrollY + win.innerHeight;
      // Distance from top to the elements relevant content
      const elemTop = (element as HTMLElement).offsetTop;

      // Skip calculations if not in viewport yet
      if (windowBottom < elemTop) return true;

      // Height of the elements box as 100 percent base
      const elemHeight = element.clientHeight;
      // Distance from top to the elements bottom
      const elemBottom = elemTop + elemHeight;
      // Height of the non-visible pixels below visible screen
      const hidden = elemBottom - windowBottom;
      // Visible percentage of the element
      const scrollDepth = (1 - hidden / (elemHeight || 1)) * 100;

      // Check if the elements visibility skipped the required border
      if (scrollDepth >= depth) {
        // Enough scrolling, it's time
        handleTrigger(context, element, Triggers.Scroll);

        // Remove the element from scrollEvents
        return false;
      }

      // Keep observing the element
      return true;
    });
  };

  // Don't add unnecessary scroll listeners. The bucket is fresh per init, so
  // the scope's prior scroll listener was already aborted via its controller.
  if (!bucket.scrollListener) {
    bucket.scrollListener = throttle(function () {
      bucket.scrollElements = scrolling.call(
        scope,
        bucket.scrollElements,
        context,
      );
    });

    scope.addEventListener('scroll', bucket.scrollListener, {
      signal: bucket.abort.signal,
    });
  }
}
