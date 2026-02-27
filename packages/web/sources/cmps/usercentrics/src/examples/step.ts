import type { Flow } from '@walkeros/core';

export const fullConsent: Flow.StepExample = {
  in: {
    event: 'consent_status',
    type: 'explicit',
    action: 'onAcceptAllServices',
    ucCategory: {
      essential: true,
      functional: true,
      marketing: true,
    },
  },
  out: {
    essential: true,
    functional: true,
    marketing: true,
  },
};

export const minimalConsent: Flow.StepExample = {
  in: {
    event: 'consent_status',
    type: 'explicit',
    action: 'onDenyAllServices',
    ucCategory: {
      essential: true,
      functional: false,
      marketing: false,
    },
  },
  out: {
    essential: true,
    functional: false,
    marketing: false,
  },
};
