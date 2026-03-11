import type { Flow } from '@walkeros/core';

export const fullConsent: Flow.StepExample = {
  in: {
    necessary: true,
    functional: true,
    performance: true,
    advertising: true,
  },
  out: {
    functional: true,
    analytics: true,
    marketing: true,
  },
};

export const partialConsent: Flow.StepExample = {
  in: {
    necessary: true,
    functional: true,
    performance: false,
    advertising: false,
  },
  out: {
    functional: true,
    analytics: false,
    marketing: false,
  },
};

export const categoryMapOverride: Flow.StepExample = {
  description:
    'Custom categoryMap remaps performance to statistics instead of analytics',
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
  out: {
    functional: true,
    statistics: true,
    marketing: false,
  },
};

export const cfInitDetection: Flow.StepExample = {
  description: 'CMP detected via cf_init CustomEvent (primary detection path)',
  in: {
    necessary: true,
    functional: false,
    performance: false,
    advertising: true,
  },
  out: {
    functional: true,
    analytics: false,
    marketing: true,
  },
};
