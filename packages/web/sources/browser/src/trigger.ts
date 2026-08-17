import type { Walker } from '@walkeros/web-core';
import type {
  Scope,
  InitScope,
  Settings,
  Context,
  ScopeState,
  ElementRegistration,
  Registry,
} from './types';
import { throttle, tryCatch } from '@walkeros/core';
import { Const } from '@walkeros/collector';
import { getAttribute } from '@walkeros/web-core';
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

// One source's mutable trigger state. Nothing in this module is module-scoped:
// a second source on the same page gets its own registry, so its init, scan and
// teardown can never reach the first source's listeners, timers or observers.
export function createRegistry(): Registry {
  return {
    scopes: new Map(),
    elements: new WeakMap(),
    visibility: new WeakMap(),
    destroyed: false,
  };
}

// Resolve an AbortController from the node's own realm. A same-origin iframe,
// a `createHTMLDocument` document and a `DOMParser` document each have their
// own constructor, and the last two (plus a removed iframe's contentDocument)
// have a null defaultView, so the ambient constructor is the fallback.
function abortControllerFor(node: InitScope | HTMLElement): AbortController {
  const doc = (node as Element).ownerDocument || (node as Document);
  const Ctor = doc.defaultView?.AbortController ?? AbortController;
  return new Ctor();
}

// Register an element as wired by `scope`, in both the enumerable per-scope set
// and this source's registry. No-op (returns false) if this source already
// registered it (cross-scope dedup within the source) or the scope has no live
// bucket. The owning bucket is derived from the registry, never passed in, so
// the registered/elements invariant is structural: a caller cannot register an
// element into a bucket that mismatches `scope`.
export function registerElement(
  registry: Registry,
  scope: InitScope,
  el: HTMLElement,
  registration: ElementRegistration,
): boolean {
  if (registry.elements.has(el)) return false;
  const bucket = registry.scopes.get(scope);
  if (!bucket) return false;
  registration.scope = scope;
  bucket.registered.add(el);
  registry.elements.set(el, registration);
  return true;
}

// "Already wired by THIS source?": true if any of its scopes registered the
// element. Another source's registration is invisible here, so two sources over
// one set of `data-elb` attributes each wire the element into their own pipeline.
export function isRegistered(registry: Registry, el: HTMLElement): boolean {
  return registry.elements.has(el);
}

// Release one element and un-register it, so it can register again on re-add or
// re-scan. Self-derives the OWNING bucket from registration.scope (never a
// caller's scope): an element owned by the document scope but removed inside a
// sub-scope observer's subtree is still released from its true owner, keeping
// the registered/registry invariant intact.
export function reapElement(registry: Registry, el: HTMLElement): void {
  const registration = registry.elements.get(el);
  if (!registration) return;

  const bucket = registry.scopes.get(registration.scope);

  // Clear each id AND splice it from the owner's flat arrays, so a long
  // inject/remove session does not accrue dead ids there.
  registration.intervalIds.forEach((id) => {
    clearInterval(id);
    if (bucket) {
      const index = bucket.intervalIds.indexOf(id);
      if (index !== -1) bucket.intervalIds.splice(index, 1);
    }
  });
  registration.timeoutIds.forEach((id) => {
    clearTimeout(id);
    if (bucket) {
      const index = bucket.timeoutIds.indexOf(id);
      if (index !== -1) bucket.timeoutIds.splice(index, 1);
    }
  });

  registration.hoverAbort?.abort();

  if (registration.observed) {
    unobserveElement(registry, registration.scope, el);
    bucket?.observed.delete(el);
  }

  if (registration.scroll && bucket) {
    // scrollElements is a [HTMLElement, number] tuple array, remove EVERY entry
    // for this element. A multi-scroll element (data-elbaction="scroll:50;scroll:75")
    // pushes one tuple per trigger, so removing only the first would strand the
    // rest and fire a phantom scroll on the detached element.
    bucket.scrollElements = bucket.scrollElements.filter(
      ([element]) => element !== el,
    );
  }

  bucket?.registered.delete(el);
  registry.elements.delete(el);
}

