import { createCollector } from '@walkerOS/collector';
import { destinationGtag } from '@walkerOS/web-destination-gtag';
import { destinationMeta } from '@walkerOS/web-destination-meta';
import type { WalkerOS, Collector } from '@walkerOS/core';

export async function setupConsentManagement(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      gtag: {
        ...destinationGtag,
        config: {
          settings: {
            ga4: { measurementId: 'G-XXXXXXXXXX' },
          },
          mapping: {
            // Map consent events
            walker: {
              consent: {
                name: 'consent_update',
                data: {
                  map: {
                    analytics_storage: 'analytics_storage',
                    ad_storage: 'ad_storage',
                  },
                },
              },
            },
          },
        },
      },
      meta: {
        ...destinationMeta,
        config: {
          settings: {
            pixelId: 'YOUR_PIXEL_ID',
          },
          mapping: {
            // Map consent events for Meta
            walker: {
              consent: {
                name: 'consent_granted',
                data: {
                  map: {
                    consent_type: 'ad_storage',
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Initially disable all tracking until consent is given
  collector.allowed = false;

  return { collector, elb };
}

export async function handleConsentChoice(
  collector: Collector.Instance,
  consentType: 'accept' | 'reject' | 'customize',
  customConsent?: {
    analytics: boolean;
    advertising: boolean;
    functional: boolean;
  },
): Promise<void> {
  let consentState: WalkerOS.Consent = {};

  switch (consentType) {
    case 'accept':
      // User accepts all tracking
      consentState = {
        functional: true,
        analytics: true,
        marketing: true,
        ad_storage: true,
        analytics_storage: true,
        ad_user_data: true,
        ad_personalization: true,
      };
      collector.allowed = true;
      break;

    case 'reject':
      // User rejects all non-essential tracking
      consentState = {
        functional: true, // Essential cookies only
        analytics: false,
        marketing: false,
        ad_storage: false,
        analytics_storage: false,
        ad_user_data: false,
        ad_personalization: false,
      };
      collector.allowed = false;
      break;

    case 'customize':
      // User customizes consent preferences
      if (customConsent) {
        consentState = {
          functional: true, // Always required
          analytics: customConsent.analytics,
          marketing: customConsent.advertising,
          ad_storage: customConsent.advertising,
          analytics_storage: customConsent.analytics,
          ad_user_data: customConsent.advertising,
          ad_personalization: customConsent.advertising,
        };
        collector.allowed =
          customConsent.analytics || customConsent.advertising;
      }
      break;
  }

  // Update consent state
  await collector.push({
    event: 'walker consent',
    data: consentState,
    context: {},
    globals: {},
    custom: {},
    user: {},
    nested: [],
    consent: {},
    id: '',
    trigger: '',
    entity: 'walker',
    action: 'consent',
    timestamp: Date.now(),
    timing: 0,
    group: '',
    count: 0,
    version: { source: '0.0.7', tagging: 0 },
    source: { type: 'collector', id: '', previous_id: '' },
  });

  console.log(`Consent updated: ${consentType}`, consentState);
}

export async function trackConsentedEvents(elb: WalkerOS.Elb): Promise<void> {
  // This event will only be sent if consent allows it
  await elb('page view', {
    title: 'Consent Demo Page',
    category: 'demo',
  });

  // Marketing events require marketing consent
  await elb('product view', {
    id: 'demo-product',
    name: 'Consent Example Product',
    price: 29.99,
  });

  // Functional events (like error tracking) might always be allowed
  await elb('error occurred', {
    type: 'javascript',
    message: 'Demo error for testing',
    severity: 'low',
  });
}

// Simulate consent banner interaction
export async function simulateConsentBanner(
  elb: WalkerOS.Elb,
  collector: Collector.Instance,
): Promise<void> {
  console.log('🍪 Consent banner shown');

  // Simulate user clicking "Accept All"
  setTimeout(async () => {
    console.log('✅ User accepted all cookies');
    await handleConsentChoice(collector, 'accept');

    // Now tracking events will be sent
    await trackConsentedEvents(elb);
  }, 1000);

  // Alternative: Simulate custom consent
  // setTimeout(async () => {
  //   console.log('⚙️ User customized consent');
  //   await handleConsentChoice(collector, 'customize', {
  //     analytics: true,
  //     advertising: false,
  //     functional: true,
  //   });
  //   await trackConsentedEvents(elb);
  // }, 1000);
}
