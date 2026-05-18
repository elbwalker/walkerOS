import { mapHitToEvents } from '../map';
import { defaultMapping } from '../defaults';
import type { GA4Hit, GA4Mapping } from '../types';

describe('mapHitToEvents — page_view', () => {
  it('maps a page_view GET hit', () => {
    const hit: GA4Hit = {
      hit: {
        v: '2',
        tid: 'G-XXX',
        cid: '111.222',
        sid: '1700000000',
        dl: 'https://shop.example/cart',
        dt: 'Cart',
      },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      name: 'page view',
      entity: 'page',
      action: 'view',
      data: { id: 'https://shop.example/cart', title: 'Cart' },
    });
  });
});

describe('mapHitToEvents — hit-level merge', () => {
  it('populates user from hit-level cid, sid, uid', () => {
    const hit: GA4Hit = {
      hit: {
        tid: 'G-X',
        cid: '111.222',
        sid: '1700000000',
        uid: 'user-42',
        dl: 'https://x',
      },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0].user).toMatchObject({
      id: 'user-42',
      device: '111.222',
      session: '1700000000',
    });
  });

  it('populates globals from hit-level ul, sr', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', ul: 'de-de', sr: '1920x1080', dl: 'https://x' },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0].globals).toMatchObject({
      language: 'de-de',
      screen: '1920x1080',
    });
  });

  it('populates source from hit-level p (platform) and adds type:ga4', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', p: 'web', dl: 'https://x' },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0].source).toMatchObject({ type: 'ga4', platform: 'web' });
  });

  it('populates consent from gcs', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', gcs: 'G111', dl: 'https://x' },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0].consent).toEqual({ analytics: true, marketing: true });
  });

  it('populates id from hit._p when present', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', _p: '9876543210', dl: 'https://x' },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0].id).toBe('9876543210');
  });

  it('generates a non-empty id when hit._p is missing', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(typeof out[0].id).toBe('string');
    expect((out[0].id ?? '').length).toBeGreaterThan(0);
  });

  it('populates timestamp from hit.sid (epoch seconds → ms) and timing from event._et', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', sid: '1700000000', dl: 'https://x' },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {}, _et: 1234 },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0].timestamp).toBe(1700000000 * 1000);
    expect(out[0].timing).toBe(1234);
  });

  it('defaults timing to 0 when event._et missing', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', sid: '1700000000', dl: 'https://x' },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0].timing).toBe(0);
  });

  it('sets trigger to "ga4"', () => {
    const out = mapHitToEvents(
      {
        hit: { tid: 'G-X', dl: 'https://x' },
        events: [
          {
            en: 'page_view',
            params: { ep: {}, epn: {}, up: {}, upn: {} },
            items: [],
          },
        ],
      },
      defaultMapping,
    );
    expect(out[0].trigger).toBe('ga4');
  });
});

