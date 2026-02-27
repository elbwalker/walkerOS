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
