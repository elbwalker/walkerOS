/**
 * Feature manifest of `examples/flow-complete.json`.
 *
 * Two layers:
 *
 * - Teaching: one entry per feature, keyed by a stable id. The id never
 *   changes; the JSON Pointer (RFC 6901) says where the feature lives in the
 *   file and may move. The guide, the website and the talk render features by
 *   id.
 * - Coverage: one record per key union of the core flow types. Every key is
 *   either taught by a feature, excluded with a one-line reason, or inherited.
 *   A new key in `@walkeros/core` fails to compile here until it is listed.
 */

import type {
  Cache,
  Collector,
  Destination,
  Flow,
  Mapping,
  Matcher,
  Source,
  State,
  Store,
  Transformer,
} from '@walkeros/core';

export type ChapterId =
  | 'tour'
  | 'web-entry'
  | 'server-entry'
  | 'step-envelope'
  | 'mapping'
  | 'consent-privacy'
  | 'gtm-fed'
  | 'references'
  | 'chains-routing'
  | 'contract'
  | 'quality'
  | 'state-stores'
  | 'delivery'
  | 'build-run'
  | 'operate';

export type UseCaseId =
  | 'consent'
  | 'gtm-migration'
  | 'gtm-fed'
  | 'ga4-migration'
  | 'capi'
  | 'privacy-analytics'
  | 'cookieless-id'
  | 'pii-policy'
  | 'dedup'
  | 'bot'
  | 'sessions'
  | 'contracts'
  | 'impressions'
  | 'warehouse'
  | 'reliability'
  | 'observability'
  | 'deploy'
  | 'testing'
  | 'agent-editing'
  | 'script-serving'
  | 'multi-flow';

export type PromptId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5';

export type Level = 'beginner' | 'intermediate' | 'advanced';

/** A feature entry without its id (the id is the record key). */
export interface TeachingEntry {
  /** RFC 6901 JSON Pointer into flow-complete.json. */
  pointer: string;
  chapter: ChapterId;
  level: Level;
  useCases: UseCaseId[];
  /** One line, rendered by the guide and the docs alike. */
  note: string;
  docs: { page: string; anchor?: string }[];
  cli?: string[];
  mcp?: string[];
  /** How the same need is met in GTM, one line. */
  gtm?: string;
  /** A step example that shows the feature at work. */
  example?: { step: string; name: string };
  /** The London prompt this feature answers. */
  prompt?: PromptId;
}

export interface Excluded {
  excluded: string;
}

export interface Inherited {
  inherited: 'Mapping.Config';
}

const FILE = 'packages/cli/examples/flow-complete.json';

/**
 * Resolves an RFC 6901 JSON Pointer against a document: `~1` decodes to `/`
 * before `~0` decodes to `~`, array tokens must be canonical indices.
 * Returns undefined when any token is missing.
 */
export function resolvePointer(doc: unknown, pointer: string): unknown {
  if (pointer === '') return doc;
  if (!pointer.startsWith('/')) return undefined;
  let current: unknown = doc;
  for (const part of pointer.slice(1).split('/')) {
    const token = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(token)) return undefined;
      current = current[Number(token)];
    } else if (
      typeof current === 'object' &&
      current !== null &&
      Object.prototype.hasOwnProperty.call(current, token)
    ) {
      current = Reflect.get(current, token);
    } else return undefined;
  }
  return current;
}
const ROUTE_CASES =
  'no genuine use in this scenario, see routeCases in @walkeros/core/dev';