// Tear down a scope's prior state (if any), then install a fresh empty bucket.
export function resetScope(registry: Registry, scope: InitScope): ScopeState {
  const previous = registry.scopes.get(scope);
  if (previous) {
    previous.abort.abort(); // removes scroll listener (hover is per-element)
    // The flat clears below are the defensive baseline: they blanket-clear
    // every id/observation the scope holds. The reap loop that follows is a
    // superset per element, it additionally aborts hover, deletes the registry
    // entry, and splices the flat arrays, and it re-clears/re-unobserves the
    // same resources, which is idempotent and harmless. Both are kept so a
    // future resource that lands in a flat array without going through
    // registerScanElement (-> `registered`) is still torn down here.
    previous.intervalIds.forEach((id) => clearInterval(id));
    previous.timeoutIds.forEach((id) => clearTimeout(id));
    previous.observed.forEach((element) =>
      unobserveElement(registry, scope, element),
    );
    // Release each element's per-element resources (crucially its hover
    // listener) and clear the registry so the elements can re-register on the
    // fresh scan. Snapshot the set, reapElement deletes from it as it goes.
    // reapElement self-derives this same still-current bucket (the fresh one is
    // not installed until below).
    [...previous.registered].forEach((element) =>
      reapElement(registry, element),
    );
    previous.mutationObservers.forEach((observer) => observer.disconnect());
  }

  const fresh: ScopeState = {
    abort: abortControllerFor(scope),
    intervalIds: [],
    timeoutIds: [],
    scrollElements: [],
    observed: new Set(),
    registered: new Set(),
    mutationObservers: [],
  };
  registry.scopes.set(scope, fresh);
  return fresh;
}

// Test-only accessor: exposes a scope's live bucket so suites can assert its
// observer/registration counts and spy on real observer instances. Not
// re-exported through src/index.ts, so the public package surface is unchanged.
export function getScopeState(
  registry: Registry,
  scope: InitScope,
): ScopeState | undefined {
  return registry.scopes.get(scope);
}

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
    // Deferred past init: a source torn down before the DOM was ready must not
    // bind listeners afterwards.
    if (context.registry.destroyed) return;
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
    return;
  }

  // Park on the root controller so teardown removes this listener the same way
  // it removes every other one. initGlobalTrigger replaces the controller once
  // it runs, which drops the hook it no longer needs.
  const { registry } = context;
  if (!registry.root) registry.root = abortControllerFor(scope);
  doc.addEventListener('DOMContentLoaded', readyFn, {
    signal: registry.root.signal,
  });
}

// Called once during source initialization to setup global listeners
export function initTriggers(context: Context, settings: Settings) {
  if (!settings.scope) return; // Skip if no scope available
  initGlobalTrigger(context);
}

// Called on each walker run to process load triggers
export function processLoadTriggers(context: Context, settings: Settings) {
  if (!settings.scope) return; // Skip if no scope available
  initScopeTrigger(context);
}

export function initGlobalTrigger(context: Context): void {
  // Scope and capture travel together on the context, so there is one source
  // of truth for both.
  const { scope, capture } = context.settings;

  if (!scope) return;
  // A torn-down source wires nothing. The collector keeps a destroyed source
  // reachable, so a later run still arrives here, and anything bound now would
  // outlive the teardown that was supposed to remove it.
  if (context.registry.destroyed) return;

  // Abort this source's previously registered root listeners before
  // re-registering. The controller owns ONLY this source's root click/submit
  // delegation: another source's delegation lives on its own registry.
  const { registry } = context;
  if (registry.root) registry.root.abort();
  registry.root = abortControllerFor(scope);
  const { signal } = registry.root;

  scope.addEventListener(
    'click',
    tryCatch(function (this: Scope, ev: unknown) {
      triggerClick.call(this, context, ev as MouseEvent);
    }) as EventListener,
    { signal, capture },
  );
  scope.addEventListener(
    'submit',
    tryCatch(function (this: Scope, ev: unknown) {
      triggerSubmit.call(this, context, ev as SubmitEvent);
    }) as EventListener,
    { signal, capture },
  );
}

