import type { WalkerOS, Elb, Collector } from '@walkeros/core';
import { isString, isObject, isElementOrDocument } from '@walkeros/core';
import { createPushResult } from '@walkeros/collector';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
} from './types/elb';
import type { Context, Settings, InitScope, Scope } from './types';
import { getEntities, getGlobals } from './walker';

/**
 * Translation layer that converts flexible browser source inputs
 * to the strict core collector format
 */
export function translateToCoreCollector(
  context: Context,
  eventOrCommand: unknown,
  data?: BrowserPushData,
  options?: BrowserPushOptions,
  pushContext?: BrowserPushContext,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
): Promise<Elb.PushResult> {
  const { elb, settings } = context;

  // Handle walker commands. `walker init` is browser-only (re-scans a DOM
  // scope for `data-elb*` tags and fires load triggers) and is dispatched
  // here because the collector must stay DOM-free. All other walker
  // commands route through elb to commonHandleCommand on the collector.
  // `initScope` arrives on `context` from the source factory to avoid a
  // static import of `./trigger` (which would form a load-time cycle).
  if (isString(eventOrCommand) && eventOrCommand.startsWith('walker ')) {
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

  // Handle event objects - add source and globals if missing
  if (isObject(eventOrCommand)) {
    const event = eventOrCommand;
    if (!event.source && settings.scope) {
      const scopeDoc = ((settings.scope as Element).ownerDocument ||
        settings.scope) as Document;
      const scopeWin = scopeDoc.defaultView!;
      event.source = getBrowserSource(scopeWin, scopeDoc);
    }

    // Add globals if not already present
    if (!event.globals && settings.scope) {
      event.globals = isGlobalsScope(settings.scope)
        ? getGlobals(settings.prefix, settings.scope)
        : {};
    }

    return elb(event);
  }

  // Extract entity name from event string
  const [entity] = String(
    isObject(eventOrCommand) ? eventOrCommand.name : eventOrCommand,
  ).split(' ');

  // Get data and context either from elements or parameters
  let eventData = isObject(data) ? (data as WalkerOS.Properties) : {};
  let eventContext: WalkerOS.OrderedProperties = {};

  let elemParameter: undefined | Element;
  let dataIsElem = false;

  // Check if data parameter is an element
  if (isElementOrDocument(data)) {
    elemParameter = data as Element;
    dataIsElem = true;
  }

  // Check if contextData parameter is an element
  if (isElementOrDocument(pushContext)) {
    elemParameter = pushContext as Element;
  } else if (isObject(pushContext) && Object.keys(pushContext).length) {
    eventContext = pushContext as WalkerOS.OrderedProperties;
  }

  // Extract data from element if provided
  if (elemParameter) {
    const entityObj = getEntities(
      settings.prefix || 'data-elb',
      elemParameter,
    ).find((obj) => obj.entity === entity);
    if (entityObj) {
      if (dataIsElem) eventData = entityObj.data;
      if (entityObj.context) eventContext = entityObj.context;
    }
  }

  // Derive win/doc from scope for browser-specific APIs
  const scopeDoc = settings.scope
    ? (((settings.scope as Element).ownerDocument ||
        settings.scope) as Document)
    : undefined;
  const scopeWin = scopeDoc?.defaultView;

  // Special handling for page events
  if (entity === 'page' && scopeWin) {
    eventData.id = eventData.id || scopeWin.location.pathname;
  }

  // Collect globals from the DOM scope
  const eventGlobals =
    settings.scope && isGlobalsScope(settings.scope)
      ? getGlobals(settings.prefix, settings.scope)
      : {};

  // Build unified event from various elb usage patterns
  const event: WalkerOS.DeepPartialEvent = {
    name: String(eventOrCommand || ''),
    data: eventData,
    context: eventContext,
    globals: eventGlobals,
    nested,
    custom,
    trigger: isString(options) ? options : '',
    source:
      scopeWin && scopeDoc ? getBrowserSource(scopeWin, scopeDoc) : undefined,
  };

  return elb(event);
}

/**
 * Create source information for browser events
 */
function getBrowserSource(win: Window, doc: Document): WalkerOS.Source {
  return {
    type: 'browser',
    platform: 'web',
    url: win.location.href,
    referrer: doc.referrer,
  };
}

/**
 * Local type guard: narrows `unknown` to `Element | Document`. Prefers the
 * native `instanceof` check (works in browsers and JSDOM) and falls back to
 * the WhatWG DOM `nodeType` property for realms where the global Element or
 * Document constructors are not in scope (cross-frame, certain test
 * runners). Returns an accurate `Element | Document` union so callers do
 * not need casts.
 */
function isDomScope(value: unknown): value is InitScope {
  if (!value || typeof value !== 'object') return false;
  if (typeof Element !== 'undefined' && value instanceof Element) return true;
  if (typeof Document !== 'undefined' && value instanceof Document) return true;
  if (typeof ShadowRoot !== 'undefined' && value instanceof ShadowRoot)
    return true;
  if ('nodeType' in value) {
    const nodeType = value.nodeType;
    // 1 = ELEMENT_NODE, 9 = DOCUMENT_NODE, 11 = DOCUMENT_FRAGMENT_NODE (the
    // node type of a ShadowRoot) per the WhatWG DOM standard. Accepting 11
    // lets `walker init` target a retained closed shadow root, which discovery
    // can never reach from the document.
    return nodeType === 1 || nodeType === 9 || nodeType === 11;
  }
  return false;
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
