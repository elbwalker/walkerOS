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

/** Real Chrome — botScore 0, agentScore 0. */
export const humanChrome: Flow.StepExample = {
  title: 'Human visitor (Chrome)',
  description: 'Modern Chrome UA. No bot or agent signals.',
  in: { ...baseEvent },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          user: { botScore: 0, agentScore: 0 },
        },
      },
    ],
  ],
};

/** GPTBot — training crawler. */
export const gptBotCrawler: Flow.StepExample = {
  title: 'GPTBot training crawler',
  description:
    'OpenAI training crawler. Both botScore and agentScore are high.',
  in: { ...baseEvent, id: 'ev-1700000601' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000601',
          user: { botScore: 95, agentScore: 95 },
        },
      },
    ],
  ],
};

/** ChatGPT-User — user-action AI agent. */
export const chatgptUserAgent: Flow.StepExample = {
  title: 'ChatGPT-User (user-action AI)',
  description:
    'A real human routed an AI to fetch this page. botScore high but lower than crawlers — agentProduct lets destinations keep this traffic.',
  in: { ...baseEvent, id: 'ev-1700000602' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000602',
          user: { botScore: 90, agentScore: 95 },
        },
      },
    ],
  ],
};

/** curl — caught by isbot. */
export const curlClient: Flow.StepExample = {
  public: false,
  description: 'curl client — caught by isbot. agentScore zero.',
  in: { ...baseEvent, id: 'ev-1700000603' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000603',
          user: { botScore: 80, agentScore: 0 },
        },
      },
    ],
  ],
};

/** Empty / missing UA — score 70 (suspicious; real browsers rarely strip UA). */
export const missingUA: Flow.StepExample = {
  public: false,
  description:
    'No User-Agent — baseline 70 (UA stripping is overwhelmingly bots or hardened privacy tools).',
  in: { ...baseEvent, id: 'ev-1700000604' },
  out: [
    [
      'return',
      {
        event: {
          ...baseEvent,
          id: 'ev-1700000604',
          user: { botScore: 70, agentScore: 0 },
        },
      },
    ],
  ],
};