describe('mapHitToEvents — items → nested', () => {
  it('attaches items as nested product entities with mapped data keys', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'view_item',
          params: {
            ep: { currency: 'EUR' },
            epn: { value: 39.9 },
            up: {},
            upn: {},
          },
          items: [
            {
              id: 'SKU1',
              name: 'Red Shirt',
              brand: 'Acme',
              price: 29.95,
              quantity: 2,
              custom: {},
            },
          ],
        },
      ],
    };
    const customMapping: GA4Mapping = {
      view_item: { name: 'product view' },
    };
    const out = mapHitToEvents(hit, customMapping);
    expect(out[0].nested).toEqual([
      {
        entity: 'product',
        data: {
          id: 'SKU1',
          name: 'Red Shirt',
          brand: 'Acme',
          price: 29.95,
          quantity: 2,
        },
        nested: [],
        context: {},
      },
    ]);
  });

  it('maps the full set of GA4Item fields (camelCase → snake_case) and custom keys', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'view_item',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [
            {
              id: 'SKU2',
              name: 'Blue Hat',
              brand: 'Acme',
              category: 'Accessories',
              category2: 'Hats',
              category3: 'Casual',
              category4: 'Summer',
              category5: 'New',
              variant: 'blue',
              price: 19.95,
              quantity: 1,
              coupon: 'SUMMER',
              discount: 5,
              listName: 'related items',
              listId: 'list_42',
              listPosition: 3,
              locationId: 'L1',
              affiliation: 'Online Store',
              creativeName: 'banner_top',
              creativeSlot: 'top',
              promotionId: 'PROMO',
              promotionName: 'Summer Sale',
              custom: { color: 'blue', size: 'M' },
            },
          ],
        },
      ],
    };
    const customMapping: GA4Mapping = {
      view_item: { name: 'product view' },
    };
    const out = mapHitToEvents(hit, customMapping);
    expect(out[0].nested).toEqual([
      {
        entity: 'product',
        data: {
          id: 'SKU2',
          name: 'Blue Hat',
          brand: 'Acme',
          category: 'Accessories',
          category2: 'Hats',
          category3: 'Casual',
          category4: 'Summer',
          category5: 'New',
          variant: 'blue',
          price: 19.95,
          quantity: 1,
          coupon: 'SUMMER',
          discount: 5,
          list_name: 'related items',
          list_id: 'list_42',
          list_position: 3,
          location_id: 'L1',
          affiliation: 'Online Store',
          creative_name: 'banner_top',
          creative_slot: 'top',
          promotion_id: 'PROMO',
          promotion_name: 'Summer Sale',
          color: 'blue',
          size: 'M',
        },
        nested: [],
        context: {},
      },
    ]);
  });

  it('omits nested when items is empty', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'page_view',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0].nested).toBeUndefined();
  });
});

