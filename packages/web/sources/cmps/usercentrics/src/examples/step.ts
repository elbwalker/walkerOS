import type { Flow } from '@walkeros/core';

export const fullConsent: Flow.StepExample = {
  trigger: { type: 'consent' },
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
  trigger: { type: 'consent' },
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

export const categoryMapOverride: Flow.StepExample = {
  description:
    'Custom categoryMap remaps essential to functional and functional to analytics',
  trigger: { type: 'consent' },
  in: {
    event: 'consent_status',
    type: 'explicit',
    ucCategory: {
      essential: true,
      functional: true,
      marketing: false,
    },
  },
  mapping: {
    categoryMap: { essential: 'functional', functional: 'analytics' },
  },
  out: {
    functional: true,
    analytics: true,
    marketing: false,
  },
};

export const customEventName: Flow.StepExample = {
  description: 'Using UC_SDK_EVENT instead of ucEvent for Usercentrics SDK v2',
  trigger: { type: 'consent', options: { eventName: 'UC_SDK_EVENT' } },
  in: {
    event: 'consent_status',
    type: 'explicit',
    ucCategory: {
      essential: true,
      functional: true,
      marketing: true,
    },
  },
  mapping: { eventName: 'UC_SDK_EVENT' },
  out: {
    essential: true,
    functional: true,
    marketing: true,
  },
};
