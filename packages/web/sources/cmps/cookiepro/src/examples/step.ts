import type { Flow } from '@walkeros/core';

export const fullConsent: Flow.StepExample = {
  trigger: { type: 'consent' },
  in: ',C0001,C0002,C0003,C0004,C0005,',
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

export const minimalConsent: Flow.StepExample = {
  trigger: { type: 'consent' },
  in: ',C0001,',
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
  description: 'Custom categoryMap remaps C0002 from analytics to statistics',
  trigger: { type: 'consent' },
  in: ',C0001,C0002,',
  mapping: { categoryMap: { C0002: 'statistics' } },
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

export const sdkLoadedDetection: Flow.StepExample = {
  description:
    'Immediate detection when OneTrust SDK is already loaded with IsAlertBoxClosed() = true',
  trigger: { type: 'consent' },
  in: ',C0001,C0003,C0004,',
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