describe('mapHitToEvents — purchase (canary)', () => {
  it('purchase: T-9001 with 2 items', () => {
    const hit: GA4Hit = {
      hit: {
        v: '2',
        tid: 'G-XXX',
        cid: '111.222',
        sid: '1700000000',
        dl: 'https://shop/success',
        dt: 'Thanks',
        ul: 'de-de',
      },
      events: [
        {
          en: 'purchase',
          params: {
            ep: {
              transaction_id: 'T-9001',
              currency: 'EUR',
              coupon: 'SUMMER10',
            },
            epn: { value: 129.9, tax: 20.78, shipping: 4.99 },
            up: {},
            upn: {},
            _et: 1234,
          },
          items: [
            {
              id: 'SKU1',
              name: 'Red Shirt',
              brand: 'Acme',
              category: 'Apparel',
              variant: 'red',
              price: 29.95,
              quantity: 2,
              custom: {},
            },
            {
              id: 'SKU2',
              name: 'Blue Hat',
              brand: 'Acme',
              category: 'Accessories',
              price: 69.95,
              quantity: 1,
              custom: {},
            },
          ],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      name: 'order complete',
      entity: 'order',
      action: 'complete',
      data: {
        id: 'T-9001',
        currency: 'EUR',
        total: 129.9,
        tax: 20.78,
        shipping: 4.99,
        coupon: 'SUMMER10',
      },
      nested: [
        {
          entity: 'product',
          data: {
            id: 'SKU1',
            name: 'Red Shirt',
            brand: 'Acme',
            category: 'Apparel',
            variant: 'red',
            price: 29.95,
            quantity: 2,
          },
        },
        {
          entity: 'product',
          data: {
            id: 'SKU2',
            name: 'Blue Hat',
            brand: 'Acme',
            category: 'Accessories',
            price: 69.95,
            quantity: 1,
          },
        },
      ],
      timing: 1234,
      user: { device: '111.222', session: '1700000000' },
      globals: { language: 'de-de' },
      source: { type: 'ga4' },
    });
  });
});

describe('mapHitToEvents — ecommerce family', () => {
  const baseHit = (
    en: string,
    params: GA4Hit['events'][0]['params'],
    items: GA4Hit['events'][0]['items'] = [],
  ): GA4Hit => ({
    hit: { tid: 'G-X', dl: 'https://x' },
    events: [{ en, params, items }],
  });

  it('view_item → product view', () => {
    const out = mapHitToEvents(
      baseHit('view_item', {
        ep: { currency: 'EUR' },
        epn: { value: 39.9 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'product view',
      entity: 'product',
      action: 'view',
      data: { currency: 'EUR', value: 39.9 },
    });
  });

  it('add_to_cart → product add', () => {
    const out = mapHitToEvents(
      baseHit('add_to_cart', {
        ep: { currency: 'EUR' },
        epn: { value: 19.95 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'product add',
      entity: 'product',
      action: 'add',
      data: { currency: 'EUR', value: 19.95 },
    });
  });

  it('remove_from_cart → product remove', () => {
    const out = mapHitToEvents(
      baseHit('remove_from_cart', {
        ep: { currency: 'EUR' },
        epn: { value: 9.5 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'product remove',
      entity: 'product',
      action: 'remove',
      data: { currency: 'EUR', value: 9.5 },
    });
  });

  it('view_cart → cart view', () => {
    const out = mapHitToEvents(
      baseHit('view_cart', {
        ep: { currency: 'EUR' },
        epn: { value: 199.0 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'cart view',
      entity: 'cart',
      action: 'view',
      data: { currency: 'EUR', value: 199.0 },
    });
  });

  it('begin_checkout → order start', () => {
    const out = mapHitToEvents(
      baseHit('begin_checkout', {
        ep: { currency: 'EUR', coupon: 'SUMMER10' },
        epn: { value: 199.0 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'order start',
      entity: 'order',
      action: 'start',
      data: { currency: 'EUR', value: 199.0, coupon: 'SUMMER10' },
    });
  });

  it('add_shipping_info → order shipping', () => {
    const out = mapHitToEvents(
      baseHit('add_shipping_info', {
        ep: { currency: 'EUR', shipping_tier: 'Ground' },
        epn: { value: 199.0 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'order shipping',
      entity: 'order',
      action: 'shipping',
      data: { currency: 'EUR', value: 199.0, tier: 'Ground' },
    });
  });

  it('add_payment_info → order payment', () => {
    const out = mapHitToEvents(
      baseHit('add_payment_info', {
        ep: { currency: 'EUR', payment_type: 'Card' },
        epn: { value: 199.0 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'order payment',
      entity: 'order',
      action: 'payment',
      data: { currency: 'EUR', value: 199.0, type: 'Card' },
    });
  });

  it('refund → order refund', () => {
    const out = mapHitToEvents(
      baseHit('refund', {
        ep: { transaction_id: 'T-9001', currency: 'EUR' },
        epn: { value: 129.9 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'order refund',
      entity: 'order',
      action: 'refund',
      data: { id: 'T-9001', currency: 'EUR', total: 129.9 },
    });
  });

  it('add_to_wishlist → wishlist add', () => {
    const out = mapHitToEvents(
      baseHit('add_to_wishlist', {
        ep: { currency: 'EUR' },
        epn: { value: 29.95 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'wishlist add',
      entity: 'wishlist',
      action: 'add',
      data: { currency: 'EUR', value: 29.95 },
    });
  });
});

describe('mapHitToEvents — list / promotion family', () => {
  it('view_item_list → list view', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'view_item_list',
          params: {
            ep: { item_list_id: 'L-42', item_list_name: 'Featured' },
            epn: {},
            up: {},
            upn: {},
          },
          items: [{ id: 'SKU1', name: 'Red Shirt', price: 29.95, custom: {} }],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0]).toMatchObject({
      name: 'list view',
      entity: 'list',
      action: 'view',
      data: { id: 'L-42', name: 'Featured' },
      nested: [
        {
          entity: 'product',
          data: { id: 'SKU1', name: 'Red Shirt', price: 29.95 },
        },
      ],
    });
  });

  it('select_item → product click', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'select_item',
          params: {
            ep: { item_list_id: 'L-42', item_list_name: 'Featured' },
            epn: {},
            up: {},
            upn: {},
          },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0]).toMatchObject({
      name: 'product click',
      entity: 'product',
      action: 'click',
      data: { list_id: 'L-42', list_name: 'Featured' },
    });
  });

  it('view_promotion → promotion view (reads from firstItem)', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'view_promotion',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [
            {
              id: 'SKU1',
              promotionId: 'P-100',
              promotionName: 'Summer Sale',
              creativeName: 'banner_top',
              creativeSlot: 'top',
              custom: {},
            },
          ],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0]).toMatchObject({
      name: 'promotion view',
      entity: 'promotion',
      action: 'view',
      data: {
        id: 'P-100',
        name: 'Summer Sale',
        creative: 'banner_top',
        slot: 'top',
      },
    });
  });

  it('select_promotion → promotion click (reads from firstItem)', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'select_promotion',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [
            {
              id: 'SKU1',
              promotionId: 'P-200',
              promotionName: 'Winter Deal',
              creativeName: 'banner_side',
              creativeSlot: 'side',
              custom: {},
            },
          ],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0]).toMatchObject({
      name: 'promotion click',
      entity: 'promotion',
      action: 'click',
      data: {
        id: 'P-200',
        name: 'Winter Deal',
        creative: 'banner_side',
        slot: 'side',
      },
    });
  });

  it('select_content → content select', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X', dl: 'https://x' },
      events: [
        {
          en: 'select_content',
          params: {
            ep: { content_type: 'article', content_id: 'A-7' },
            epn: {},
            up: {},
            upn: {},
          },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0]).toMatchObject({
      name: 'content select',
      entity: 'content',
      action: 'select',
      data: { type: 'article', id: 'A-7' },
    });
  });
});

describe('mapHitToEvents — engagement family', () => {
  const baseHit = (
    en: string,
    params: GA4Hit['events'][0]['params'],
  ): GA4Hit => ({
    hit: { tid: 'G-X', dl: 'https://x' },
    events: [{ en, params, items: [] }],
  });

  it('scroll → page scroll', () => {
    const out = mapHitToEvents(
      baseHit('scroll', {
        ep: {},
        epn: { percent_scrolled: 90 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'page scroll',
      entity: 'page',
      action: 'scroll',
      data: { percent: 90 },
    });
  });

  it('click → link click', () => {
    const out = mapHitToEvents(
      baseHit('click', {
        ep: {
          link_url: 'https://example.com/x',
          link_domain: 'example.com',
          outbound: 'true',
        },
        epn: {},
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'link click',
      entity: 'link',
      action: 'click',
      data: {
        url: 'https://example.com/x',
        domain: 'example.com',
        outbound: 'true',
      },
    });
  });

  it('file_download → file download', () => {
    const out = mapHitToEvents(
      baseHit('file_download', {
        ep: {
          file_name: 'report',
          file_extension: 'pdf',
          link_url: 'https://x/report.pdf',
        },
        epn: {},
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'file download',
      entity: 'file',
      action: 'download',
      data: {
        name: 'report',
        extension: 'pdf',
        url: 'https://x/report.pdf',
      },
    });
  });

  it('video_start → video start', () => {
    const out = mapHitToEvents(
      baseHit('video_start', {
        ep: { video_title: 'Intro' },
        epn: {
          video_duration: 120,
          video_current_time: 0,
          video_percent: 0,
        },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'video start',
      entity: 'video',
      action: 'start',
      data: { title: 'Intro', duration: 120, current: 0, percent: 0 },
    });
  });

  it('video_progress → video progress', () => {
    const out = mapHitToEvents(
      baseHit('video_progress', {
        ep: { video_title: 'Intro' },
        epn: {
          video_duration: 120,
          video_current_time: 60,
          video_percent: 50,
        },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'video progress',
      entity: 'video',
      action: 'progress',
      data: { title: 'Intro', duration: 120, current: 60, percent: 50 },
    });
  });

  it('video_complete → video complete', () => {
    const out = mapHitToEvents(
      baseHit('video_complete', {
        ep: { video_title: 'Intro' },
        epn: {
          video_duration: 120,
          video_current_time: 120,
          video_percent: 100,
        },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'video complete',
      entity: 'video',
      action: 'complete',
      data: { title: 'Intro', duration: 120, current: 120, percent: 100 },
    });
  });

  it('form_start → form start', () => {
    const out = mapHitToEvents(
      baseHit('form_start', {
        ep: {
          form_id: 'F1',
          form_name: 'Contact',
          form_destination: 'https://x/submit',
        },
        epn: {},
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'form start',
      entity: 'form',
      action: 'start',
      data: {
        id: 'F1',
        name: 'Contact',
        destination: 'https://x/submit',
      },
    });
  });

  it('form_submit → form submit', () => {
    const out = mapHitToEvents(
      baseHit('form_submit', {
        ep: {
          form_id: 'F1',
          form_name: 'Contact',
          form_destination: 'https://x/submit',
        },
        epn: {},
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'form submit',
      entity: 'form',
      action: 'submit',
      data: {
        id: 'F1',
        name: 'Contact',
        destination: 'https://x/submit',
      },
    });
  });

  it('search → search submit', () => {
    const out = mapHitToEvents(
      baseHit('search', {
        ep: { search_term: 'sneakers' },
        epn: {},
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'search submit',
      entity: 'search',
      action: 'submit',
      data: { term: 'sneakers' },
    });
  });

  it('login → session login', () => {
    const out = mapHitToEvents(
      baseHit('login', {
        ep: { method: 'google' },
        epn: {},
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'session login',
      entity: 'session',
      action: 'login',
      data: { method: 'google' },
    });
  });

  it('sign_up → session signup', () => {
    const out = mapHitToEvents(
      baseHit('sign_up', {
        ep: { method: 'email' },
        epn: {},
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'session signup',
      entity: 'session',
      action: 'signup',
      data: { method: 'email' },
    });
  });

  it('generate_lead → lead generate', () => {
    const out = mapHitToEvents(
      baseHit('generate_lead', {
        ep: { currency: 'EUR' },
        epn: { value: 50 },
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'lead generate',
      entity: 'lead',
      action: 'generate',
      data: { currency: 'EUR', value: 50 },
    });
  });

  it('share → content share', () => {
    const out = mapHitToEvents(
      baseHit('share', {
        ep: { method: 'twitter', content_type: 'article', item_id: 'A-9' },
        epn: {},
        up: {},
        upn: {},
      }),
      defaultMapping,
    );
    expect(out[0]).toMatchObject({
      name: 'content share',
      entity: 'content',
      action: 'share',
      data: { method: 'twitter', type: 'article', id: 'A-9' },
    });
  });
});

describe('mapHitToEvents — auto-fired noise events', () => {
  it('drops user_engagement by default', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X' },
      events: [
        {
          en: 'user_engagement',
          params: {
            ep: {},
            epn: { engagement_time_msec: 1500 },
            up: {},
            upn: {},
          },
          items: [],
        },
      ],
    };
    expect(mapHitToEvents(hit, defaultMapping)).toEqual([]);
  });

  it('drops session_start by default', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X' },
      events: [
        {
          en: 'session_start',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    expect(mapHitToEvents(hit, defaultMapping)).toEqual([]);
  });

  it('drops first_visit by default', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X' },
      events: [
        {
          en: 'first_visit',
          params: { ep: {}, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    expect(mapHitToEvents(hit, defaultMapping)).toEqual([]);
  });

  it('user can opt in by overriding ignore', () => {
    const userMapping: GA4Mapping = {
      ...defaultMapping,
      user_engagement: {
        name: 'session engagement',
        data: { map: { time: 'params.epn.engagement_time_msec' } },
      },
    };
    const hit: GA4Hit = {
      hit: { tid: 'G-X' },
      events: [
        {
          en: 'user_engagement',
          params: {
            ep: {},
            epn: { engagement_time_msec: 1500 },
            up: {},
            upn: {},
          },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, userMapping);
    expect(out[0]).toMatchObject({
      name: 'session engagement',
      data: { time: 1500 },
    });
  });
});

describe('mapHitToEvents — * fallback', () => {
  it('falls back to ga4 track for unknown events', () => {
    const hit: GA4Hit = {
      hit: { tid: 'G-X' },
      events: [
        {
          en: 'custom_something',
          params: { ep: { foo: 'bar' }, epn: {}, up: {}, upn: {} },
          items: [],
        },
      ],
    };
    const out = mapHitToEvents(hit, defaultMapping);
    expect(out[0]).toMatchObject({
      name: 'ga4 track',
      entity: 'ga4',
      action: 'track',
      data: { event_name: 'custom_something' },
    });
  });
});
