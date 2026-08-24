import type { Flow } from '@walkeros/core';

const baseEvent = {
  name: 'page view',
  data: { title: 'Home', id: '/' },
  id: 'ev-1700000600',
  trigger: 'load',
  entity: 'page',
  action: 'view',
  timestamp: 1700000600,
  source: { type: 'express', platform: 'server' as const },
};

/** Real Chrome, nothing to report. */
export const humanChrome: Flow.StepExample = {
  title: 'Human visitor (Chrome)',
  description: 'Modern Chrome UA. No bot signals.',
  in: { ...baseEvent },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          user: { botScore: 0, botCategory: 'human' },
        },
      },
    ],
  ],
};

/** GPTBot, an AI training crawler. */
export const gptBotCrawler: Flow.StepExample = {
  title: 'GPTBot training crawler',
  description:
    'OpenAI training crawler. The category says what it is, the product says which one.',
  in: { ...baseEvent, id: 'ev-1700000601' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000601',
          user: {
            botScore: 90,
            botCategory: 'ai-crawler',
            botProduct: 'GPTBot',
          },
        },
      },
    ],
  ],
};

/** ChatGPT-User, an AI agent acting for a person. */
export const chatgptUserAgent: Flow.StepExample = {
  title: 'ChatGPT-User (AI agent)',
  description:
    'A person routed an AI to fetch this page. Same score as a crawler because it is still software; the category is what lets a destination keep this traffic.',
  in: { ...baseEvent, id: 'ev-1700000602' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000602',
          user: {
            botScore: 90,
            botCategory: 'ai-agent',
            botProduct: 'ChatGPT-User',
          },
        },
      },
    ],
  ],
};

/** Googlebot, a search crawler: the one named bot that renders JavaScript. */
export const searchCrawler: Flow.StepExample = {
  title: 'Googlebot (search crawler)',
  description:
    'Correlates with organic discoverability, so it is worth separating from both AI crawlers and unnamed automation.',
  in: { ...baseEvent, id: 'ev-1700000605' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000605',
          user: {
            botScore: 90,
            botCategory: 'search-crawler',
            botProduct: 'Googlebot',
          },
        },
      },
    ],
  ],
};

/**
 * The same request, twice, through one instance configured
 * `context: [{ key: "ingest.transport" }, { value: "beacon" }]`.
 */
export const pixelWildcardAccept: Flow.StepExample = {
  title: 'Wildcard Accept on an annotated pixel',
  description:
    'The pixel embed URL carries ?transport=pixel and the source lifts it into ingest, so this request is scored against the pixel profile. Browsers send a typed image Accept when they load an image, so the wildcard is worth 25.',
  in: { ...baseEvent, id: 'ev-1700000608' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000608',
          user: { botScore: 25, botCategory: 'suspicious' },
        },
      },
    ],
  ],
};

/** Byte-identical headers, no annotation: the fallback entry decides. */
export const unannotatedBeaconFallback: Flow.StepExample = {
  title: 'Unannotated request falls back to beacon',
  description:
    'Same instance, same headers, no ?transport= on the request, so the trailing { value: "beacon" } pins beacon. A wildcard Accept is exactly what navigator.sendBeacon sends, and the identical request now scores 0. This is what pinning per request buys: one header, two correct readings.',
  in: { ...baseEvent, id: 'ev-1700000609' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000609',
          user: { botScore: 0, botCategory: 'human' },
        },
      },
    ],
  ],
};

/** A Chromium UA whose client hints disagree with it. */
export const headerMismatch: Flow.StepExample = {
  title: 'Client hints contradict the UA',
  description:
    'The UA claims Chrome 124, Sec-CH-UA says Chromium 98. Graded evidence, not proof: frozen WebView UAs and enterprise UA-reduction policies produce the same mismatch, so the outcome is "suspicious" and never "automation".',
  in: { ...baseEvent, id: 'ev-1700000606' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000606',
          user: { botScore: 30, botCategory: 'suspicious' },
        },
      },
    ],
  ],
};

/** curl, caught by isbot but not named. */
export const curlClient: Flow.StepExample = {
  public: false,
  description:
    'curl. isbot recognises it as automated without naming a product, so it sits a rung below the UA maps.',
  in: { ...baseEvent, id: 'ev-1700000603' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000603',
          user: { botScore: 80, botCategory: 'automation' },
        },
      },
    ],
  ],
};

/** No User-Agent on an otherwise wired request. */
export const missingUA: Flow.StepExample = {
  public: false,
  description:
    'No User-Agent, but the pipeline is delivering other signals. UA stripping is overwhelmingly bots or hardened privacy tools.',
  in: { ...baseEvent, id: 'ev-1700000604' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000604',
          user: { botScore: 70, botCategory: 'automation' },
        },
      },
    ],
  ],
};

/** Nothing in ingest at all: not measured, which is not the same as human. */
export const unwiredPipeline: Flow.StepExample = {
  public: false,
  description:
    'No signal resolved, so the score is null rather than 0. Writing null overwrites any client-supplied value and still evaluates false under a "botScore > 50" filter. ingest.bot.reasons names the missing mappings.',
  in: { ...baseEvent, id: 'ev-1700000607' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000607',
          user: { botScore: null, botCategory: 'unknown' },
        },
      },
    ],
  ],
};