// Full teardown of ONE source: aborts its root click/submit controller, then
// enumerates its own scopes so every one of them (document and sub-scopes
// alike) has its hover/scroll listeners aborted, intervals/timeouts cleared,
// and its per-document observer disconnected. Another source's registry is
// untouched. Safe to call before any init.
export function destroyTriggers(context: Context): void {
  const { registry } = context;

  // Set first: work already deferred past init (the DOM-ready hook) checks it
  // before running against a registry this call is about to empty.
  registry.destroyed = true;

  if (registry.root) {
    registry.root.abort();
    registry.root = undefined;
  }

  // Two passes over this source's scopes. `visibility` is keyed per owner
  // document (one observer state), while `scopes` holds many entries per
  // document (the document scope plus every `walker init <el>` sub-scope).
  // unobserveElement reads that per-document state, so every scope's armed
  // dwell timers must be cancelled BEFORE any scope tears the state down;
  // otherwise the first same-document destroy deletes the state and later
  // scopes' unobserve calls no-op, leaking their timers.
  registry.scopes.forEach((state, scope) => {
    state.abort.abort();
    // Stop watching observe containers first, so no mutation callback fires
    // mid-teardown against a half-cleared scope.
    state.mutationObservers.forEach((observer) => observer.disconnect());
    // Flat clears are the defensive baseline superset (see resetScope): they
    // blanket-clear the scope's ids/observations. The reap loop below is the
    // per-element superset, additionally aborting hover and deleting registry
    // entries, and its re-clear/re-unobserve is idempotent.
    state.intervalIds.forEach((id) => clearInterval(id));
    state.timeoutIds.forEach((id) => clearTimeout(id));
    // Cancel armed visibility dwell timers and detach observed elements while
    // the per-document state still exists. Mirrors resetScope's cleanup.
    state.observed.forEach((element) =>
      unobserveElement(registry, scope, element),
    );
    // Release per-element resources. Hover listeners live on per-element
    // controllers, so state.abort.abort() above does not cover them, reap
    // each registered element to abort its hoverAbort and clear its registry
    // entry. Snapshot the set, reapElement deletes from it as it goes.
    [...state.registered].forEach((element) => reapElement(registry, element));
  });

  registry.scopes.forEach((_state, scope) => {
    // Normalizes to the owner document and disconnects this source's observer;
    // the second call for a same-document sub-scope is a harmless no-op.
    destroyVisibilityTracking(registry, scope);
  });

  registry.scopes.clear();
}

