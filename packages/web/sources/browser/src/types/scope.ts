// Shared scope types. Leaf module (DOM globals only, no local imports) so both
// `types/index.ts` and `types/elb.ts` import one source of truth without a
// circular import.

// Scope type for DOM operations. Deliberately excludes ShadowRoot: the DOM-scan
// helpers (getGlobals, getPageViewData, getAllEvents) assume Element/Document
// bodies (.matches/.body/getAttribute). ShadowRoot reaches only the
// trigger/visibility carriers (InitScope), never these scans.
export type Scope = Document | Element;

// Init/trigger scope: adds ShadowRoot so `walker init` can target a retained
// (e.g. closed) shadow root that discovery can never reach from the document.
export type InitScope = Scope | ShadowRoot;
