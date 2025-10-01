import type { SendWebOptions } from '@walkeros/web-core';
import type { WalkerOS, Mapping } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import sourceBrowser from '@walkeros/web-source-browser';
import destinationAPI from '@walkeros/web-destination-api';
import destinationGtag from '@walkeros/web-destination-gtag';

describe('walkerOS Web Basic Example', () => {
  test('complete working setup with all destinations', async () => {
    // Mock functions for testing environment
    const mockSendWeb = jest.fn(
      (url: string, body: string, options: SendWebOptions) => {
        // console.log('📡 API Call:', { url, body: JSON.parse(body), options });
      },
    );
    const mockGtag = jest.fn((...args: unknown[]) => {
      // console.log('🎯 Gtag Call:', args);
    });
    const consoleEvents: string[] = [];

    // Create complete collector setup - demonstrates exact createCollector usage
    const { elb } = await createCollector({
      // Browser source for DOM events, sessions, pageviews
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            settings: {
              pageview: false, // Disabled for test reliability
              session: false, // Disabled for test simplicity
              elb: 'elb', // Makes window.elb available globally
              prefix: 'data-elb',
            },
          },
        },
      },

      // Multiple destinations process events in parallel
      destinations: {
        // 1. Simple console destination for debugging
        console: {
          code: {
            type: 'console',
            config: {},
            push(event) {
              consoleEvents.push(event.name);
              // console.log('📊 Event captured:', event.name);
            },
          },
        },

        // 2. API destination sends events to HTTP endpoint
        api: {
          code: destinationAPI,
          config: {
            settings: {
              url: 'https://analytics.example.com/events',
              method: 'POST',
              headers: { 'X-R4N': 'D0M' },
            },
          },
          env: {
            sendWeb: mockSendWeb, // Mock sendWeb function
          },
        },

        // 3. Google gtag destination for GA4 and Google Ads
        gtag: {
          code: destinationGtag,
          config: {
            settings: {
              ga4: {
                measurementId: 'G-XXXXXXXXXX',
              },
              ads: {
                conversionId: 'AW-XXXXXXXXX',
              },
            },
            mapping: {
              // E-commerce purchase event mapping
              order: {
                complete: {
                  name: 'purchase',
                  settings: {
                    ga4: {
                      include: ['data'],
                    },
                    ads: {},
                  },
                  data: {
                    map: {
                      transaction_id: 'data.id',
                      value: 'data.total',
                      currency: { value: 'EUR' },
                    },
                  },
                },
              },
            },
          },
          env: {
            window: {
              gtag: mockGtag,
              dataLayer: [],
            },
            document: {
              createElement: () => ({
                setAttribute: () => {},
                removeAttribute: () => {},
              }),
              head: { appendChild: () => {} },
            },
          },
        },
      },
    });

    // Test order complete event with full mapping using typical event structure
    const orderEvent = getEvent('order complete');
    await elb(orderEvent);

    // Verify all destinations were called immediately
    expect(consoleEvents).toContain('order complete');

    // Verify API destination call details
    expect(mockSendWeb).toHaveBeenCalledWith(
      'https://analytics.example.com/events',
      expect.stringContaining(JSON.stringify(orderEvent)),
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-R4N': 'D0M' },
      }),
    );

    // Verify gtag destination call details for purchase event
    expect(mockGtag).toHaveBeenCalledWith('js', expect.any(Date));
    expect(mockGtag).toHaveBeenCalledWith(
      'config',
      'G-XXXXXXXXXX',
      expect.any(Object),
    );
    expect(mockGtag).toHaveBeenCalledWith(
      'event',
      'purchase',
      expect.objectContaining({
        transaction_id: orderEvent.data.id,
        value: orderEvent.data.total,
        data_total: 555,
        currency: 'EUR',
      }),
    );
    expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-XXXXXXXXX/purchase',
      currency: 'EUR',
      transaction_id: '0rd3r1d',
      value: 555,
    });
  });
});