// Scope is the single carrier: it lives only in context.settings.scope, which
// is what the Context `initScope` slot hands over. `walker init <el>` and
// `walker run` (document) are the same path, differing only in the scope the
// carrier holds. Re-running on a scope tears down that scope's prior state,
// then attaches fresh = one fresh init.
export function initScopeTrigger(context: Context) {
  const scope = context.settings.scope;
  if (!scope) return;
  // A torn-down source scans nothing: the bucket, listeners and observers a
  // scan installs would have no teardown left to release them.
  if (context.registry.destroyed) return;

  const bucket = resetScope(context.registry, scope);

  // Idempotent "ensure" of this source's per-document observer (one per
  // ownerDocument). Never disconnect on a sub-scope re-init, resetScope
  // already unobserved this scope's elements above.
  initVisibilityTracking(context.registry, scope, 1000);

  // default data-elbaction
  const selectorAction = getElbAttributeName(
    context.settings.prefix,
    Const.Commands.Action,
    false,
  );
  const doc = (scope as Element).ownerDocument || (scope as Document);
  const win = doc.defaultView;

  // Reclaim: release any element in this scope that ANOTHER scope of this
  // source registered, so the rescan below re-registers it here and re-fires
  // its one-shot triggers. Without this, a document-scan-owned element makes
  // every later `walker init <el>` a permanent no-op. reapElement
  // self-derives the true owning bucket, so cross-scope release is safe
  // (same contract handleRemovedNode relies on).
  if (
    scope !== doc &&
    win &&
    scope instanceof win.HTMLElement &&
    isRegistered(context.registry, scope)
  ) {
    reapElement(context.registry, scope);
  }
  queryAllComposed(scope, `[${selectorAction}]`, (elem) => {
    if (
      win &&
      elem instanceof win.HTMLElement &&
      isRegistered(context.registry, elem)
    ) {
      reapElement(context.registry, elem);
    }
  });

  // The element self-check only applies to an Element sub-scope. A ShadowRoot
  // scope has no getAttribute, so calling handleActionElem on it would throw;
  // it is scanned by queryAllComposed below instead. A Document scope has
  // scope === doc, so it never enters this branch.
  if (scope !== doc && win && scope instanceof win.Element) {
    // Handle the elements action(s), too
    registerScanElement(context, scope, selectorAction, bucket, scope);
  }

  // Handle all children action(s)
  queryAllComposed(scope, `[${selectorAction}]`, (elem) => {
    registerScanElement(context, elem, selectorAction, bucket, scope);
  });

  if (bucket.scrollElements.length) scroll(context, scope, bucket);

  // Watch [<prefix>observe] containers so tagged content injected later is
  // auto-registered (and reaped on removal) without a manual `walker init`.
  observeContainers(context, scope, bucket, selectorAction);
}

