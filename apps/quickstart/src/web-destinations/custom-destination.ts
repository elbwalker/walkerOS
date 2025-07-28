import { createCollector } from '@walkerOS/collector';
import type { WalkerOS, Destination, Collector } from '@walkerOS/core';

// Custom destination that sends events to a webhook
const customWebhookDestination: Destination.Instance = {
  type: 'webhook',

  config: {},

  init({ config }) {
    const { settings } = config;
    const settingsObj =
      settings && typeof settings === 'object'
        ? (settings as Record<string, unknown>)
        : {};
    if (!settingsObj.url || typeof settingsObj.url !== 'string') {
      console.warn('Custom webhook destination: URL not configured');
      return false;
    }
    console.log('Custom webhook destination initialized');
  },

  async push(event, { config }) {
    const { settings } = config;
    const settingsObj =
      settings && typeof settings === 'object'
        ? (settings as Record<string, unknown>)
        : {};

    if (!settingsObj.url || typeof settingsObj.url !== 'string') {
      console.warn(
        'Custom webhook destination: No URL configured, skipping event',
      );
      return;
    }

    // Send to webhook
    try {
      const headers =
        settingsObj.headers && typeof settingsObj.headers === 'object'
          ? (settingsObj.headers as Record<string, string>)
          : {};

      const response = await fetch(settingsObj.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          event: event.event,
          data: event.data,
          user: event.user,
          session: event.context?.session,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('Event sent to webhook:', event.event);
    } catch (error) {
      console.error('Failed to send event to webhook:', error);
      throw error;
    }
  },
};

export async function setupCustomDestination(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      webhook: {
        ...customWebhookDestination,
        config: {
          settings: {
            url: 'https://webhook.site/unique-id',
            headers: {
              Authorization: 'Bearer your-api-token',
              'X-Source': 'walkerOS-quickstart',
            },
          },
          mapping: {
            // Map page views to custom event name
            page: {
              view: {
                settings: {
                  eventName: 'pageview_tracked',
                  additionalData: {
                    source: 'walkerOS',
                    version: '1.0',
                  },
                },
              },
            },
            // Map purchases with custom data
            order: {
              complete: {
                settings: {
                  eventName: 'purchase_completed',
                  additionalData: {
                    channel: 'web',
                    currency: 'USD',
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return { collector, elb };
}

export async function trackCustomDestinationEvents(
  elb: WalkerOS.Elb,
): Promise<void> {
  // Track page view
  await elb('page view', {
    title: 'Custom Destination Demo',
    url: '/demo',
  });

  // Track purchase
  await elb('order complete', {
    id: 'order-12345',
    total: 99.99,
    items: 2,
  });

  // Track custom event
  await elb('feature used', {
    feature: 'custom-destination',
    success: true,
  });
}
