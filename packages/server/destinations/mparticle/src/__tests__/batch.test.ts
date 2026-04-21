import {
  buildAuthHeader,
  buildBatch,
  buildCommerceEvent,
  buildCustomEvent,
  buildEndpoint,
  buildScreenViewEvent,
} from '../batch';

describe('batch helpers', () => {
  test('buildEndpoint returns us1 endpoint by default', () => {
    expect(buildEndpoint()).toBe('https://s2s.mparticle.com/v2/events');
    expect(buildEndpoint('us1')).toBe('https://s2s.mparticle.com/v2/events');
  });

  test('buildEndpoint returns pod-qualified endpoints', () => {
    expect(buildEndpoint('us2')).toBe(
      'https://s2s.us2.mparticle.com/v2/events',
    );
    expect(buildEndpoint('eu1')).toBe(
      'https://s2s.eu1.mparticle.com/v2/events',
    );
    expect(buildEndpoint('au1')).toBe(
      'https://s2s.au1.mparticle.com/v2/events',
    );
  });

  test('buildAuthHeader produces HTTP Basic header', () => {
    expect(buildAuthHeader('key', 'secret')).toBe(
      `Basic ${Buffer.from('key:secret').toString('base64')}`,
    );
  });

  test('buildCustomEvent returns a custom_event payload', () => {
    const mpEvent = buildCustomEvent(
      'product view',
      'other',
      { a: 1 },
      1700000000000,
      'msg-1',
    );
    expect(mpEvent).toEqual({
      event_type: 'custom_event',
      data: {
        event_name: 'product view',
        custom_event_type: 'other',
        custom_attributes: { a: 1 },
        timestamp_unixtime_ms: 1700000000000,
        source_message_id: 'msg-1',
      },
    });
  });

  test('buildScreenViewEvent returns a screen_view payload', () => {
    expect(
      buildScreenViewEvent('Home', { path: '/' }, 1700000000000, 'msg-2'),
    ).toEqual({
      event_type: 'screen_view',
      data: {
        screen_name: 'Home',
        custom_attributes: { path: '/' },
        timestamp_unixtime_ms: 1700000000000,
        source_message_id: 'msg-2',
      },
    });
  });

  test('buildCommerceEvent returns a commerce_event payload', () => {
    expect(
      buildCommerceEvent(
        {
          currency_code: 'USD',
          product_action: { action: 'purchase', transaction_id: 'T1' },
        },
        undefined,
        1700000000000,
        'msg-3',
      ),
    ).toEqual({
      event_type: 'commerce_event',
      data: {
        currency_code: 'USD',
        product_action: { action: 'purchase', transaction_id: 'T1' },
        timestamp_unixtime_ms: 1700000000000,
        source_message_id: 'msg-3',
      },
    });
  });

  test('buildBatch wraps events with environment and identity', () => {
    const mpEvent = buildCustomEvent(
      'product view',
      'other',
      undefined,
      1700000000000,
      'msg-1',
    );
    expect(
      buildBatch(
        [mpEvent],
        { customer_id: 'u1' },
        { plan: 'pro' },
        'production',
      ),
    ).toEqual({
      events: [mpEvent],
      user_identities: { customer_id: 'u1' },
      user_attributes: { plan: 'pro' },
      environment: 'production',
    });
  });
});
