import type { ParametersConsent } from './types';

export function getConsentMode(): ParametersConsent {
  return {
    gcs: 'G111', // Status
    // gcd: '11t1t1t1t5', // Default (granted)
    dma: 1, // Activate Digital Markets Act
    dma_cps: 'syphamo', // Share consent with Google tools by default (custom PII only)
    pscdl: 'noapi', // Privacy Sandbox
  };
}
