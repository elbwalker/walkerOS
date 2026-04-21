import type { Flow } from '@walkeros/core';

export const fullConsent: Flow.StepExample = {
  title: 'Full consent',
  description:
    'CookieFirst reports all categories granted and the source forwards a walker consent command with all groups true.',
  trigger: { type: 'consent' },
  in: {
    necessary: true,
    functional: true,
    performance: true,
    advertising: true,
  },
  out: [
    [
      'elb',
      'walker consent',
      {
        functional: true,
        analytics: true,
        marketing: true,
      },
    ],
  ],
};

export const partialConsent: Flow.StepExample = {
  title: 'Partial consent',
  description:
    'A partial CookieFirst grant maps analytics and marketing to false in the emitted walker consent command.',
  trigger: { type: 'consent' },
  in: {
    necessary: true,
    functional: true,
    performance: false,
    advertising: false,
  },
  out: [
    [
      'elb',
      'walker consent',
      {
        functional: true,
        analytics: false,
        marketing: false,
      },
    ],
  ],
};

export const categoryMapOverride: Flow.StepExample = {
  title: 'Category map override',
  description:
    'Custom categoryMap remaps performance to statistics instead of analytics',
  trigger: { type: 'consent' },
  in: {
    necessary: true,
    functional: false,
    performance: true,
    advertising: false,
  },
  mapping: {
    settings: {
      categoryMap: {
        performance: 'statistics',
      },
    },
  },
  out: [
    [
      'elb',
      'walker consent',
      {
        functional: true,
        statistics: true,
        marketing: false,
      },
    ],
  ],
};

export const cfInitDetection: Flow.StepExample = {
  title: 'cf_init detection',
  description: 'CMP detected via cf_init CustomEvent (primary detection path)',
  trigger: { type: 'consent' },
  in: {
    necessary: true,
    functional: false,
    performance: false,
    advertising: true,
  },
  out: [
    [
      'elb',
      'walker consent',
      {
        functional: true,
        analytics: false,
        marketing: true,
      },
    ],
  ],
};
