import type { Flow } from '@walkeros/core';

export const fullConsent: Flow.StepExample = {
  in: ',C0001,C0002,C0003,C0004,C0005,',
  out: {
    functional: true,
    analytics: true,
    marketing: true,
  },
};

export const minimalConsent: Flow.StepExample = {
  in: ',C0001,',
  out: {
    functional: true,
    analytics: false,
    marketing: false,
  },
};
