import type { Mapping } from '@walkeros/core';

/**
 * Source-level mapping examples for `@walkeros/web-source-datalayer`.
 *
 * The source emits walkerOS events whose `name` is the configured `prefix`
 * (default `"dataLayer"`) followed by a space and the gtag action. The
 * collector splits `name` on the first space into `entity` and `action`,
 * so every event from this source uses the prefix as its entity:
 *
 *   gtag('event', 'add_to_cart', { ... })
 *     -> event.name   = "dataLayer add_to_cart"
 *     -> event.entity = "dataLayer"
 *     -> event.action = "add_to_cart"
 *
 *   gtag('consent', 'update', { ... })
 *     -> event.name   = "dataLayer consent update"
 *     -> event.entity = "dataLayer"
 *     -> event.action = "consent"
 *
 * Mapping rules therefore key on the prefix as entity and the gtag action
 * as action: `mapping.<prefix>.<action>`. For the gtag commands
 * `consent`, `config`, and `set`, the action equals that command name
 * (any trailing token such as `update` or a measurement ID is dropped by
 * the entity/action split; inspect it via `event.data` or a rule-level
 * `condition` if you need to branch on it).
 *
 * If you set a custom `prefix` (for example `"gtag"`), use that string as
 * the entity key: `mapping.gtag.add_to_cart`.
 */

/**
 * Consent rule. Maps `gtag('consent', 'update'|'default', { ... })` into
 * a walker consent command. The same shape covers both `update` and
 * `default` because the payload fields are identical.
 */
export const consent: Mapping.Rule = {
  name: 'walker consent',
  settings: {
    command: {
      map: {
        functional: { value: true },
        analytics: {
          key: 'analytics_storage',
          fn: (value: unknown) => value === 'granted',
        },
        marketing: {
          key: 'ad_storage',
          fn: (value: unknown) => value === 'granted',
        },
      },
    },
  },
};

/**
 * Purchase rule. Maps `gtag('event', 'purchase', { ... })` to a walker
 * `order complete` event with nested product entries.
 */
export const purchase: Mapping.Rule = {
  name: 'order complete',
  data: {
    map: {
      id: 'transaction_id',
      total: 'value',
      currency: 'currency',
      nested: {
        loop: [
          'items',
          {
            map: {
              type: { value: 'product' },
              data: {
                map: {
                  id: 'item_id',
                  name: 'item_name',
                  category: 'item_category',
                  quantity: 'quantity',
                  price: 'price',
                },
              },
            },
          },
        ],
      },
    },
  },
};

/**
 * Add-to-cart rule. Maps `gtag('event', 'add_to_cart', { ... })` to a
 * walker `product add` event for the first item in the cart.
 */
export const add_to_cart: Mapping.Rule = {
  name: 'product add',
  data: {
    map: {
      id: 'items.0.item_id',
      name: 'items.0.item_name',
      price: 'value',
      currency: 'currency',
      color: 'items.0.item_variant',
      quantity: 'items.0.quantity',
    },
  },
};

/**
 * View-item rule. Maps `gtag('event', 'view_item', { ... })` to a walker
 * `product view` event for the first item in the list.
 */
export const view_item: Mapping.Rule = {
  name: 'product view',
  data: {
    map: {
      id: 'items.0.item_id',
      name: 'items.0.item_name',
      category: 'items.0.item_category',
      price: 'items.0.price',
      currency: 'currency',
    },
  },
};

/**
 * Config rule. Maps `gtag('config', '<measurement-id>', { ... })` to a
 * walker `page view` event. The measurement ID is dropped during the
 * entity/action split, so a single rule covers every config call.
 */
export const config_event: Mapping.Rule = {
  name: 'page view',
  data: {
    map: {
      title: 'page_title',
      url: 'page_location',
    },
  },
};

/**
 * Catch-all custom event rule. Keeps the gtag event name (no `name`
 * override) and copies selected payload fields through.
 */
export const customEvent: Mapping.Rule = {
  data: {
    map: {
      user_id: 'user_id',
      custom_parameter: 'custom_parameter',
    },
  },
};

/**
 * Complete source-level mapping. The outer key is the prefix used by the
 * source (default `"dataLayer"`); change it if you configure a custom
 * prefix.
 */
export const config: Mapping.Rules = {
  dataLayer: {
    consent,
    purchase,
    add_to_cart,
    view_item,
    config: config_event,
    custom_event: customEvent,
    // Catch-all for any other gtag action under this prefix.
    '*': {
      data: {},
    },
  },
};

/**
 * Minimal consent-only mapping for focused use cases.
 */
export const consentOnlyMapping: Mapping.Rules = {
  dataLayer: {
    consent,
  },
};
