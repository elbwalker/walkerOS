import type { WalkerOS } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationAPI } from '@walkeros/web-destination-api';
import { destinationGtag } from '@walkeros/web-destination-gtag';

describe('walkerOS Web Basic Example', () => {
  test('complete working setup with all destinations', async () => {
    // Mock functions for testing environment
    const mockSendWeb = jest.fn((url: string, body: string, options: any) => {
      console.log('📡 API Call:', { url, body: JSON.parse(body), options });
    });
    const mockGtag = jest.fn((...args: unknown[]) => {
      console.log('🎯 Gtag Call:', args);
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
          env: {
            window,
            document,
            // elb function is automatically injected by collector
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
            push(event: WalkerOS.Event) {
              consoleEvents.push(event.name);
              console.log('📊 Event captured:', {
                name: event.name,
                entity: event.entity,
                action: event.action,
                data: event.data,
              });
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
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'your-api-key',
              },
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

    // Test basic functionality
    await elb('user login', { userId: 'test123', email: 'test@example.com' });

    // Verify console destination
    expect(consoleEvents).toContain('user login');

    // Test order complete event with full mapping
    await elb('order complete', {
      id: 'ORDER-456',
      total: 149.99,
      currency: 'USD',
    });

    // Verify all destinations were called immediately
    expect(consoleEvents).toContain('order complete');
    expect(mockSendWeb).toHaveBeenCalled();
    expect(mockGtag).toHaveBeenCalled();
    expect(typeof elb).toBe('function');
  }, 10000); // 10 second timeout
});
