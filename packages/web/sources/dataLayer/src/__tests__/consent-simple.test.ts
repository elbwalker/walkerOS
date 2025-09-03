import { sourceDataLayer } from '../index';
import type { WalkerOS, Elb } from '@walkeros/core';
import { createMockPush, getDataLayer } from './test-utils';

describe('DataLayer Source - Consent Handling', () => {
  let collectedEvents: WalkerOS.Event[];
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(async () => {
    delete window.dataLayer;
    collectedEvents = [];
    mockElb = createMockPush(collectedEvents);
  });

  test('processes gtag consent default events', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    getDataLayer().push([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500,
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent default',
      data: expect.objectContaining({
        event: 'consent default',
        ad_storage: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500,
      }),
    });
  });

  test('processes gtag consent update events', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    getDataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'granted',
        analytics_storage: 'granted',
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent update',
      data: expect.objectContaining({
        event: 'consent update',
        ad_storage: 'granted',
        analytics_storage: 'granted',
      }),
    });
  });

  test('handles sequential consent events', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // First set default consent
    getDataLayer().push([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        analytics_storage: 'denied',
      },
    ]);

    // Then update consent
    getDataLayer().push([
      'consent',
      'update',
      {
        analytics_storage: 'granted',
      },
    ]);

    expect(collectedEvents).toHaveLength(2);

    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent default',
      data: expect.objectContaining({
        ad_storage: 'denied',
        analytics_storage: 'denied',
      }),
    });

    expect(collectedEvents[1]).toMatchObject({
      event: 'dataLayer consent update',
      data: expect.objectContaining({
        analytics_storage: 'granted',
      }),
    });
  });

  test('handles consent events with custom regions', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    getDataLayer().push([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        region: ['US-CA', 'US-NY'],
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent default',
      data: expect.objectContaining({
        ad_storage: 'denied',
        analytics_storage: 'denied',
        region: ['US-CA', 'US-NY'],
      }),
    });
  });

  test('ignores malformed consent events', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Various malformed consent events
    getDataLayer().push(['consent']); // Missing action
    getDataLayer().push(['consent', 'update']); // Missing parameters
    getDataLayer().push(['consent', 'invalid_action', {}]); // Invalid action
    getDataLayer().push(['consent', 'update', null]); // Null parameters

    // No events should be processed
    expect(collectedEvents).toHaveLength(0);
  });

  test('processes consent events with additional custom properties', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    getDataLayer().push([
      'consent',
      'update',
      {
        ad_storage: 'granted',
        analytics_storage: 'granted',
        personalization_storage: 'denied',
        functionality_storage: 'granted',
        security_storage: 'granted',
        custom_consent_type: 'partial',
      },
    ]);

    expect(collectedEvents).toHaveLength(1);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent update',
      data: expect.objectContaining({
        event: 'consent update',
        ad_storage: 'granted',
        analytics_storage: 'granted',
        personalization_storage: 'denied',
        functionality_storage: 'granted',
        security_storage: 'granted',
        custom_consent_type: 'partial',
      }),
    });
  });

  test('handles consent events mixed with other event types', async () => {
    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    // Mix consent events with regular events
    getDataLayer().push({ event: 'page_view', page: 'home' });
    getDataLayer().push(['consent', 'default', { ad_storage: 'denied' }]);
    getDataLayer().push(['event', 'user_engagement']);
    getDataLayer().push(['consent', 'update', { ad_storage: 'granted' }]);

    expect(collectedEvents).toHaveLength(4);

    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer page_view',
    });
    expect(collectedEvents[1]).toMatchObject({
      event: 'dataLayer consent default',
    });
    expect(collectedEvents[2]).toMatchObject({
      event: 'dataLayer user_engagement',
    });
    expect(collectedEvents[3]).toMatchObject({
      event: 'dataLayer consent update',
    });
  });

  test('processes existing consent events on initialization', async () => {
    // Setup dataLayer with existing consent events
    window.dataLayer = [
      [
        'consent',
        'default',
        { ad_storage: 'denied', analytics_storage: 'denied' },
      ],
      { event: 'page_view' },
      ['consent', 'update', { analytics_storage: 'granted' }],
    ];

    await sourceDataLayer({ settings: {} }, { elb: mockElb, window });

    expect(collectedEvents).toHaveLength(3);
    expect(collectedEvents[0]).toMatchObject({
      event: 'dataLayer consent default',
    });
    expect(collectedEvents[1]).toMatchObject({
      event: 'dataLayer page_view',
    });
    expect(collectedEvents[2]).toMatchObject({
      event: 'dataLayer consent update',
    });
  });
});