// Attach a MutationObserver to each OUTERMOST [<prefix>observe] container per
// tree in this scope. Nesting-skip: a container contained by another candidate
// is skipped, because a subtree:true observer already sees descendant additions
// and nested observers double-report a single deep insertion. Node.contains does
// not cross shadow boundaries, so a shadow-hosted container is never "contained"
// by a light-DOM ancestor and correctly keeps its own observer.
function observeContainers(
  context: Context,
  scope: InitScope,
  bucket: ScopeState,
  selectorAction: string,
) {
  const doc = (scope as Element).ownerDocument || (scope as Document);
  const win = doc.defaultView;
  // Guard like createObserver's win.IntersectionObserver check so a window-less
  // environment simply no-ops instead of throwing.
  if (!win || !win.MutationObserver) return;

  const selectorObserve = getElbAttributeName(
    context.settings.prefix,
    'observe',
    false,
  );

  // Candidate containers: the scope element itself (sub-scope self-check) plus
  // every discovered descendant, across open shadow roots.
  const containers: Element[] = [];
  if (
    scope !== doc &&
    scope instanceof win.Element &&
    scope.matches(`[${selectorObserve}]`)
  ) {
    containers.push(scope);
  }
  queryAllComposed(scope, `[${selectorObserve}]`, (el) => containers.push(el));

  containers.forEach((container) => {
    // Outermost-per-tree, but scope-LOCAL: `contains` only dedups candidates
    // discovered by THIS scope. Two scopes of the same source observing
    // overlapping trees (a document-scope container and a `walker init <el>`
    // sub-scope container over the same subtree) are NOT deduped here, the
    // source's element registry (isRegistered) makes their overlapping adds
    // safe instead.
    const nested = containers.some(
      (other) => other !== container && other.contains(container),
    );
    if (nested) return;

    const observer = new win.MutationObserver(
      tryCatch((records: MutationRecord[]) => {
        // Re-read the LIVE bucket every callback: a resetScope between async
        // callbacks installs a fresh bucket and aborts this one; if the scope
        // was destroyed, bail. Never close over the creation-time bucket.
        const live = context.registry.scopes.get(scope);
        if (!live) return;

        records.forEach((record) => {
          record.addedNodes.forEach((node) =>
            handleAddedNode(context, node, selectorAction, live, scope),
          );
          // Re-arm the scroll listener once per record: an added node may have
          // registered a scroll trigger into live.scrollElements. scroll() guards
          // duplicate listeners, so once-per-record is sufficient and cheap.
          if (live.scrollElements.length) scroll(context, scope, live);
          record.removedNodes.forEach((node) =>
            handleRemovedNode(context, node),
          );
        });
      }),
    );
    observer.observe(container, { childList: true, subtree: true });
    bucket.mutationObservers.push(observer);
  });
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

// Discover + register a single scanned node. Returns the built registration
// (or undefined if the node was skipped), so callers/tests can inspect the
// per-element resources it recorded. Guards up front: element nodes only
// (nodeType === 1, narrowed cast-free via `instanceof win.HTMLElement`), not
// already registered by any of THIS source's scopes, and carrying the action
// attribute.
export function registerScanElement(
  context: Context,
  node: Node,
  selectorAction: string,
  bucket: ScopeState,
  scope: InitScope,
): ElementRegistration | undefined {
  if (node.nodeType !== 1) return undefined;
  const win = node.ownerDocument?.defaultView;
  if (!win || !(node instanceof win.HTMLElement)) return undefined;
  if (isRegistered(context.registry, node)) return undefined;
  if (!getAttribute(node, selectorAction)) return undefined;

  const registration: ElementRegistration = {
    scope,
    intervalIds: [],
    timeoutIds: [],
    scroll: false,
    observed: false,
  };
  handleActionElem(context, node, selectorAction, bucket, registration);
  registerElement(context.registry, scope, node, registration);
  return registration;
}

// The removed-node path the MutationObserver callback invokes. Element nodes
// only (text/comment have no .matches/.querySelectorAll and would throw). Reaps
// `removedEl` itself and each tagged descendant any of this source's scopes
// registered. reapElement self-derives the OWNING bucket from
// registration.scope: a document-scope-owned element removed inside a sub-scope
// observer's subtree is released from its true owner, not the remover's scope -
// never pass a caller's scope/bucket here.
export function handleRemovedNode(context: Context, removedEl: Node): void {
  if (removedEl.nodeType !== 1) return;
  const win = removedEl.ownerDocument?.defaultView;
  if (!win || !(removedEl instanceof win.HTMLElement)) return;

  const { registry } = context;
  const selectorAction = getElbAttributeName(
    context.settings.prefix,
    Const.Commands.Action,
    false,
  );

  if (isRegistered(registry, removedEl)) reapElement(registry, removedEl);
  queryAllComposed(removedEl, `[${selectorAction}]`, (el) => {
    if (el instanceof win.HTMLElement && isRegistered(registry, el))
      reapElement(registry, el);
  });
}

// The added-node path the MutationObserver callback invokes, mirroring
// handleRemovedNode. HTMLElement nodes only: this narrowing is deliberate, not
// merely a text/comment guard. Text/comment nodes lack .matches/.querySelectorAll
// and would throw, but an SVGElement HAS them, it is excluded on purpose because
// the whole registration pipeline (the registry's elements WeakMap, the bucket
// HTMLElement sets, handleActionElem) is HTMLElement-typed. Do not widen to
// Element. addedNodes holds only the top-level inserted node, so walk its tagged
// descendants too. Registers into the passed live bucket (the caller re-reads it
// per callback); unlike the reaper, the add path must be told where to register.
function handleAddedNode(
  context: Context,
  node: Node,
  selectorAction: string,
  bucket: ScopeState,
  scope: InitScope,
): void {
  const win = node.ownerDocument?.defaultView;
  if (!win || !(node instanceof win.HTMLElement)) return;
  registerScanElement(context, node, selectorAction, bucket, scope);
  queryAllComposed(node, `[${selectorAction}]`, (el) => {
    registerScanElement(context, el, selectorAction, bucket, scope);
  });
}

function handleActionElem(
  context: Context,
  elem: HTMLElement,
  selectorAction: string,
  bucket: ScopeState,
  registration: ElementRegistration,
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
          triggerHover(context, elem, registration);
          break;
        case Triggers.Load:
          triggerLoad(context, elem);
          break;
        case Triggers.Pulse:
          triggerPulse(
            context,
            elem,
            bucket,
            registration,
            triggerAction.triggerParams,
          );
          break;
        case Triggers.Scroll:
          triggerScroll(
            elem,
            bucket,
            registration,
            triggerAction.triggerParams,
          );
          break;
        case Triggers.Impression:
          triggerVisible(context, elem);
          bucket.observed.add(elem);
          registration.observed = true;
          break;
        case Triggers.Visible:
          triggerVisible(context, elem, { multiple: true });
          bucket.observed.add(elem);
          registration.observed = true;
          break;
        case Triggers.Wait:
          triggerWait(
            context,
            elem,
            bucket,
            registration,
            triggerAction.triggerParams,
          );
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

function triggerHover(
  context: Context,
  elem: HTMLElement,
  registration: ElementRegistration,
) {
  // Per-element controller: the reaper aborts exactly this element's hover
  // listener without tearing down the scope. Reuse one controller per element
  // so multiple hover actions on the same element share (and are all released
  // by) a single abort.
  if (!registration.hoverAbort)
    registration.hoverAbort = abortControllerFor(elem);
  elem.addEventListener(
    'mouseenter',
    tryCatch(function (this: Document, ev: MouseEvent) {
      const target = getComposedTarget(ev);
      if (target) handleTrigger(context, target, Triggers.Hover);
    }),
    { signal: registration.hoverAbort.signal },
  );
}

function triggerLoad(context: Context, elem: HTMLElement) {
  handleTrigger(context, elem, Triggers.Load);
}

function triggerPulse(
  context: Context,
  elem: HTMLElement,
  bucket: ScopeState,
  registration: ElementRegistration,
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
  registration.intervalIds.push(intervalId);
}

function triggerScroll(
  elem: HTMLElement,
  bucket: ScopeState,
  registration: ElementRegistration,
  triggerParams: string = '',
) {
  // Scroll depth in percent, default 50%
  const depth = parseInt(triggerParams || '') || 50;

  // Ignore invalid parameters
  if (depth < 0 || depth > 100) return;

  bucket.scrollElements.push([elem, depth]);
  registration.scroll = true;
}

function triggerSubmit(context: Context, ev: SubmitEvent) {
  const target = getComposedTarget(ev);
  if (target) handleTrigger(context, target, Triggers.Submit);
}

function triggerWait(
  context: Context,
  elem: HTMLElement,
  bucket: ScopeState,
  registration: ElementRegistration,
  triggerParams: string = '',
) {
  const timeoutId = setTimeout(
    () => handleTrigger(context, elem, Triggers.Wait),
    parseInt(triggerParams || '') || 15000,
  );
  bucket.timeoutIds.push(timeoutId);
  registration.timeoutIds.push(timeoutId);
}

function scroll(context: Context, scope: InitScope, bucket: ScopeState) {
  const doc = (scope as Element).ownerDocument || (scope as Document);
  const win = doc.defaultView!;
  const scrolling = (
    scrollElements: Walker.ScrollElements,
    context: Context,
  ) => {
    return scrollElements.filter(([element, depth]: [Element, number]) => {
      // getBoundingClientRect is viewport-relative and composes across shadow
      // boundaries, so scroll depth is correct for shadow-nested elements.
      const rect = (element as HTMLElement).getBoundingClientRect();

      // Skip calculations if not in viewport yet (element top below the fold)
      if (win.innerHeight < rect.top) return true;

      // Height of the elements box as 100 percent base
      const elemHeight = rect.height || element.clientHeight;
      // Distance from the viewport top to the elements bottom
      const elemBottom = rect.top + elemHeight;
      // Height of the non-visible pixels below the visible screen
      const hidden = elemBottom - win.innerHeight;
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

    // A ShadowRoot never receives page scroll events, so a listener on it would
    // never fire; attach to the owner document instead. Element/Document scopes
    // keep their existing target.
    const scrollTarget = scope instanceof win.ShadowRoot ? doc : scope;
    scrollTarget.addEventListener('scroll', bucket.scrollListener, {
      signal: bucket.abort.signal,
    });
  }
}
