import type { WalkerOS, Elb } from '@walkeros/core';
import { isString, isObject } from '@walkeros/core';
import { createPushResult, ELB_IGNORED_ARGUMENTS } from '@walkeros/collector';
import type { Context, Settings, InitScope, Scope } from './types';
import { getGlobals } from './walker';
import { isDomScope } from './scope';

/**
 * Translation layer from what the page passes to `elb` to what the collector
 * takes: `elb(partialEvent)`, `elb('walker <command>', data)` and the string
 * form `elb('entity action', data)`, which is exactly `{ name, data }`.
 *
 * An argument none of these forms takes is ignored; the call still runs and
 * is reported at ERROR, once per source and event or command name.
 */
export function translateToCoreCollector(
  context: Context,
  eventOrCommand: unknown,
  data?: unknown,
  ...rest: unknown[]
): Promise<Elb.PushResult> {
  // Events exit via `push` (the source pipeline); `walker *` commands exit via
  // `elb` (the raw collector). Keeping them apart is what lets a source declare
  // `next`/`before`/mapping and have it apply to its events only.
  const { elb, push, settings } = context;
  // Globals resolve against the scope this source was constructed with, so a
  // source scoped to an element reads that subtree only. The scope a
  // `walker init <el>` runs under narrows discovery, never globals.
  const globalsScope = context.root ?? settings.scope;

  // Handle walker commands. `walker init` is browser-only (re-scans a DOM
  // scope for `data-elb*` tags and fires load triggers) and is dispatched
  // here because the collector must stay DOM-free. All other walker
  // commands route through elb to commonHandleCommand on the collector.
  // `initScope` arrives on `context` from the source factory to avoid a
  // static import of `./trigger` (which would form a load-time cycle).
  if (isString(eventOrCommand) && eventOrCommand.startsWith('walker ')) {
    if (hasExtra(rest)) reportIgnored(context, eventOrCommand);
    if (eventOrCommand === 'walker init' && context.initScope) {
      const scopes = normalizeInitScopes(data, settings);
      for (const scope of scopes) {
        // Scope is a single carrier: build a scope-aligned context so the
        // trigger pipeline reads the new scope from context.settings.scope
        // everywhere (no diverging positional scope param).
        context.initScope({ ...context, settings: { ...settings, scope } });
      }
      return Promise.resolve(createPushResult({ ok: true }));
    }
    return elb(eventOrCommand, data as WalkerOS.Properties);
  }

  // Derive win/doc from scope for browser-specific APIs
  const scopeDoc = settings.scope
    ? (((settings.scope as Element).ownerDocument ||
        settings.scope) as Document)
    : undefined;
  const scopeWin = scopeDoc?.defaultView;
  const source =
    scopeWin && scopeDoc
      ? getBrowserSource(scopeWin, scopeDoc, context.href)
      : undefined;

  // Collect globals from the source root scope
  const pageGlobals =
    globalsScope && isGlobalsScope(globalsScope)
      ? getGlobals(settings.prefix, globalsScope)
      : {};

  // Handle event objects - add source and globals
  if (isObject(eventOrCommand)) {
    if (data !== undefined || hasExtra(rest))
      reportIgnored(context, String(eventOrCommand.name));

    // Shallow-clone so adapter writes never leak onto the caller's object
    const event: WalkerOS.DeepPartialEvent = { ...eventOrCommand };
    if (!event.source && source) event.source = source;

    // The page globals sit under the event's own, which win per key
    event.globals = { ...pageGlobals, ...event.globals };

    return push(event);
  }

  // The string form, on a copy of the caller's data
  const name = String(eventOrCommand || '');
  if (hasExtra(rest) || (data !== undefined && !isObject(data)))
    reportIgnored(context, name);

  const event: WalkerOS.DeepPartialEvent = {
    name,
    data: isObject(data) ? { ...(data as WalkerOS.Properties) } : {},
    globals: pageGlobals,
    trigger: '',
    source,
  };

  return push(event);
}

// An argument past `data` counts once it carries a value.
function hasExtra(rest: unknown[]): boolean {
  return rest.some((arg) => arg !== undefined);
}

/**
 * Report that `elb` was called with an argument the call form does not take,
 * once per source and name, so one event's report never hides another's. The
 * names live on the source's registry, which every scope-aligned copy of the
 * context shares by reference.
 */
function reportIgnored(context: Context, name: string): void {
  const { registry, logger } = context;
  if (registry.ignoredArguments.has(name)) return;
  registry.ignoredArguments.add(name);
  logger.error(ELB_IGNORED_ARGUMENTS, { event: name });
}

/**
 * Create source information for browser events
 */
function getBrowserSource(
  win: Window,
  doc: Document,
  href?: string,
): WalkerOS.Source {
  return {
    type: 'browser',
    platform: 'web',
    url: href || win.location.href,
    referrer: doc.referrer,
  };
}

/**
 * getGlobals accepts the narrow Scope (Document | Element). Scope is kept narrow
 * deliberately: widening it to ShadowRoot would ripple into its sibling scans
 * getPageViewData/getAllEvents, whose bodies call .matches/.body/getAttribute
 * and throw on a ShadowRoot. So a ShadowRoot init scope contributes no globals
 * ({}) by design; this guard narrows the widened carrier back to what getGlobals
 * accepts.
 */
function isGlobalsScope(scope: InitScope): scope is Scope {
  return scope.nodeType !== 11; // exclude ShadowRoot (DOCUMENT_FRAGMENT_NODE)
}

/**
 * Normalize the `data` argument of `elb('walker init', data)` to an array
 * of Element/Document/ShadowRoot scopes. Falls back to `settings.scope` (or
 * `document` if settings.scope is not a DOM node) when no scope is provided.
 */
function normalizeInitScopes(
  data: unknown,
  settings: Settings,
): Array<InitScope> {
  if (isDomScope(data)) return [data];
  if (Array.isArray(data)) {
    const filtered: Array<InitScope> = [];
    for (const entry of data) {
      if (isDomScope(entry)) filtered.push(entry);
    }
    return filtered;
  }
  if (typeof data === 'undefined') {
    const fallback = settings.scope;
    if (isDomScope(fallback)) return [fallback];
    if (typeof globalThis.document !== 'undefined') {
      return [globalThis.document];
    }
  }
  return [];
}
