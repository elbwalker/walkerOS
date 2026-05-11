import type { GA4Mapping } from './types';

/**
 * Default GA4 event-name → walkerOS mapping rules.
 * Users may override or extend these via settings.mapping at config time.
 * The `'*'` key is the fallback for unknown event names.
 *
 * Field naming for `data.map`:
 * - Monetary: `currency` from `ep.currency`, `value`/`total` from `epn.value`,
 *   `tax` from `epn.tax`, `shipping` from `epn.shipping`, `coupon` from
 *   `ep.coupon`.
 * - Promotions read from `firstItem` (synthetic `items[0]` reference exposed by
 *   the mapper), since GA4 encodes promotion info inside item tilde strings.
 */
export const defaultMapping: GA4Mapping = {
  // --- page ---
  page_view: {
    name: 'page view',
    data: {
      map: {
        id: 'hit.dl',
        title: 'hit.dt',
        referrer: 'hit.dr',
      },
    },
  },

  // --- ecommerce ---
  purchase: {
    name: 'order complete',
    data: {
      map: {
        id: 'params.ep.transaction_id',
        currency: 'params.ep.currency',
        total: 'params.epn.value',
        tax: 'params.epn.tax',
        shipping: 'params.epn.shipping',
        coupon: 'params.ep.coupon',
      },
    },
  },
  view_item: {
    name: 'product view',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
      },
    },
  },
  add_to_cart: {
    name: 'product add',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
      },
    },
  },
  remove_from_cart: {
    name: 'product remove',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
      },
    },
  },
  view_cart: {
    name: 'cart view',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
      },
    },
  },
  begin_checkout: {
    name: 'order start',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
        coupon: 'params.ep.coupon',
      },
    },
  },
  add_shipping_info: {
    name: 'order shipping',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
        tier: 'params.ep.shipping_tier',
      },
    },
  },
  add_payment_info: {
    name: 'order payment',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
        type: 'params.ep.payment_type',
      },
    },
  },
  refund: {
    name: 'order refund',
    data: {
      map: {
        id: 'params.ep.transaction_id',
        currency: 'params.ep.currency',
        total: 'params.epn.value',
      },
    },
  },
  add_to_wishlist: {
    name: 'wishlist add',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
      },
    },
  },

  // --- list / promotion ---
  view_item_list: {
    name: 'list view',
    data: {
      map: {
        id: 'params.ep.item_list_id',
        name: 'params.ep.item_list_name',
      },
    },
  },
  select_item: {
    name: 'product click',
    data: {
      map: {
        list_id: 'params.ep.item_list_id',
        list_name: 'params.ep.item_list_name',
      },
    },
  },
  view_promotion: {
    name: 'promotion view',
    data: {
      map: {
        id: 'firstItem.promotionId',
        name: 'firstItem.promotionName',
        creative: 'firstItem.creativeName',
        slot: 'firstItem.creativeSlot',
      },
    },
  },
  select_promotion: {
    name: 'promotion click',
    data: {
      map: {
        id: 'firstItem.promotionId',
        name: 'firstItem.promotionName',
        creative: 'firstItem.creativeName',
        slot: 'firstItem.creativeSlot',
      },
    },
  },
  select_content: {
    name: 'content select',
    data: {
      map: {
        type: 'params.ep.content_type',
        id: 'params.ep.content_id',
      },
    },
  },

  // --- engagement ---
  scroll: {
    name: 'page scroll',
    data: {
      map: {
        percent: 'params.epn.percent_scrolled',
      },
    },
  },
  click: {
    name: 'link click',
    data: {
      map: {
        url: 'params.ep.link_url',
        domain: 'params.ep.link_domain',
        outbound: 'params.ep.outbound',
      },
    },
  },
  file_download: {
    name: 'file download',
    data: {
      map: {
        name: 'params.ep.file_name',
        extension: 'params.ep.file_extension',
        url: 'params.ep.link_url',
      },
    },
  },
  video_start: {
    name: 'video start',
    data: {
      map: {
        title: 'params.ep.video_title',
        duration: 'params.epn.video_duration',
        current: 'params.epn.video_current_time',
        percent: 'params.epn.video_percent',
      },
    },
  },
  video_progress: {
    name: 'video progress',
    data: {
      map: {
        title: 'params.ep.video_title',
        duration: 'params.epn.video_duration',
        current: 'params.epn.video_current_time',
        percent: 'params.epn.video_percent',
      },
    },
  },
  video_complete: {
    name: 'video complete',
    data: {
      map: {
        title: 'params.ep.video_title',
        duration: 'params.epn.video_duration',
        current: 'params.epn.video_current_time',
        percent: 'params.epn.video_percent',
      },
    },
  },
  form_start: {
    name: 'form start',
    data: {
      map: {
        id: 'params.ep.form_id',
        name: 'params.ep.form_name',
        destination: 'params.ep.form_destination',
      },
    },
  },
  form_submit: {
    name: 'form submit',
    data: {
      map: {
        id: 'params.ep.form_id',
        name: 'params.ep.form_name',
        destination: 'params.ep.form_destination',
      },
    },
  },
  search: {
    name: 'search submit',
    data: {
      map: {
        term: 'params.ep.search_term',
      },
    },
  },
  login: {
    name: 'session login',
    data: {
      map: {
        method: 'params.ep.method',
      },
    },
  },
  sign_up: {
    name: 'session signup',
    data: {
      map: {
        method: 'params.ep.method',
      },
    },
  },
  generate_lead: {
    name: 'lead generate',
    data: {
      map: {
        currency: 'params.ep.currency',
        value: 'params.epn.value',
      },
    },
  },
  share: {
    name: 'content share',
    data: {
      map: {
        method: 'params.ep.method',
        type: 'params.ep.content_type',
        id: 'params.ep.item_id',
      },
    },
  },

  // --- auto-fired noise: ignore by default (users can override) ---
  user_engagement: { ignore: true },
  session_start: { ignore: true },
  first_visit: { ignore: true },

  // --- fallback for unknown event names ---
  '*': {
    name: 'ga4 track',
    data: {
      map: {
        event_name: 'en',
      },
    },
  },
};