const teaching = {
  // tour
  'schema-url': {
    pointer: '/$schema',
    chapter: 'tour',
    level: 'beginner',
    useCases: ['agent-editing'],
    note: 'The JSON Schema gives editors and agents completion and checks for every field.',
    docs: [],
  },
  'format-version': {
    pointer: '/version',
    chapter: 'tour',
    level: 'beginner',
    useCases: [],
    note: 'version 4 is the flow file format this file is written in.',
    docs: [],
  },
  'flows-multi': {
    pointer: '/flows',
    chapter: 'tour',
    level: 'beginner',
    useCases: ['multi-flow'],
    note: 'One file holds three flows: web in the browser, server behind it, warehouse reading the topic.',
    docs: [{ page: 'getting-started/flow/index' }],
    cli: [`walkeros validate ${FILE} --strict`],
  },
  platform: {
    pointer: '/flows/web/config/platform',
    chapter: 'tour',
    level: 'beginner',
    useCases: [],
    note: 'platform decides how a flow is built: a browser bundle or a server artifact.',
    docs: [{ page: 'getting-started/flow/index' }],
  },
  'flow-config': {
    pointer: '/flows/web/config',
    chapter: 'tour',
    level: 'beginner',
    useCases: [],
    note: 'config holds what the build needs: platform, url, settings, bundle, observe.',
    docs: [{ page: 'getting-started/flow/index' }],
  },
  'flow-sources': {
    pointer: '/flows/web/sources',
    chapter: 'tour',
    level: 'beginner',
    useCases: [],
    note: 'Sources turn whatever happens (a CMP decision, a dataLayer push, a click) into events.',
    docs: [{ page: 'getting-started/flow/index' }],
  },
  'flow-transformers': {
    pointer: '/flows/server/transformers',
    chapter: 'tour',
    level: 'beginner',
    useCases: [],
    note: 'Transformers are named hops that validate, enrich, filter or remember events.',
    docs: [{ page: 'getting-started/flow/index' }],
  },
  'flow-destinations': {
    pointer: '/flows/server/destinations',
    chapter: 'tour',
    level: 'beginner',
    useCases: [],
    note: 'Destinations fan out: every event reaches each destination that accepts it.',
    docs: [{ page: 'getting-started/flow/index' }],
  },
  'flow-stores': {
    pointer: '/flows/server/stores',
    chapter: 'state-stores',
    level: 'intermediate',
    useCases: ['script-serving'],
    note: 'Stores hold data the steps read: script files and customer records.',
    docs: [],
  },
  'flow-collector': {
    pointer: '/flows/server/collector',
    chapter: 'tour',
    level: 'beginner',
    useCases: [],
    note: 'The collector sits between sources and destinations and runs its own chain once per event.',
    docs: [{ page: 'collector/index' }],
  },

  // web-entry
  'cmp-usercentrics': {
    pointer: '/flows/web/sources/usercentrics',
    chapter: 'web-entry',
    level: 'beginner',
    useCases: ['consent'],
    note: 'The Usercentrics source turns the banner decision into a walker consent command.',
    docs: [],
    example: { step: 'usercentrics', name: 'explicitDecision' },
    gtm: 'A consent initialization trigger plus a CMP template.',
  },
  'cmp-category-map': {
    pointer: '/flows/web/sources/usercentrics/config/settings/categoryMap',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['consent'],
    note: 'categoryMap maps CMP categories onto exactly the consent keys the contract names.',
    docs: [],
  },
  'cmp-explicit-only': {
    pointer: '/flows/web/sources/usercentrics/config/settings/explicitOnly',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['consent'],
    note: 'explicitOnly publishes consent only after a real decision, so consent.functional present means the user decided.',
    docs: [],
    example: { step: 'usercentrics', name: 'implicitSuppressed' },
  },
  'session-source': {
    pointer: '/flows/web/sources/session',
    chapter: 'web-entry',
    level: 'beginner',
    useCases: ['sessions'],
    note: 'The session source sets user.session and user.device and emits session start with the raw click id.',
    docs: [{ page: 'guides/session' }],
    example: { step: 'session', name: 'marketingSession' },
  },
  'session-consent': {
    pointer: '/flows/web/sources/session/config/settings/consent',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['consent', 'sessions'],
    note: 'Storage for session ids waits for the functional consent key.',
    docs: [{ page: 'guides/session' }],
  },
  'datalayer-source': {
    pointer: '/flows/web/sources/dataLayer',
    chapter: 'web-entry',
    level: 'beginner',
    useCases: ['gtm-migration'],
    note: 'The dataLayer source reads the pushes the shop already makes, so nothing on the page changes.',
    docs: [],
    example: { step: 'dataLayer', name: 'gtagAddToCart' },
    gtm: 'The container reads the same dataLayer; walkerOS reads it too.',
  },
  'source-require': {
    pointer: '/flows/web/sources/dataLayer/config/require',
    chapter: 'web-entry',
    level: 'intermediate',
    useCases: ['consent', 'sessions'],
    note: 'require holds the source until consent and session are known.',
    docs: [],
  },
  'source-mapping': {
    pointer: '/flows/web/sources/dataLayer/config/mapping',
    chapter: 'web-entry',
    level: 'intermediate',
    useCases: ['gtm-migration'],
    note: 'Source mapping renames dataLayer add_to_cart to product add and picks its fields.',
    docs: [],
  },
  'browser-source': {
    pointer: '/flows/web/sources/browser',
    chapter: 'web-entry',
    level: 'beginner',
    useCases: ['impressions'],
    note: 'The browser source reads data-elb tagging: page views, clicks and impressions.',
    docs: [],
    example: { step: 'browser', name: 'pageView' },
  },
  'source-primary': {
    pointer: '/flows/web/sources/browser/primary',
    chapter: 'web-entry',
    level: 'intermediate',
    useCases: [],
    note: 'primary names the source whose instance the flow exposes, here the browser elb.',
    docs: [],
  },
  'browser-pageview': {
    pointer: '/flows/web/sources/browser/config/settings/pageview',
    chapter: 'web-entry',
    level: 'beginner',
    useCases: [],
    note: 'pageview: true sends a page view on load without tagging.',
    docs: [],
  },
  'collector-globals': {
    pointer: '/flows/web/collector/globals',
    chapter: 'web-entry',
    level: 'beginner',
    useCases: ['contracts'],
    note: 'globals.language is the default the page can override; the contract requires it.',
    docs: [{ page: 'collector/index' }],
  },
  'collector-globals-static': {
    pointer: '/flows/web/collector/globalsStatic',
    chapter: 'web-entry',
    level: 'intermediate',
    useCases: [],
    note: 'globalsStatic survives a run reset; the site id belongs there.',
    docs: [{ page: 'collector/index' }],
  },
  'collector-custom': {
    pointer: '/flows/web/collector/custom',
    chapter: 'web-entry',
    level: 'intermediate',
    useCases: [],
    note: 'custom carries values for the pipeline that are not event data.',
    docs: [{ page: 'collector/index' }],
  },
  'config-url': {
    pointer: '/flows/web/config/url',
    chapter: 'web-entry',
    level: 'beginner',
    useCases: [],
    note: 'url says where a flow lives; other flows reach it with $flow.',
    docs: [],
  },
  'config-settings': {
    pointer: '/flows/web/config/settings',
    chapter: 'web-entry',
    level: 'intermediate',
    useCases: [],
    note: 'Platform settings: windowCollector names the global collector instance.',
    docs: [],
  },
  'web-collector-next': {
    pointer: '/flows/web/collector/next',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'On the web collector.next runs the inline pageGroup step once per event.',
    docs: [{ page: 'getting-started/flow/routing' }],
    example: { step: 'pageGroup', name: 'checkout' },
  },

  // server-entry
  'server-url': {
    pointer: '/flows/server/config/url',
    chapter: 'server-entry',
    level: 'beginner',
    useCases: [],
    note: 'The full collect endpoint, local by default, SERVER_URL in production.',
    docs: [],
  },
  'express-paths': {
    pointer: '/flows/server/sources/express/config/settings/paths',
    chapter: 'server-entry',
    level: 'beginner',
    useCases: ['script-serving', 'ga4-migration'],
    note: 'One route per job, each with its own methods: /collect, /g/collect, /walker.js.',
    docs: [],
    example: { step: 'express', name: 'postCollect' },
  },
  'express-port': {
    pointer: '/flows/server/sources/express/config/settings/port',
    chapter: 'server-entry',
    level: 'beginner',
    useCases: [],
    note: 'port lets push --simulate start the source; runneros mounts the handler on its own port.',
    docs: [],
  },
  'express-cors': {
    pointer: '/flows/server/sources/express/config/settings/cors',
    chapter: 'server-entry',
    level: 'intermediate',
    useCases: ['script-serving'],
    note: 'CORS response headers for the shop origin; express adds X-Content-Type-Options itself.',
    docs: [],
  },
  'source-ingest': {
    pointer: '/flows/server/sources/express/config/ingest',
    chapter: 'server-entry',
    level: 'intermediate',
    useCases: ['bot', 'cookieless-id', 'capi'],
    note: 'ingest keeps the request context (ip, path, headers) for later steps without putting it on the event.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ingest-headers': {
    pointer: '/flows/server/sources/express/config/ingest/map/userAgent',
    chapter: 'server-entry',
    level: 'intermediate',
    useCases: ['bot'],
    note: 'Request headers are read by path: headers.user-agent, headers.accept-language.',
    docs: [],
  },
  'source-async': {
    pointer: '/flows/server/sources/express/config/async',
    chapter: 'server-entry',
    level: 'advanced',
    useCases: ['script-serving'],
    note: 'POST answers at once; GET waits so a step can answer with real content.',
    docs: [],
  },
  'ga4-decode': {
    pointer: '/flows/server/transformers/ga4Decode',
    chapter: 'server-entry',
    level: 'intermediate',
    useCases: ['ga4-migration'],
    note: 'GA4 hits from a sub-site not yet migrated (its own property) become events; the main site never sends here and hits of any other property are not decoded, so nothing counts twice.',
    docs: [],
    example: { step: 'ga4Decode', name: 'subsitePurchase' },
    gtm: 'A server container client for GA4.',
  },

  'ga4-consent-map': {
    pointer: '/flows/server/transformers/ga4Consent',
    chapter: 'consent-privacy',
    level: 'advanced',
    useCases: ['ga4-migration', 'consent'],
    note: 'A code-free mapping hop after the decoder copies GA4 analytics storage into functional; refused pings stay functional false and fail the contract.',
    docs: [],
    example: { step: 'ga4Consent', name: 'analyticsRefused' },
  },
  'ga4-other-dropped': {
    pointer: '/flows/server/sources/express/before/one/2',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['ga4-migration'],
    note: 'GA4 hits for any other property stop at the route instead of reaching the collector undecoded.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },

  // step-envelope
  'step-package': {
    pointer: '/flows/server/destinations/meta/package',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: [],
    note: 'package names the npm package that implements a step.',
    docs: [],
  },
  'step-import': {
    pointer: '/flows/server/destinations/pubsub/import',
    chapter: 'step-envelope',
    level: 'intermediate',
    useCases: [],
    note: 'import picks a named export when one package ships several steps.',
    docs: [],
  },
  'step-code': {
    pointer: '/flows/web/transformers/pageGroup/code',
    chapter: 'step-envelope',
    level: 'intermediate',
    useCases: [],
    note: 'code defines a step inline, no package needed.',
    docs: [],
  },
  'code-push': {
    pointer: '/flows/web/transformers/pageGroup/code/push',
    chapter: 'step-envelope',
    level: 'intermediate',
    useCases: [],
    note: 'push is the step function, written as $code.',
    docs: [],
  },
  'code-type': {
    pointer: '/flows/web/transformers/pageGroup/code/type',
    chapter: 'step-envelope',
    level: 'intermediate',
    useCases: ['observability'],
    note: 'type names the inline step in logs and Observe.',
    docs: [],
  },
  'step-config': {
    pointer: '/flows/server/destinations/meta/config',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: [],
    note: 'config is the same envelope for every step kind: settings, mapping, consent, reliability.',
    docs: [],
  },
  'step-settings': {
    pointer: '/flows/server/destinations/meta/config/settings',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: [],
    note: 'settings are the package options, checked against the package schema.',
    docs: [],
    cli: [`walkeros validate ${FILE} --path destinations.collect`],
  },
  'step-env': {
    pointer: '/flows/server/transformers/file/env',
    chapter: 'step-envelope',
    level: 'advanced',
    useCases: ['script-serving'],
    note: 'env injects what a step uses at runtime, here the assets store.',
    docs: [],
  },
  'step-examples': {
    pointer: '/flows/web/destinations/ga4/examples',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: ['testing', 'agent-editing'],
    note: 'examples are the contract of a step: this in gives this out, checked by simulation.',
    docs: [{ page: 'getting-started/flow/step-examples' }],
    cli: [
      `walkeros push ${FILE} -f web -e '{"name":"order complete","data":{"id":"ORD-100","total":149.8,"currency":"EUR"}}' --simulate destination.ga4`,
    ],
  },
  'example-title': {
    pointer: '/flows/web/destinations/ga4/examples/purchase/title',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: [],
    note: 'title names the example.',
    docs: [],
  },
  'example-description': {
    pointer: '/flows/web/destinations/ga4/examples/purchase/description',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: [],
    note: 'description is the one teaching sentence the docs render.',
    docs: [],
  },
  'example-public': {
    pointer: '/flows/web/destinations/ga4/examples/purchase/public',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: [],
    note: 'public marks the one example per step the docs show first.',
    docs: [],
  },
  'example-in': {
    pointer: '/flows/web/destinations/ga4/examples/purchase/in',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: ['testing'],
    note: 'in is what the step receives.',
    docs: [],
  },
  'example-out': {
    pointer: '/flows/web/destinations/ga4/examples/purchase/out',
    chapter: 'step-envelope',
    level: 'beginner',
    useCases: ['testing'],
    note: 'out is what the step does, as effects: gtag calls, a return, a request.',
    docs: [],
  },
  'example-mapping': {
    pointer: '/flows/web/destinations/ga4/examples/purchase/mapping',
    chapter: 'step-envelope',
    level: 'intermediate',
    useCases: [],
    note: 'mapping shows the rule the example exercises.',
    docs: [],
  },
  'example-trigger': {
    pointer: '/flows/web/sources/browser/examples/productImpression/trigger',
    chapter: 'step-envelope',
    level: 'intermediate',
    useCases: ['impressions'],
    note: 'trigger says how a source example fires: load, click, impression.',
    docs: [],
  },
  'example-command': {
    pointer: '/flows/web/destinations/ga4/examples/consentUpdate/command',
    chapter: 'step-envelope',
    level: 'advanced',
    useCases: ['consent'],
    note: 'command routes in through a walker command instead of an event, here consent.',
    docs: [],
  },

  // mapping
  'ga4-purchase': {
    pointer: '/flows/web/destinations/ga4/config/mapping/order/complete',
    chapter: 'mapping',
    level: 'beginner',
    useCases: [],
    note: 'order complete becomes a GA4 purchase with value, currency and items.',
    docs: [],
    example: { step: 'ga4', name: 'purchase' },
    prompt: 'p2',
    gtm: 'A GA4 event tag with an ecommerce variable per field.',
  },
  'destination-mapping': {
    pointer: '/flows/web/destinations/ga4/config/mapping',
    chapter: 'mapping',
    level: 'beginner',
    useCases: [],
    note: 'mapping holds one rule per entity and action.',
    docs: [],
  },
  'rule-name': {
    pointer: '/flows/web/destinations/ga4/config/mapping/order/complete/name',
    chapter: 'mapping',
    level: 'beginner',
    useCases: [],
    note: 'name is the vendor event name.',
    docs: [],
  },
  'rule-data': {
    pointer: '/flows/web/destinations/ga4/config/mapping/order/complete/data',
    chapter: 'mapping',
    level: 'beginner',
    useCases: [],
    note: 'data builds the vendor parameters from the event.',
    docs: [],
  },
  'value-map': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/order/complete/data/map',
    chapter: 'mapping',
    level: 'beginner',
    useCases: [],
    note: 'map builds an object key by key.',
    docs: [],
  },
  'value-key': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/order/complete/data/map/value/key',
    chapter: 'mapping',
    level: 'beginner',
    useCases: [],
    note: 'key reads a path from the event.',
    docs: [],
  },
  'value-fn': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/order/complete/data/map/value/fn',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: [],
    note: 'fn computes a value, here the total rounded to cents.',
    docs: [],
  },
  'value-loop': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/order/complete/data/map/items/loop',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: [],
    note: 'loop turns nested products into GA4 items.',
    docs: [],
  },
  'value-condition': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/order/complete/data/map/coupon/condition',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: [],
    note: 'A value condition sends coupon only when the order has one.',
    docs: [],
    example: { step: 'ga4', name: 'purchaseWithoutCoupon' },
  },
  'value-fallback': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/order/complete/data/map/currency',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: [],
    note: 'An array of values is a fallback list: the event currency, else the flow default.',
    docs: [],
  },
  'value-set': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/product/view/data/map/items/set',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: [],
    note: 'set builds an array, here the one item of a product view.',
    docs: [],
    example: { step: 'ga4', name: 'productView' },
  },
  'value-value': {
    pointer:
      '/flows/server/destinations/meta/config/mapping/product/add/data/map/currency/value',
    chapter: 'mapping',
    level: 'beginner',
    useCases: [],
    note: 'value is a constant.',
    docs: [],
  },
  'rule-condition': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/order/complete/condition',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: [],
    note: 'A rule condition skips the rule, here for orders without a total.',
    docs: [],
  },
  'rule-settings': {
    pointer:
      '/flows/server/destinations/piwikpro/config/mapping/order/complete/settings',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: [],
    note: 'Rule settings are per-event package options: the Piwik PRO goal for orders.',
    docs: [],
    example: { step: 'piwikpro', name: 'orderWithGoal' },
  },
  'mapping-wildcard-ignore': {
    pointer: '/flows/server/destinations/meta/config/mapping/*/*/ignore',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: ['capi'],
    note: 'A wildcard rule with ignore sends Meta only what is mapped.',
    docs: [],
  },
  'destination-include': {
    pointer: '/flows/web/destinations/ga4/config/include',
    chapter: 'mapping',
    level: 'intermediate',
    useCases: [],
    note: 'include flattens whole sections into parameters, here the globals.',
    docs: [],
  },
  'rule-extend': {
    pointer:
      '/flows/server/transformers/ga4Decode/config/settings/mapping/purchase/extend',
    chapter: 'mapping',
    level: 'advanced',
    useCases: ['ga4-migration'],
    note: 'extend patches a package default rule instead of replacing it.',
    docs: [],
  },
  'rule-remove': {
    pointer:
      '/flows/server/transformers/ga4Decode/config/settings/mapping/purchase/remove',
    chapter: 'mapping',
    level: 'advanced',
    useCases: ['ga4-migration'],
    note: 'remove drops fields from the default rule output.',
    docs: [],
  },
  'collect-api': {
    pointer: '/flows/web/destinations/collect',
    chapter: 'delivery',
    level: 'beginner',
    useCases: ['warehouse'],
    note: 'collect sends every event to the first-party server.',
    docs: [],
    example: { step: 'collect', name: 'orderComplete' },
  },
  'collect-transform': {
    pointer: '/flows/web/destinations/collect/config/settings/transform',
    chapter: 'delivery',
    level: 'advanced',
    useCases: [],
    note: 'transform trims the payload before it leaves the browser.',
    docs: [],
  },

  // consent-privacy
  'destination-consent': {
    pointer: '/flows/server/destinations/meta/config/consent',
    chapter: 'consent-privacy',
    level: 'beginner',
    useCases: ['consent', 'capi'],
    note: 'Destination consent: Meta only gets events with marketing consent.',
    docs: [],
  },
  'rule-consent': {
    pointer:
      '/flows/web/destinations/ga4/config/mapping/order/complete/consent',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['consent'],
    note: 'Rule consent on purchases: functional, like the destination; marketing consent belongs to Meta and Data Manager.',
    docs: [],
  },
  'value-consent': {
    pointer: '/flows/web/destinations/collect/config/policy/user.email/consent',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['consent', 'pii-policy'],
    note: 'Field consent: the email is only kept with marketing consent.',
    docs: [],
    example: { step: 'collect', name: 'emailWithoutMarketing' },
  },
  'destination-policy': {
    pointer: '/flows/web/destinations/ga4/config/policy',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['pii-policy'],
    note: 'policy rewrites the event before mapping, here a currency fallback.',
    docs: [],
  },
  'rule-policy': {
    pointer:
      '/flows/server/destinations/meta/config/mapping/order/complete/policy',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['dedup', 'capi'],
    note: 'Rule policy sets the event id to the order id, so Meta can match it with the browser pixel.',
    docs: [],
  },
  'meta-hashing': {
    pointer: '/flows/server/destinations/meta/config/settings/user_data/em',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['capi', 'pii-policy'],
    note: 'Meta normalizes and hashes em itself; the flow never handles a hash.',
    docs: [],
    example: { step: 'meta', name: 'purchase' },
  },
  'value-validate': {
    pointer:
      '/flows/server/destinations/meta/config/settings/user_data/em/validate',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['pii-policy'],
    note: 'validate drops a value that does not look like an email.',
    docs: [],
  },
  'ingest-ip-raw': {
    pointer: '/flows/server/sources/express/config/ingest/map/ip',
    chapter: 'consent-privacy',
    level: 'advanced',
    useCases: ['capi', 'cookieless-id'],
    note: 'The raw ip stays in ingest: Meta needs it, fingerprint anonymizes it itself.',
    docs: [],
  },

  'email-pseudonymize': {
    pointer: '/flows/server/transformers/pseudonymize',
    chapter: 'consent-privacy',
    level: 'advanced',
    useCases: ['pii-policy', 'warehouse'],
    note: 'Before Pub/Sub the email becomes a stable keyed hash (HMAC-SHA256, EMAIL_SALT); Meta and Data Manager keep the raw email and hash it themselves.',
    docs: [],
    example: { step: 'pseudonymize', name: 'emailToWarehouse' },
  },
  'pubsub-before': {
    pointer: '/flows/server/destinations/pubsub/before',
    chapter: 'consent-privacy',
    level: 'advanced',
    useCases: ['pii-policy'],
    note: 'A conditional next on Pub/Sub runs pseudonymize only when an email exists; other events pass untouched.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },

  // gtm-fed
  'gtm-mode': {
    pointer: '/flows/web/destinations/gtm/config/settings/gtm',
    chapter: 'gtm-fed',
    level: 'intermediate',
    useCases: ['gtm-fed'],
    note: 'GTM stays: the gtag destination in GTM mode pushes walkerOS events into its dataLayer.',
    docs: [],
    example: { step: 'gtm', name: 'productAdd' },
  },
  'destination-data': {
    pointer: '/flows/web/destinations/gtm/config/data',
    chapter: 'gtm-fed',
    level: 'intermediate',
    useCases: ['gtm-fed'],
    note: 'Destination data sends consent, globals, user and data with every GTM push.',
    docs: [],
  },
  'gtm-names': {
    pointer: '/flows/web/destinations/gtm/config/mapping/product/add/name',
    chapter: 'gtm-fed',
    level: 'intermediate',
    useCases: ['gtm-fed'],
    note: 'GTM-bound names start with elb, so the dataLayer source can skip them.',
    docs: [],
  },
  'datalayer-filter': {
    pointer: '/flows/web/sources/dataLayer/config/settings/filter',
    chapter: 'gtm-fed',
    level: 'advanced',
    useCases: ['gtm-fed'],
    note: 'The filter skips gtag arguments pushes and elb names: without it the page loops.',
    docs: [],
    example: { step: 'dataLayer', name: 'ownPushSkipped' },
  },
  'gtm-echo-stop': {
    pointer: '/flows/web/destinations/gtm/before',
    chapter: 'gtm-fed',
    level: 'advanced',
    useCases: ['gtm-fed'],
    note: 'An event read from the dataLayer never goes back to GTM.',
    docs: [],
    example: { step: 'gtm', name: 'dataLayerEcho' },
  },
  'ga4-como': {
    pointer: '/flows/web/destinations/ga4/config/settings/como',
    chapter: 'consent-privacy',
    level: 'intermediate',
    useCases: ['consent'],
    note: 'como turns walker consent into Google Consent Mode calls.',
    docs: [],
    example: { step: 'ga4', name: 'consentUpdate' },
  },
  'load-script': {
    pointer: '/flows/web/destinations/ga4/config/loadScript',
    chapter: 'gtm-fed',
    level: 'beginner',
    useCases: [],
    note: 'loadScript lets the destination load gtag.js itself.',
    docs: [],
  },

  // references
  'root-variables': {
    pointer: '/variables',
    chapter: 'references',
    level: 'beginner',
    useCases: [],
    note: 'Root variables are shared by all flows; a flow or a step can override them.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'flow-variables': {
    pointer: '/flows/server/variables',
    chapter: 'references',
    level: 'intermediate',
    useCases: [],
    note: 'Flow variables win over root variables for one flow.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'step-variables': {
    pointer: '/flows/server/destinations/piwikpro/variables',
    chapter: 'references',
    level: 'intermediate',
    useCases: [],
    note: 'Step variables win over flow and root variables for one step.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-var-whole': {
    pointer: '/flows/web/destinations/ga4/config/policy/data.currency/1/value',
    chapter: 'references',
    level: 'beginner',
    useCases: [],
    note: 'A whole-string $var keeps the variable type.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-var-deep': {
    pointer: '/flows/server/destinations/pubsub/config/settings/projectId',
    chapter: 'references',
    level: 'intermediate',
    useCases: [],
    note: '$var.gcp.project reads a path inside a variable.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-var-inline': {
    pointer:
      '/flows/warehouse/sources/pubsub/config/setup/deadLetterPolicy/deadLetterTopic',
    chapter: 'references',
    level: 'intermediate',
    useCases: [],
    note: 'Inside a longer string $var is replaced in place, here in a full topic name.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-env': {
    pointer: '/flows/server/transformers/fingerprint/config/settings/salt',
    chapter: 'references',
    level: 'intermediate',
    useCases: ['cookieless-id'],
    note: '$env without a default must be set: a secret salt never gets a public default.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-env-default': {
    pointer: '/variables/gcp/project',
    chapter: 'references',
    level: 'beginner',
    useCases: [],
    note: '$env.NAME:default works out of the box and takes the environment value when set.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-secret': {
    pointer: '/flows/server/destinations/pubsub/config/credentials',
    chapter: 'references',
    level: 'intermediate',
    useCases: ['deploy'],
    note: '$secret is read at start and never baked into an artifact; web flows reject it.',
    docs: [{ page: 'guides/reference-syntax' }],
    cli: ['runneros start dist/server.mjs -p 8080 --env-file .env'],
  },
  'ref-flow': {
    pointer: '/flows/web/destinations/collect/config/settings/url',
    chapter: 'references',
    level: 'intermediate',
    useCases: ['multi-flow'],
    note: '$flow.server.url points the browser at the server flow; it is whole-string only.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-code': {
    pointer: '/flows/web/destinations/collect/config/settings/transform',
    chapter: 'references',
    level: 'intermediate',
    useCases: [],
    note: '$code: puts a function into JSON.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-contract': {
    pointer: '/flows/server/transformers/validate/config/settings/contract/0',
    chapter: 'references',
    level: 'intermediate',
    useCases: ['contracts'],
    note: '$contract.server hands the resolved contract to the validate step.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'ref-store': {
    pointer: '/flows/server/transformers/file/env/store',
    chapter: 'references',
    level: 'advanced',
    useCases: ['script-serving'],
    note: '$store.assets injects a store into a step.',
    docs: [{ page: 'guides/reference-syntax' }],
  },
  'bundle-env': {
    pointer: '/flows/web/config/bundle/env',
    chapter: 'references',
    level: 'advanced',
    useCases: ['deploy'],
    note: 'Web $env is resolved at build time from this declared set, so every build is the same.',
    docs: [{ page: 'guides/reference-syntax' }],
  },

  // chains-routing
  'source-before': {
    pointer: '/flows/server/sources/express/before',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['ga4-migration', 'script-serving'],
    note: 'source.before runs on the raw request, before an event exists.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'route-one': {
    pointer: '/flows/server/sources/express/before/one',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'one takes the first matching branch; no match falls through.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'match-and': {
    pointer: '/flows/server/sources/express/before/one/0/match/and',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'and needs every condition.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'op-prefix': {
    pointer: '/flows/server/sources/express/before/one/0/match/and/0/operator',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'prefix matches the start of a value.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'op-regex': {
    pointer: '/flows/server/sources/express/before/one/0/match/and/1/operator',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'regex matches a pattern: only hits of the sub-site property are decoded.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'op-suffix': {
    pointer: '/flows/server/sources/express/before/one/1/match/operator',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['script-serving'],
    note: 'suffix matches the end of a value: script requests end in .js.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'source-next': {
    pointer: '/flows/server/sources/express/next',
    chapter: 'chains-routing',
    level: 'beginner',
    useCases: [],
    note: 'source.next names the hop after the source, here dedup.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'collector-next': {
    pointer: '/flows/server/collector/next',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['bot', 'cookieless-id', 'impressions'],
    note: 'collector.next runs once per event before the fan-out: fingerprint and bot for all, enrich for all but impressions.',
    docs: [{ page: 'getting-started/flow/routing' }],
    prompt: 'p3',
    cli: [
      `walkeros push ${FILE} -f server -e '{"name":"product impression","trigger":"impression","data":{"id":"SKU-1"}}' --simulate collector.default`,
    ],
  },
  'route-next-match': {
    pointer: '/flows/server/collector/next/2',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['impressions'],
    note: 'A conditional next (match plus next) runs the target only when the match holds; otherwise the chain goes on.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'match-not': {
    pointer: '/flows/server/collector/next/2/match/not',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['impressions'],
    note: 'not inverts a condition: everything that is not an impression.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'code-free-hop': {
    pointer: '/flows/server/transformers/enrich',
    chapter: 'chains-routing',
    level: 'advanced',
    useCases: [],
    note: 'A step with only next is a named chain other routes can call.',
    docs: [{ page: 'getting-started/flow/routing' }],
    example: { step: 'enrich', name: 'orderComplete' },
  },
  'route-sequence': {
    pointer: '/flows/server/transformers/enrich/next',
    chapter: 'chains-routing',
    level: 'advanced',
    useCases: [],
    note: 'A list mixing conditional next entries and step ids is a sequence: each match decides in turn, validate always runs last.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'transformer-next': {
    pointer: '/flows/server/transformers/eventFilter/next',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'A transformer next continues the chain after the step.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'op-exists': {
    pointer: '/flows/server/transformers/enrich/next/0/match/operator',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'exists checks that a path has a value: only logged-in events load the customer.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'op-eq': {
    pointer: '/flows/server/transformers/enrich/next/1/match/operator',
    chapter: 'chains-routing',
    level: 'beginner',
    useCases: [],
    note: 'eq compares as strings.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'destination-before': {
    pointer: '/flows/server/destinations/meta/before',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'destination.before runs for one destination only; a stop there skips just that one.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'event-filter': {
    pointer: '/flows/server/transformers/eventFilter',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['impressions', 'bot', 'contracts'],
    note: 'eventFilter keeps impressions, likely bots and invalid events from Meta, Piwik PRO and Data Manager; Pub/Sub keeps everything.',
    docs: [{ page: 'getting-started/flow/routing' }],
    example: { step: 'eventFilter', name: 'validPasses' },
  },
  'route-stop': {
    pointer: '/flows/server/transformers/eventFilter/next/stop',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'stop with a match drops the event at that point.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'match-or': {
    pointer: '/flows/server/transformers/eventFilter/next/match/or',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: [],
    note: 'or needs any condition.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'event-filter-impression': {
    pointer: '/flows/server/transformers/eventFilter/next/match/or/0',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['impressions'],
    note: 'Impressions stay out of Meta and Piwik PRO but reach the warehouse.',
    docs: [],
    example: { step: 'eventFilter', name: 'impressionStopped' },
    prompt: 'p3',
  },
  'op-gt': {
    pointer: '/flows/server/transformers/eventFilter/next/match/or/1/operator',
    chapter: 'chains-routing',
    level: 'intermediate',
    useCases: ['bot'],
    note: 'gt compares numbers.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },
  'stop-unconditional': {
    pointer: '/flows/server/transformers/file/next',
    chapter: 'chains-routing',
    level: 'advanced',
    useCases: ['script-serving'],
    note: 'An unconditional stop: a script request never becomes an event.',
    docs: [{ page: 'getting-started/flow/routing' }],
  },

  // contract
  'contract-default': {
    pointer: '/contract/default',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts'],
    note: 'The contract names what every event must carry; the validate step and validate --strict read it.',
    docs: [{ page: 'getting-started/flow/contract' }],
    cli: [`walkeros validate ${FILE} -t contract`],
  },
  'contract-extend': {
    pointer: '/contract/server/extend',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts'],
    note: 'server extends default with what the server adds: the visitor hash.',
    docs: [{ page: 'getting-started/flow/contract' }],
  },
  'contract-server-hash': {
    pointer: '/contract/server/schema/properties/user/properties/hash',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts', 'cookieless-id'],
    note: 'The description tells analysts what user.hash is and how to count it.',
    docs: [{ page: 'getting-started/flow/contract' }],
  },
  'contract-tagging': {
    pointer: '/contract/default/tagging',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts'],
    note: 'tagging is the contract version the tagging follows.',
    docs: [{ page: 'getting-started/flow/contract' }],
  },
  'contract-description': {
    pointer: '/contract/default/description',
    chapter: 'contract',
    level: 'beginner',
    useCases: ['contracts'],
    note: 'description says what the contract is for.',
    docs: [{ page: 'getting-started/flow/contract' }],
  },
  'contract-schema': {
    pointer: '/contract/default/schema',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts', 'consent'],
    note: 'schema applies to every event: functional consent is a hard gate, language a required global.',
    docs: [{ page: 'getting-started/flow/contract' }],
  },
  'contract-events': {
    pointer: '/contract/default/events',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts'],
    note: 'events hold one JSON Schema per entity and action.',
    docs: [{ page: 'getting-started/flow/contract' }],
  },
  'contract-wildcard': {
    pointer: '/contract/default/events/product/*',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts'],
    note: 'product * applies to every product action.',
    docs: [{ page: 'getting-started/flow/contract' }],
  },
  'validate-transformer': {
    pointer: '/flows/server/transformers/validate',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts'],
    note: 'validate checks each event against $contract.server at runtime.',
    docs: [{ page: 'transformers/validate' }],
    example: { step: 'validate', name: 'validOrder' },
  },
  'validate-pass': {
    pointer: '/flows/server/transformers/validate/config/settings/mode',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts', 'warehouse'],
    note: 'mode pass marks source.valid instead of dropping, so the warehouse keeps violations; strict is the hard gate.',
    docs: [{ page: 'transformers/validate' }],
    example: { step: 'validate', name: 'missingHash' },
  },
  'event-filter-valid': {
    pointer: '/flows/server/transformers/eventFilter/next/match/or/2',
    chapter: 'contract',
    level: 'intermediate',
    useCases: ['contracts'],
    note: 'Only events that match the contract reach the vendors.',
    docs: [{ page: 'transformers/validate' }],
    example: { step: 'eventFilter', name: 'invalidStopped' },
    prompt: 'p4',
  },

  // quality
  'dedup-by-event-id': {
    pointer: '/flows/server/transformers/dedup/cache',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['dedup'],
    note: 'A resend with the same event id is stopped for an hour.',
    docs: [{ page: 'collector/cache' }],
    example: { step: 'dedup', name: 'firstDelivery' },
  },
  'cache-stop': {
    pointer: '/flows/server/transformers/dedup/cache/stop',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['dedup'],
    note: 'stop: true turns a cache hit into a drop.',
    docs: [{ page: 'collector/cache' }],
  },
  'cache-namespace': {
    pointer: '/flows/server/transformers/dedup/cache/namespace',
    chapter: 'quality',
    level: 'advanced',
    useCases: ['dedup'],
    note: 'namespace keeps cache keys of different steps apart.',
    docs: [{ page: 'collector/cache' }],
  },
  'cache-rules': {
    pointer: '/flows/server/transformers/dedup/cache/rules',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['dedup'],
    note: 'rules say which events are cached, by which key, for how long.',
    docs: [{ page: 'collector/cache' }],
  },
  'cache-key': {
    pointer: '/flows/server/transformers/dedup/cache/rules/0/key',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['dedup'],
    note: 'key is a list of paths; together they identify a duplicate.',
    docs: [{ page: 'collector/cache' }],
  },
  'cache-ttl': {
    pointer: '/flows/server/transformers/dedup/cache/rules/0/ttl',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['dedup'],
    note: 'ttl in seconds.',
    docs: [{ page: 'collector/cache' }],
  },
  'order-dedup-meta': {
    pointer: '/flows/server/destinations/meta/cache',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['dedup', 'capi'],
    note: 'A thank-you page reload gets a new event id for the same order; Meta gets each order once.',
    docs: [{ page: 'collector/cache' }],
    prompt: 'p5',
    gtm: 'A custom template with a firestore lookup.',
  },
  'cache-rule-match': {
    pointer: '/flows/server/destinations/meta/cache/rules/0/match',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['dedup'],
    note: 'A rule match limits the cache to order complete.',
    docs: [{ page: 'collector/cache' }],
  },
  'bot-score': {
    pointer: '/flows/server/transformers/bot',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['bot'],
    note: 'bot annotates user.botScore and botCategory from the request; it never drops.',
    docs: [{ page: 'transformers/bot' }],
    example: { step: 'bot', name: 'curl' },
    cli: [
      `walkeros push ${FILE} -f server -e '{"name":"page view","data":{"title":"Home"}}' --simulate collector.default --mock collector.next.bot='{"name":"page view","data":{"title":"Home"},"user":{"botScore":80,"botCategory":"automation"}}'`,
    ],
  },
  'event-filter-bot': {
    pointer: '/flows/server/transformers/eventFilter/next/match/or/1',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['bot'],
    note: 'A botScore above 50 keeps the event from the vendors.',
    docs: [],
    example: { step: 'eventFilter', name: 'botStopped' },
  },
  fingerprint: {
    pointer: '/flows/server/transformers/fingerprint',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['cookieless-id', 'privacy-analytics'],
    note: 'A cookieless visitor id rotating daily, for Piwik PRO; it is not hashing of personal data.',
    docs: [{ page: 'transformers/fingerprint' }],
    example: { step: 'fingerprint', name: 'cookielessId' },
  },
  'piwik-visitor-id': {
    pointer: '/flows/server/destinations/piwikpro/config/settings/visitorId',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['cookieless-id', 'privacy-analytics'],
    note: 'Device, then session, then the cookieless hash: the first one present is the visitor id.',
    docs: [],
  },
  piwikpro: {
    pointer: '/flows/server/destinations/piwikpro',
    chapter: 'quality',
    level: 'intermediate',
    useCases: ['privacy-analytics'],
    note: 'Piwik PRO from the server, EU hosted, with the cookieless id as fallback.',
    docs: [],
    example: { step: 'piwikpro', name: 'orderWithGoal' },
  },

  // state-stores
  'state-set': {
    pointer: '/flows/server/transformers/sessionSave/state',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: ['sessions'],
    note: 'state set remembers the gclid and start time of a session in the built-in cache.',
    docs: [{ page: 'collector/state' }],
    example: { step: 'sessionSave', name: 'sessionStart' },
  },
  'state-get': {
    pointer: '/flows/server/transformers/sessionLoad/state',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: ['sessions'],
    note: 'state get restores it on the order, per instance.',
    docs: [{ page: 'collector/state' }],
    example: { step: 'sessionLoad', name: 'orderWithoutSession' },
  },
  'state-key': {
    pointer: '/flows/server/transformers/sessionSave/state/key',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: ['sessions'],
    note: 'The key falls back from the session id to the visitor hash.',
    docs: [{ page: 'collector/state' }],
  },
  'state-value': {
    pointer: '/flows/server/transformers/sessionSave/state/value',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: ['sessions'],
    note: 'value maps what is stored.',
    docs: [{ page: 'collector/state' }],
  },
  'state-store': {
    pointer: '/flows/server/transformers/loadUser/state/store',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: [],
    note: 'store reads from a named store instead of the built-in cache.',
    docs: [{ page: 'collector/state' }],
  },
  'load-user': {
    pointer: '/flows/server/transformers/loadUser',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: [],
    note: 'loadUser puts the customer lifetime value on logged-in events.',
    docs: [{ page: 'collector/state' }],
    example: { step: 'loadUser', name: 'knownCustomer' },
  },
  'store-fs': {
    pointer: '/flows/server/stores/assets',
    chapter: 'state-stores',
    level: 'intermediate',
    useCases: ['script-serving'],
    note: 'An fs store serves files from a folder.',
    docs: [],
  },
  'store-file': {
    pointer: '/flows/server/stores/assets/config/file',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: ['script-serving'],
    note: 'file: true returns bytes exactly as stored.',
    docs: [],
  },
  'store-sheets': {
    pointer: '/flows/server/stores/customers',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: [],
    note: 'Customer records live in a Google Sheet the team maintains.',
    docs: [],
  },
  'store-cache': {
    pointer: '/flows/server/stores/customers/cache',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: [],
    note: 'Store cache memoizes sheet reads for five minutes.',
    docs: [{ page: 'collector/cache' }],
  },
  'store-credentials': {
    pointer: '/flows/server/stores/customers/config/credentials',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: ['deploy'],
    note: 'Stores take credentials like destinations do.',
    docs: [],
  },
  'file-transformer': {
    pointer: '/flows/server/transformers/file',
    chapter: 'state-stores',
    level: 'intermediate',
    useCases: ['script-serving'],
    note: 'walker.js is served first party from the server flow.',
    docs: [{ page: 'transformers/file' }],
    example: { step: 'file', name: 'walkerJs' },
    cli: [`walkeros bundle ${FILE} -f web -o dist/web/walker.js`],
  },
  'file-headers': {
    pointer: '/flows/server/transformers/file/config/settings/headers',
    chapter: 'state-stores',
    level: 'intermediate',
    useCases: ['script-serving'],
    note: 'Default response headers for served files: caching and resource policy.',
    docs: [{ page: 'transformers/file' }],
  },
  'gclid-to-ads': {
    pointer:
      '/flows/server/destinations/datamanager/config/mapping/order/complete/data/map/gclid',
    chapter: 'state-stores',
    level: 'advanced',
    useCases: ['sessions'],
    note: 'The gclid saved at session start reaches Google Ads with the purchase.',
    docs: [],
    example: { step: 'datamanager', name: 'conversionWithGclid' },
  },

  // delivery
  'pubsub-raw': {
    pointer: '/flows/server/destinations/pubsub',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['warehouse'],
    note: 'Pub/Sub gets every event raw, impressions, bots and violations included.',
    docs: [],
    example: { step: 'pubsub', name: 'everyEvent' },
  },
  'destination-setup': {
    pointer: '/flows/server/destinations/pubsub/config/setup',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['deploy'],
    note: 'setup provisions the topic, EU storage regions included.',
    docs: [],
    cli: [`walkeros setup destination.pubsub -c ${FILE} -f server`],
  },
  'destination-credentials': {
    pointer: '/flows/server/destinations/datamanager/config/credentials',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['deploy'],
    note: 'config.credentials takes the service account from $secret.',
    docs: [],
  },
  breaker: {
    pointer: '/flows/server/destinations/pubsub/config/breaker',
    chapter: 'delivery',
    level: 'advanced',
    useCases: ['reliability'],
    note: 'breaker pauses a failing destination instead of hammering it.',
    docs: [],
  },
  timeout: {
    pointer: '/flows/server/destinations/pubsub/config/timeout',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['reliability'],
    note: 'timeout bounds each push.',
    docs: [],
  },
  'dlq-max': {
    pointer: '/flows/server/destinations/pubsub/config/dlqMax',
    chapter: 'delivery',
    level: 'advanced',
    useCases: ['reliability'],
    note: 'dlqMax bounds the dead letter queue of failed events.',
    docs: [],
  },
  batch: {
    pointer: '/flows/warehouse/destinations/bigquery/config/batch',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['warehouse'],
    note: 'batch buffers rows by size and age.',
    docs: [],
  },
  'web-batch': {
    pointer: '/flows/web/destinations/collect/config/batch',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: [],
    note: 'The browser sends events in batches.',
    docs: [],
  },
  'rule-batch': {
    pointer:
      '/flows/web/destinations/collect/config/mapping/product/impression/batch',
    chapter: 'delivery',
    level: 'advanced',
    useCases: ['impressions'],
    note: 'Impressions get their own, bigger buffer.',
    docs: [],
  },
  'queue-backfill': {
    pointer: '/flows/web/destinations/gtm/config/queue',
    chapter: 'delivery',
    level: 'advanced',
    useCases: ['consent'],
    note: 'queue backfills events from before the destination started, not a retry queue.',
    docs: [],
  },
  'destination-require': {
    pointer: '/flows/web/destinations/gtm/config/require',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['consent', 'gtm-fed'],
    note: 'require starts GTM only after the consent decision.',
    docs: [],
  },
  'meta-capi': {
    pointer: '/flows/server/destinations/meta',
    chapter: 'delivery',
    level: 'beginner',
    useCases: ['capi'],
    note: 'Meta Conversions API from the server for add to cart and purchase.',
    docs: [],
    example: { step: 'meta', name: 'purchase' },
    prompt: 'p1',
    gtm: 'A server container with a Meta CAPI tag.',
  },
  datamanager: {
    pointer: '/flows/server/destinations/datamanager',
    chapter: 'delivery',
    level: 'advanced',
    useCases: ['capi'],
    note: 'Google Ads conversions through the Data Manager API.',
    docs: [],
  },
  'warehouse-flow': {
    pointer: '/flows/warehouse',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['warehouse', 'multi-flow'],
    note: 'A separate flow reads the topic into BigQuery; the warehouse keeps everything.',
    docs: [],
  },
  'pubsub-pull': {
    pointer: '/flows/warehouse/sources/pubsub',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['warehouse'],
    note: 'The pull source reads the subscription and acks after the push.',
    docs: [],
  },
  'source-setup': {
    pointer: '/flows/warehouse/sources/pubsub/config/setup',
    chapter: 'delivery',
    level: 'advanced',
    useCases: ['deploy', 'reliability'],
    note: 'Source setup provisions the subscription with a dead letter topic.',
    docs: [],
  },
  'source-credentials': {
    pointer: '/flows/warehouse/sources/pubsub/config/credentials',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['deploy'],
    note: 'Sources take credentials too.',
    docs: [],
  },
  bigquery: {
    pointer: '/flows/warehouse/destinations/bigquery',
    chapter: 'delivery',
    level: 'intermediate',
    useCases: ['warehouse'],
    note: 'Every event becomes one BigQuery row.',
    docs: [],
  },

  // build-run
  'bundle-packages': {
    pointer: '/flows/server/config/bundle/packages',
    chapter: 'build-run',
    level: 'beginner',
    useCases: ['deploy'],
    note: 'bundle.packages lists what a flow is built from.',
    docs: [],
    cli: [
      `walkeros bundle ${FILE} -f web --stats`,
      `walkeros bundle ${FILE} --all`,
      `walkeros bundle ${FILE} -f server -o dist/server.mjs --release 2026-09-26`,
      'walkeros cache info',
    ],
  },
  'package-version': {
    pointer:
      '/flows/server/config/bundle/packages/@walkeros~1collector/version',
    chapter: 'build-run',
    level: 'beginner',
    useCases: ['deploy'],
    note: 'Pinned versions keep builds reproducible; validate --strict warns without them.',
    docs: [],
  },
  'root-include': {
    pointer: '/include',
    chapter: 'build-run',
    level: 'intermediate',
    useCases: ['script-serving'],
    note: 'include ships the shared folder, walker.js included, with the server artifact.',
    docs: [],
  },

  // operate
  'observe-public': {
    pointer: '/flows/web/config/observe',
    chapter: 'operate',
    level: 'intermediate',
    useCases: ['observability'],
    note: 'A web flow reports to Observe through a public url and binding.',
    docs: [],
    cli: ['walkeros observe start <flowId>'],
  },
  'observe-level': {
    pointer: '/flows/server/config/observe/level',
    chapter: 'operate',
    level: 'intermediate',
    useCases: ['observability'],
    note: 'level standard reports step outcomes; trace adds payloads.',
    docs: [],
  },
  'observe-sample': {
    pointer: '/flows/server/config/observe/sample',
    chapter: 'operate',
    level: 'intermediate',
    useCases: ['observability'],
    note: 'sample reports one event in ten.',
    docs: [],
  },
  'collector-logger': {
    pointer: '/flows/server/collector/logger',
    chapter: 'operate',
    level: 'beginner',
    useCases: ['observability'],
    note: 'The log level comes from the flow variable, so LOG_LEVEL changes it per environment.',
    docs: [{ page: 'collector/logger' }],
    cli: [
      `walkeros flows create flow-complete -c ${FILE}`,
      `walkeros deploy create ${FILE}`,
      'walkeros deploy start <flowId>',
    ],
  },
} satisfies Record<string, TeachingEntry>;

export type FeatureId = keyof typeof teaching;

export type FeatureEntry = TeachingEntry & { id: FeatureId };

export function isFeatureId(id: string): id is FeatureId {
  return id in teaching;
}

/** Every feature, grouped by chapter in learning order. */
export const flowCompleteFeatures: FeatureEntry[] = Object.entries(
  teaching,
).flatMap(([id, entry]) => (isFeatureId(id) ? [{ id, ...entry }] : []));

type Coverage<K extends PropertyKey> = Record<
  K,
  FeatureId | Excluded | Inherited
>;

const INHERITED: Inherited = { inherited: 'Mapping.Config' };
const RUNTIME = (what: string): Excluded => ({
  excluded: `${what} is managed by the runtime or used in tests only`,
});
const FLOW_LEVEL: Excluded = {
  excluded:
    'declared on the flow (sources, destinations, transformers, stores), not under collector',
};

/**
 * Route shapes a chain field can take. Vocabulary: a "conditional next" is
 * `{ match, next }`; a "gate" is match-only (`RouteGateConfig`).
 */
export type RouteKind =
  | Exclude<
      keyof (
        | Transformer.RouteNextConfig
        | Transformer.RouteOneConfig
        | Transformer.RouteManyConfig
        | Transformer.RouteStopConfig
      ),
      'match'
    >
  | 'gate'
  | 'sequence'
  | 'id';

export type Combinator = 'and' | 'or' | 'not';

export type ReferenceKind =
  | 'var'
  | 'varDeep'
  | 'varInline'
  | 'env'
  | 'envDefault'
  | 'secret'
  | 'flow'
  | 'code'
  | 'contract'
  | 'store';

export const flowCompleteCoverage = {
  flowJson: {
    version: 'format-version',
    $schema: 'schema-url',
    include: 'root-include',
    variables: 'root-variables',
    contract: 'contract-default',
    flows: 'flows-multi',
  } satisfies Coverage<keyof Flow.Json>,
  flow: {
    config: 'flow-config',
    sources: 'flow-sources',
    destinations: 'flow-destinations',
    transformers: 'flow-transformers',
    stores: 'flow-stores',
    collector: 'flow-collector',
    variables: 'flow-variables',
  } satisfies Coverage<keyof Flow>,
  config: {
    platform: 'platform',
    url: 'config-url',
    settings: 'config-settings',
    bundle: 'bundle-packages',
    observe: 'observe-public',
  } satisfies Coverage<keyof Flow.Config>,
  bundle: {
    packages: 'bundle-packages',
    overrides: { excluded: 'no transitive version conflict to resolve here' },
    traceInclude: { excluded: 'root include already ships the asset folder' },
    env: 'bundle-env',
  } satisfies Coverage<keyof Flow.Bundle>,
  bundlePackage: {
    version: 'package-version',
    imports: {
      excluded:
        'no inline $code here needs a package utility; step import picks named exports',
    },
    path: { excluded: 'local development only; tests inject it in memory' },
  } satisfies Coverage<keyof Flow.BundlePackage>,
  observe: {
    level: 'observe-level',
    sample: 'observe-sample',
    url: 'observe-public',
    binding: 'observe-public',
  } satisfies Coverage<keyof Flow.Observe>,
  code: {
    push: 'code-push',
    type: 'code-type',
    init: { excluded: 'the inline pageGroup step needs no setup' },
  } satisfies Coverage<keyof Flow.Code>,
  source: {
    package: 'step-package',
    code: 'step-code',
    import: 'step-import',
    config: 'step-config',
    env: 'step-env',
    primary: 'source-primary',
    before: 'source-before',
    next: 'source-next',
    cache: {
      excluded:
        'dedup runs as its own hop after the source (express.next), so no source carries a cache',
    },
    state: {
      excluded:
        'state runs in collector.next after enrichment, where the visitor hash exists',
    },
    variables: 'step-variables',
    examples: 'step-examples',
  } satisfies Coverage<keyof Flow.Source>,
  transformer: {
    package: 'step-package',
    code: 'step-code',
    import: 'step-import',
    config: 'step-config',
    env: 'step-env',
    before: { excluded: ROUTE_CASES },
    next: 'transformer-next',
    cache: 'dedup-by-event-id',
    state: 'state-set',
    mapping: 'ga4-consent-map',
    variables: 'step-variables',
    examples: 'step-examples',
  } satisfies Coverage<keyof Flow.Transformer>,
  destination: {
    package: 'step-package',
    code: 'step-code',
    import: 'step-import',
    config: 'step-config',
    env: 'step-env',
    before: 'destination-before',
    next: { excluded: ROUTE_CASES },
    cache: 'order-dedup-meta',
    state: { excluded: 'session state is read once in collector.next' },
    variables: 'step-variables',
    examples: 'step-examples',
  } satisfies Coverage<keyof Flow.Destination>,
  store: {
    package: 'step-package',
    code: 'step-code',
    import: 'step-import',
    config: 'step-config',
    env: 'step-env',
    cache: 'store-cache',
    variables: 'step-variables',
    examples: {
      excluded:
        'stores are shown through the steps that read them (file, loadUser)',
    },
  } satisfies Coverage<keyof Flow.Store>,
  contractRule: {
    extend: 'contract-extend',
    tagging: 'contract-tagging',
    description: 'contract-description',
    events: 'contract-events',
    schema: 'contract-schema',
  } satisfies Coverage<keyof Flow.ContractRule>,
  stepExample: {
    title: 'example-title',
    description: 'example-description',
    public: 'example-public',
    in: 'example-in',
    trigger: 'example-trigger',
    mapping: 'example-mapping',
    out: 'example-out',
    command: 'example-command',
  } satisfies Coverage<keyof Flow.StepExample>,
  sourceConfig: {
    settings: 'step-settings',
    credentials: 'source-credentials',
    env: 'step-env',
    id: RUNTIME('id'),
    logger: RUNTIME('step logger'),
    async: 'source-async',
    primary: 'source-primary',
    require: 'source-require',
    setup: 'source-setup',
    ingest: 'source-ingest',
    disabled: RUNTIME('disabled'),
    init: RUNTIME('init'),
    state: {
      excluded:
        'state runs in collector.next after enrichment, where the visitor hash exists',
    },
    consent: INHERITED,
    data: INHERITED,
    include: INHERITED,
    mapping: 'source-mapping',
    policy: INHERITED,
  } satisfies Coverage<keyof Source.Config>,
  destinationConfig: {
    consent: 'destination-consent',
    settings: 'step-settings',
    credentials: 'destination-credentials',
    data: 'destination-data',
    include: 'destination-include',
    env: 'step-env',
    id: RUNTIME('id'),
    init: RUNTIME('init'),
    loadScript: 'load-script',
    logger: RUNTIME('step logger'),
    mapping: 'destination-mapping',
    policy: 'destination-policy',
    queue: 'queue-backfill',
    require: 'destination-require',
    setup: 'destination-setup',
    before: 'destination-before',
    next: { excluded: ROUTE_CASES },
    cache: 'order-dedup-meta',
    state: { excluded: 'session state is read once in collector.next' },
    disabled: RUNTIME('disabled'),
    timeout: 'timeout',
    mock: RUNTIME('mock'),
    queueMax: {
      excluded: 'the default bound fits; dlqMax is the knob this file turns',
    },
    dlqMax: 'dlq-max',
    batch: 'batch',
    breaker: 'breaker',
  } satisfies Coverage<keyof Destination.Config>,
  transformerConfig: {
    settings: 'step-settings',
    env: 'step-env',
    id: RUNTIME('id'),
    logger: RUNTIME('step logger'),
    before: { excluded: ROUTE_CASES },
    next: 'transformer-next',
    cache: 'dedup-by-event-id',
    state: 'state-set',
    init: RUNTIME('init'),
    disabled: RUNTIME('disabled'),
    mock: RUNTIME('mock'),
    chainMocks: RUNTIME('chainMocks'),
    mapping: 'ga4-consent-map',
  } satisfies Coverage<keyof Transformer.Config>,
  storeConfig: {
    settings: 'step-settings',
    credentials: 'store-credentials',
    env: 'step-env',
    id: RUNTIME('id'),
    logger: RUNTIME('step logger'),
    setup: {
      excluded:
        'the customers sheet is maintained by the team, not provisioned by the flow',
    },
    file: 'store-file',
  } satisfies Coverage<keyof Store.Config>,
  collector: {
    run: RUNTIME('run'),
    globalsStatic: 'collector-globals-static',
    sessionStatic: {
      excluded: 'the session source owns session data',
    },
    logger: 'collector-logger',
    queueMax: {
      excluded: 'the default bound fits; dlqMax is the knob this file turns',
    },
    name: RUNTIME('name'),
    release: {
      excluded: 'set by walkeros bundle --release, never written by hand',
    },
    next: 'collector-next',
    consent: {
      excluded: 'no consent defaults: only the CMP decision sets consent',
    },
    user: {
      excluded: 'set at runtime by the session source and the login command',
    },
    globals: 'collector-globals',
    sources: FLOW_LEVEL,
    destinations: FLOW_LEVEL,
    transformers: FLOW_LEVEL,
    stores: FLOW_LEVEL,
    custom: 'collector-custom',
    hooks: RUNTIME('hooks'),
    observe: RUNTIME('observe'),
    observers: RUNTIME('observers'),
  } satisfies Coverage<keyof Collector.InitConfig>,
  mappingConfig: {
    consent: 'destination-consent',
    data: 'destination-data',
    include: 'destination-include',
    mapping: 'destination-mapping',
    policy: 'destination-policy',
  } satisfies Coverage<keyof Mapping.Config>,
  mappingRule: {
    batch: 'rule-batch',
    condition: 'rule-condition',
    consent: 'rule-consent',
    settings: 'rule-settings',
    data: 'rule-data',
    include: {
      excluded: 'config include covers GA4; no rule needs a section of its own',
    },
    ignore: 'mapping-wildcard-ignore',
    silent: {
      excluded: 'no destination here has a side effect without a push',
    },
    name: 'rule-name',
    policy: 'rule-policy',
    extend: 'rule-extend',
    remove: 'rule-remove',
  } satisfies Coverage<keyof Mapping.Rule>,
  valueConfig: {
    condition: 'value-condition',
    consent: 'value-consent',
    fn: 'value-fn',
    key: 'value-key',
    loop: 'value-loop',
    map: 'value-map',
    set: 'value-set',
    validate: 'value-validate',
    value: 'value-value',
  } satisfies Coverage<keyof Mapping.ValueConfig>,
  cache: {
    stop: 'cache-stop',
    store: {
      excluded:
        'every step cache here uses the built-in cache; store cache covers named stores',
    },
    namespace: 'cache-namespace',
    rules: 'cache-rules',
  } satisfies Coverage<keyof Cache.Cache>,
  eventCacheRule: {
    match: 'cache-rule-match',
    ttl: 'cache-ttl',
    key: 'cache-key',
    update: { excluded: 'no cached response needs rewriting on a hit' },
  } satisfies Coverage<keyof Cache.EventCacheRule>,
  storeCacheRule: {
    match: { excluded: 'one ttl fits every customer read' },
    ttl: 'store-cache',
  } satisfies Coverage<keyof Cache.StoreCacheRule>,
  state: {
    mode: 'state-set',
    store: 'state-store',
    key: 'state-key',
    value: 'state-value',
  } satisfies Coverage<keyof State>,
  matchOperator: {
    eq: 'op-eq',
    contains: {
      excluded: 'no substring test the other operators do not cover',
    },
    prefix: 'op-prefix',
    suffix: 'op-suffix',
    regex: 'op-regex',
    gt: 'op-gt',
    lt: { excluded: 'no upper bound to test; gt covers numeric comparison' },
    exists: 'op-exists',
  } satisfies Coverage<Matcher.MatchOperator>,
  route: {
    next: 'route-next-match',
    one: 'route-one',
    many: { excluded: ROUTE_CASES },
    stop: 'route-stop',
    gate: { excluded: ROUTE_CASES },
    sequence: 'route-sequence',
    id: 'source-next',
  } satisfies Coverage<RouteKind>,
  combinator: {
    and: 'match-and',
    or: 'match-or',
    not: 'match-not',
  } satisfies Coverage<Combinator>,
  reference: {
    var: 'ref-var-whole',
    varDeep: 'ref-var-deep',
    varInline: 'ref-var-inline',
    env: 'ref-env',
    envDefault: 'ref-env-default',
    secret: 'ref-secret',
    flow: 'ref-flow',
    code: 'ref-code',
    contract: 'ref-contract',
    store: 'ref-store',
  } satisfies Coverage<ReferenceKind>,
};

export interface CliEntry {
  command: string;
  chapter: ChapterId;
}

/** Every command line the guide teaches, run against this file. */
export const flowCompleteCli: CliEntry[] = [
  { command: `walkeros validate ${FILE} --strict`, chapter: 'tour' },
  { command: `walkeros validate ${FILE} -t contract`, chapter: 'contract' },
  {
    command: `walkeros validate ${FILE} --path destinations.collect`,
    chapter: 'step-envelope',
  },
  {
    command: `walkeros push ${FILE} -f web -e '{"name":"page view"}' --simulate source.browser`,
    chapter: 'tour',
  },
  {
    command: `walkeros push ${FILE} -f server -e '{"name":"product impression","trigger":"impression","data":{"id":"SKU-1"}}' --simulate transformer.eventFilter`,
    chapter: 'chains-routing',
  },
  {
    command: `walkeros push ${FILE} -f web -e '{"name":"order complete","data":{"id":"ORD-100","total":149.8,"currency":"EUR"}}' --simulate destination.ga4`,
    chapter: 'mapping',
  },
  {
    command: `walkeros push ${FILE} -f server -e '{"name":"product impression","trigger":"impression","data":{"id":"SKU-1"}}' --simulate collector.default`,
    chapter: 'chains-routing',
  },
  {
    command: `walkeros push ${FILE} -f server -e '{"name":"page view","data":{"title":"Home"}}' --simulate collector.default --mock collector.next.bot='{"name":"page view","data":{"title":"Home"},"user":{"botScore":80,"botCategory":"automation"}}'`,
    chapter: 'quality',
  },
  { command: `walkeros bundle ${FILE} -f web --stats`, chapter: 'build-run' },
  { command: `walkeros bundle ${FILE} --all`, chapter: 'build-run' },
  {
    command: `walkeros bundle ${FILE} -f server -o dist/server.mjs --release 2026-09-26`,
    chapter: 'build-run',
  },
  {
    command: `walkeros bundle ${FILE} -f web -o dist/web/walker.js`,
    chapter: 'state-stores',
  },
  {
    command: 'runneros start dist/server.mjs -p 8080 --env-file .env',
    chapter: 'build-run',
  },
  {
    command: `walkeros setup destination.pubsub -c ${FILE} -f server`,
    chapter: 'delivery',
  },
  { command: 'walkeros cache info', chapter: 'build-run' },
  {
    command: `walkeros flows create flow-complete -c ${FILE}`,
    chapter: 'operate',
  },
  { command: `walkeros deploy create ${FILE}`, chapter: 'operate' },
  { command: 'walkeros deploy start <flowId>', chapter: 'operate' },
  { command: 'walkeros observe start <flowId>', chapter: 'operate' },
];

export const flowCompleteManifest = {
  file: FILE,
  features: flowCompleteFeatures,
  coverage: flowCompleteCoverage,
  cli: flowCompleteCli,
};
