import type { DestinationSnowplow } from '..';
import { ACTIONS, SCHEMAS, WEB_SCHEMAS, MEDIA_SCHEMAS } from '../types';

/**
 * Snowplow Ecommerce Mapping Examples
 *
 * Fully explicit mapping - no auto-detection or magic.
 * - `name` at rule level specifies the Snowplow action type
 * - `settings.context` defines context entities with schema and data mapping
 *
 * Pattern: name = action type, settings.context = [{ schema, data }]
 */

/**
 * Page View Mapping
 *
 * Page views use Snowplow's built-in trackPageView method.
 * No custom mapping needed - just pass through.
 */
export const pageView: DestinationSnowplow.Rule = {
  // Page view doesn't need action type - uses trackPageView()
};

/**
 * Product View Mapping
 *
 * walkerOS: elb('product view', { id: 'P123', name: 'Laptop', category: 'Electronics', price: 999 })
 * Snowplow: product_view action with product context entity
 */
export const productView: DestinationSnowplow.Rule = {
  name: ACTIONS.PRODUCT_VIEW,
  settings: {
    context: [
      {
        schema: SCHEMAS.PRODUCT,
        data: {
          id: 'data.id',
          name: 'data.name',
          category: 'data.category',
          price: 'data.price',
          currency: { key: 'data.currency', value: 'USD' },
          brand: 'data.brand',
          variant: 'data.variant',
        },
      },
    ],
  },
};

/**
 * Add to Cart Mapping
 *
 * walkerOS: elb('product add', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 })
 * Snowplow: add_to_cart action with product, cart, page, and user context entities
 *
 * Expects:
 * - data: product properties (id, name, category, price, currency, quantity)
 * - globals: cart_value, cart_currency, page_type, language
 * - user: id, email
 */
export const addToCart: DestinationSnowplow.Rule = {
  name: ACTIONS.ADD_TO_CART,
  settings: {
    context: [
      // Product entity
      {
        schema: SCHEMAS.PRODUCT,
        data: {
          id: 'data.id',
          name: 'data.name',
          category: 'data.category',
          price: 'data.price',
          currency: { key: 'data.currency', value: 'USD' },
          quantity: { key: 'data.quantity', value: 1 },
        },
      },
      // Cart entity
      {
        schema: SCHEMAS.CART,
        data: {
          total_value: 'globals.cart_value',
          currency: { key: 'globals.cart_currency', value: 'USD' },
        },
      },
      // Page entity
      {
        schema: SCHEMAS.PAGE,
        data: {
          type: 'globals.page_type',
          language: 'globals.language',
        },
      },
      // User entity - is_guest: true when user.id exists
      {
        schema: SCHEMAS.USER,
        data: {
          id: 'user.id',
          email: 'user.email',
          is_guest: {
            fn: (event) =>
              (event as { user?: { id?: string } }).user?.id ? true : undefined,
          },
        },
      },
    ],
  },
};

/**
 * Remove from Cart Mapping
 *
 * walkerOS: elb('product remove', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 })
 * Snowplow: remove_from_cart action with product context entity
 */
export const removeFromCart: DestinationSnowplow.Rule = {
  name: ACTIONS.REMOVE_FROM_CART,
  settings: {
    context: [
      {
        schema: SCHEMAS.PRODUCT,
        data: {
          id: 'data.id',
          name: 'data.name',
          category: 'data.category',
          price: 'data.price',
          currency: { key: 'data.currency', value: 'USD' },
          quantity: { key: 'data.quantity', value: 1 },
        },
      },
    ],
  },
};

/**
 * Transaction/Purchase Mapping
 *
 * walkerOS: elb('order complete') - uses default getEvent data
 * Default has: { id, currency, shipping, taxes, total } + nested products
 * Snowplow: transaction action with transaction context entity
 *
 * Note: For product contexts from nested, use loop in data.map
 */
export const transaction: DestinationSnowplow.Rule = {
  name: ACTIONS.TRANSACTION,
  settings: {
    context: [
      {
        schema: SCHEMAS.TRANSACTION,
        data: {
          transaction_id: 'data.id',
          revenue: 'data.total',
          currency: { key: 'data.currency', value: 'USD' },
          payment_method: { value: 'credit_card' },
          tax: 'data.taxes',
          shipping: 'data.shipping',
        },
      },
    ],
  },
};

/**
 * Refund Mapping
 *
 * walkerOS: elb('order refund', {
 *   transaction_id: 'ORD-123', refund_amount: 999, refund_reason: 'defective'
 * })
 * Snowplow: refund action with refund context entity
 */
export const refund: DestinationSnowplow.Rule = {
  name: ACTIONS.REFUND,
  settings: {
    context: [
      {
        schema: SCHEMAS.REFUND,
        data: {
          transaction_id: 'data.transaction_id',
          refund_amount: 'data.refund_amount',
          currency: { key: 'data.currency', value: 'USD' },
          refund_reason: 'data.refund_reason',
          refund_method: 'data.refund_method',
        },
      },
    ],
  },
};

/**
 * Checkout Step Mapping
 *
 * walkerOS: elb('checkout step', { step: 1, delivery_provider: 'express' })
 * Snowplow: checkout_step action with checkout_step context entity
 */
export const checkoutStep: DestinationSnowplow.Rule = {
  name: ACTIONS.CHECKOUT_STEP,
  settings: {
    context: [
      {
        schema: SCHEMAS.CHECKOUT_STEP,
        data: {
          step: 'data.step',
          shipping_postcode: 'data.shipping_postcode',
          billing_postcode: 'data.billing_postcode',
          delivery_provider: 'data.delivery_provider',
          delivery_method: 'data.delivery_method',
          payment_method: 'data.payment_method',
          marketing_opt_in: 'data.marketing_opt_in',
        },
      },
    ],
  },
};

/**
 * Product List View Mapping
 *
 * walkerOS: elb('product list', { category: 'Electronics' })
 * Snowplow: list_view action
 *
 * Note: For multiple products from nested, use loop in data.map
 */
export const listView: DestinationSnowplow.Rule = {
  name: ACTIONS.LIST_VIEW,
  // No context needed for list_view without products
  // Use data.map with loop for product contexts
};

/**
 * Promotion View Mapping
 *
 * walkerOS: elb('promo view', { id: 'SUMMER2024', name: 'Summer Sale', creative_id: 'banner_top' })
 * Snowplow: promo_view action with promotion context entity
 */
export const promoView: DestinationSnowplow.Rule = {
  name: ACTIONS.PROMO_VIEW,
  settings: {
    context: [
      {
        schema: SCHEMAS.PROMOTION,
        data: {
          id: 'data.id',
          name: 'data.name',
          creative_id: 'data.creative_id',
          type: 'data.type',
          position: 'data.position',
          slot: 'data.slot',
        },
      },
    ],
  },
};

/**
 * Promotion Click Mapping
 *
 * walkerOS: elb('promo click', { id: 'SUMMER2024', name: 'Summer Sale' })
 * Snowplow: promo_click action with promotion context entity
 */
export const promoClick: DestinationSnowplow.Rule = {
  name: ACTIONS.PROMO_CLICK,
  settings: {
    context: [
      {
        schema: SCHEMAS.PROMOTION,
        data: {
          id: 'data.id',
          name: 'data.name',
          creative_id: 'data.creative_id',
          type: 'data.type',
          position: 'data.position',
          slot: 'data.slot',
        },
      },
    ],
  },
};

// ============================================================================
// WEB EVENT MAPPINGS
// ============================================================================

/**
 * Link Click Mapping (Self-Describing Event)
 *
 * walkerOS: elb('link click', { url: 'https://example.com', text: 'Learn more', id: 'cta-main' })
 * Snowplow: link_click self-describing event
 *
 * Note: Uses self-describing event with custom schema, not ecommerce action
 */
export const linkClick: DestinationSnowplow.Rule = {
  name: 'link_click', // Custom action name (not ecommerce)
  settings: {
    snowplow: {
      actionSchema: WEB_SCHEMAS.LINK_CLICK,
    },
    context: [], // No additional contexts needed
  },
  // For link_click, data is passed directly to the schema
  data: {
    map: {
      targetUrl: 'data.url',
      elementId: 'data.id',
      elementClasses: 'data.classes',
      elementContent: 'data.text',
      elementTarget: 'data.target',
    },
  },
};

/**
 * Form Submit Mapping (Self-Describing Event)
 *
 * walkerOS: elb('form submit', { form_id: 'contact-form', form_classes: ['main-form'] })
 * Snowplow: submit_form self-describing event
 */
export const formSubmit: DestinationSnowplow.Rule = {
  name: 'submit_form',
  settings: {
    snowplow: {
      actionSchema: WEB_SCHEMAS.SUBMIT_FORM,
    },
    context: [],
  },
  data: {
    map: {
      formId: 'data.form_id',
      formClasses: 'data.form_classes',
      elements: 'data.elements',
    },
  },
};

/**
 * Site Search Mapping (Self-Describing Event)
 *
 * walkerOS: elb('search submit', { terms: 'laptop', filters: { category: 'Electronics' }, total_results: 42 })
 * Snowplow: site_search self-describing event
 */
export const siteSearch: DestinationSnowplow.Rule = {
  name: 'site_search',
  settings: {
    snowplow: {
      actionSchema: WEB_SCHEMAS.SITE_SEARCH,
    },
    context: [],
  },
  data: {
    map: {
      terms: 'data.terms',
      filters: 'data.filters',
      totalResults: 'data.total_results',
      pageResults: 'data.page_results',
    },
  },
};

/**
 * Social Share Mapping (Self-Describing Event)
 *
 * walkerOS: elb('social share', { network: 'twitter', action: 'share', target: 'https://example.com/article' })
 * Snowplow: social_interaction self-describing event
 */
export const socialShare: DestinationSnowplow.Rule = {
  name: 'social_interaction',
  settings: {
    snowplow: {
      actionSchema: WEB_SCHEMAS.SOCIAL,
    },
    context: [],
  },
  data: {
    map: {
      network: 'data.network',
      action: 'data.action',
      target: 'data.target',
    },
  },
};

// ============================================================================
// STRUCTURED EVENT MAPPINGS
// ============================================================================

/**
 * Button Click (Structured Event)
 *
 * walkerOS: elb('button click', { button_name: 'submit', section: 'header', position: 1 })
 * Snowplow: trackStructEvent (category='ui', action='click', label, property, value)
 *
 * Use structured events for simple interactions that don't need full schemas.
 * No schema validation - just category, action, label, property, value.
 */
export const buttonClick: DestinationSnowplow.Rule = {
  settings: {
    struct: {
      category: { value: 'ui' },
      action: { value: 'click' },
      label: 'data.button_name',
      property: 'data.section',
      value: 'data.position',
    },
  },
};

/**
 * Navigation Event (Structured Event)
 *
 * walkerOS: elb('navigation click', { menu: 'main', item: 'products', depth: 2 })
 * Snowplow: trackStructEvent (category='navigation', action='click')
 */
export const navigationClick: DestinationSnowplow.Rule = {
  settings: {
    struct: {
      category: { value: 'navigation' },
      action: { value: 'click' },
      label: 'data.menu',
      property: 'data.item',
      value: 'data.depth',
    },
  },
};

/**
 * Video Interaction (Structured Event)
 *
 * walkerOS: elb('video play', { video_id: 'intro-video', video_title: 'Welcome', progress: 25 })
 * Snowplow: trackStructEvent (category='video', action='play')
 *
 * For simple video tracking. Use media schemas for full video analytics.
 */
export const videoPlay: DestinationSnowplow.Rule = {
  settings: {
    struct: {
      category: { value: 'video' },
      action: { value: 'play' },
      label: 'data.video_title',
      property: 'data.video_id',
      value: 'data.progress',
    },
  },
};

/**
 * CTA Interaction (Structured Event)
 *
 * walkerOS: elb('cta click', { cta_id: 'hero-signup', cta_text: 'Get Started', variant: 'A' })
 * Snowplow: trackStructEvent (category='cta', action='click')
 */
export const ctaClick: DestinationSnowplow.Rule = {
  settings: {
    struct: {
      category: { value: 'cta' },
      action: { value: 'click' },
      label: 'data.cta_text',
      property: 'data.cta_id',
    },
  },
};

/**
 * Generic Interaction (Structured Event with Dynamic Category/Action)
 *
 * walkerOS: elb('interaction track', { event_category: 'engagement', event_action: 'scroll', depth: 50 })
 * Snowplow: trackStructEvent with dynamic category/action from event data
 *
 * Useful for flexible event tracking where category/action come from the event itself.
 */
export const genericInteraction: DestinationSnowplow.Rule = {
  settings: {
    struct: {
      category: 'data.event_category',
      action: 'data.event_action',
      label: 'data.event_label',
      property: 'data.event_property',
      value: 'data.event_value',
    },
  },
};

// ============================================================================
// MEDIA TRACKING MAPPINGS
// ============================================================================

/**
 * Media Play Event Mapping
 *
 * walkerOS: elb('video play', {
 *   current_time: 0, duration: 300, paused: false,
 *   volume: 80, muted: false, video_id: 'intro-video', title: 'Welcome'
 * })
 * Snowplow: play_event with media_player and session contexts
 *
 * Use for HTML5 video/audio or custom media players.
 * The media_player context contains current playback state.
 */
export const mediaPlay: DestinationSnowplow.Rule = {
  name: 'media_play',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.PLAY,
    },
    context: [
      // Media player state context (required for all media events)
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: 'data.paused',
          muted: 'data.muted',
          volume: 'data.volume',
          playbackRate: { key: 'data.playback_rate', value: 1 },
          loop: { key: 'data.loop', value: false },
        },
      },
      // Media session context (optional - for session-level analytics)
      {
        schema: MEDIA_SCHEMAS.SESSION,
        data: {
          mediaSessionId: 'data.session_id',
          startedAt: 'data.session_started',
          pingInterval: { value: 30 },
        },
      },
    ],
  },
};

/**
 * Media Pause Event Mapping
 *
 * walkerOS: elb('video pause', {
 *   current_time: 45.2, duration: 300, paused: true, volume: 80
 * })
 * Snowplow: pause_event with media_player context
 */
export const mediaPause: DestinationSnowplow.Rule = {
  name: 'media_pause',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.PAUSE,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: { value: true },
          muted: 'data.muted',
          volume: 'data.volume',
          playbackRate: { key: 'data.playback_rate', value: 1 },
        },
      },
    ],
  },
};

/**
 * Media End Event Mapping
 *
 * walkerOS: elb('video end', {
 *   current_time: 300, duration: 300, video_id: 'intro-video'
 * })
 * Snowplow: end_event with media_player context
 */
export const mediaEnd: DestinationSnowplow.Rule = {
  name: 'media_end',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.END,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: true },
          paused: { value: true },
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
    ],
  },
};

/**
 * Media Seek Event Mapping
 *
 * walkerOS: elb('video seek', {
 *   current_time: 120, duration: 300, seek_from: 45, seek_to: 120
 * })
 * Snowplow: seek_end_event with media_player context
 *
 * Track when user seeks (jumps) to a different position in the media.
 */
export const mediaSeek: DestinationSnowplow.Rule = {
  name: 'media_seek',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.SEEK_END,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: 'data.paused',
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
    ],
  },
  // Additional data for the seek event itself
  data: {
    map: {
      previousTime: 'data.seek_from',
    },
  },
};

/**
 * Media Progress Event Mapping (Percent Progress)
 *
 * walkerOS: elb('video progress', {
 *   current_time: 75, duration: 300, percent: 25
 * })
 * Snowplow: percent_progress_event with media_player context
 *
 * Fires at progress milestones (e.g., 25%, 50%, 75%, 100%).
 */
export const mediaProgress: DestinationSnowplow.Rule = {
  name: 'media_progress',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.PERCENT_PROGRESS,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: 'data.paused',
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
    ],
  },
  // The percent progress milestone
  data: {
    map: {
      percentProgress: 'data.percent',
    },
  },
};

/**
 * Media Buffer Event Mapping
 *
 * walkerOS: elb('video buffer', {
 *   current_time: 45.2, duration: 300, buffering: true
 * })
 * Snowplow: buffer_start_event with media_player context
 *
 * Track buffering events for quality of experience analysis.
 */
export const mediaBuffer: DestinationSnowplow.Rule = {
  name: 'media_buffer',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.BUFFER_START,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: 'data.paused',
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
    ],
  },
};

/**
 * Media Quality Change Event Mapping
 *
 * walkerOS: elb('video quality', {
 *   current_time: 45.2, previous_quality: '720p', new_quality: '1080p', auto: false
 * })
 * Snowplow: quality_change_event with media_player context
 */
export const mediaQualityChange: DestinationSnowplow.Rule = {
  name: 'media_quality_change',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.QUALITY_CHANGE,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: 'data.paused',
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
    ],
  },
  data: {
    map: {
      previousQuality: 'data.previous_quality',
      newQuality: 'data.new_quality',
      bitrate: 'data.bitrate',
      framesPerSecond: 'data.fps',
      automatic: 'data.auto',
    },
  },
};

/**
 * Media Fullscreen Change Event Mapping
 *
 * walkerOS: elb('video fullscreen', {
 *   current_time: 45.2, fullscreen: true
 * })
 * Snowplow: fullscreen_change_event with media_player context
 */
export const mediaFullscreen: DestinationSnowplow.Rule = {
  name: 'media_fullscreen',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.FULLSCREEN_CHANGE,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: 'data.paused',
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
    ],
  },
  data: {
    map: {
      fullscreen: 'data.fullscreen',
    },
  },
};

/**
 * Media Error Event Mapping
 *
 * walkerOS: elb('video error', {
 *   current_time: 45.2, error_code: 'MEDIA_ERR_NETWORK', error_message: 'Network error'
 * })
 * Snowplow: error_event with media_player context
 */
export const mediaError: DestinationSnowplow.Rule = {
  name: 'media_error',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.ERROR,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: { value: true },
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
    ],
  },
  data: {
    map: {
      errorCode: 'data.error_code',
      errorName: 'data.error_name',
      errorDescription: 'data.error_message',
    },
  },
};

// ============================================================================
// AD TRACKING MAPPINGS (for video ads)
// ============================================================================

/**
 * Ad Break Start Event Mapping
 *
 * walkerOS: elb('ad break_start', {
 *   current_time: 0, ad_break_type: 'preroll', ad_break_id: 'preroll-1'
 * })
 * Snowplow: ad_break_start_event with media_player and ad_break contexts
 */
export const adBreakStart: DestinationSnowplow.Rule = {
  name: 'ad_break_start',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.AD_BREAK_START,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: 'data.paused',
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
      {
        schema: MEDIA_SCHEMAS.AD_BREAK,
        data: {
          breakId: 'data.ad_break_id',
          name: 'data.ad_break_name',
          breakType: 'data.ad_break_type', // 'preroll', 'midroll', 'postroll'
          podSize: 'data.pod_size',
        },
      },
    ],
  },
};

/**
 * Ad Start Event Mapping
 *
 * walkerOS: elb('ad start', {
 *   current_time: 0, ad_id: 'ad-123', creative_id: 'creative-456',
 *   advertiser: 'Acme Corp', duration: 30, skippable: true
 * })
 * Snowplow: ad_start_event with media_player and ad contexts
 */
export const adStart: DestinationSnowplow.Rule = {
  name: 'ad_start',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.AD_START,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: { value: false },
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
      {
        schema: MEDIA_SCHEMAS.AD,
        data: {
          adId: 'data.ad_id',
          name: 'data.ad_name',
          creativeId: 'data.creative_id',
          duration: 'data.ad_duration',
          skippable: 'data.skippable',
          podPosition: 'data.pod_position',
        },
      },
    ],
  },
};

/**
 * Ad Complete Event Mapping
 *
 * walkerOS: elb('ad complete', {
 *   current_time: 30, ad_id: 'ad-123'
 * })
 * Snowplow: ad_complete_event with media_player and ad contexts
 */
export const adComplete: DestinationSnowplow.Rule = {
  name: 'ad_complete',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.AD_COMPLETE,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: { value: false },
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
      {
        schema: MEDIA_SCHEMAS.AD,
        data: {
          adId: 'data.ad_id',
          name: 'data.ad_name',
          creativeId: 'data.creative_id',
        },
      },
    ],
  },
};

/**
 * Ad Skip Event Mapping
 *
 * walkerOS: elb('ad skip', {
 *   current_time: 5, ad_id: 'ad-123', time_skipped_at: 5
 * })
 * Snowplow: ad_skip_event with media_player and ad contexts
 */
export const adSkip: DestinationSnowplow.Rule = {
  name: 'ad_skip',
  settings: {
    snowplow: {
      actionSchema: MEDIA_SCHEMAS.AD_SKIP,
    },
    context: [
      {
        schema: MEDIA_SCHEMAS.MEDIA_PLAYER,
        data: {
          currentTime: 'data.current_time',
          duration: 'data.duration',
          ended: { value: false },
          paused: { value: false },
          muted: 'data.muted',
          volume: 'data.volume',
        },
      },
      {
        schema: MEDIA_SCHEMAS.AD,
        data: {
          adId: 'data.ad_id',
          name: 'data.ad_name',
          creativeId: 'data.creative_id',
        },
      },
    ],
  },
  data: {
    map: {
      percentProgress: 'data.percent_at_skip',
    },
  },
};

/**
 * Complete Mapping Configuration
 *
 * Maps walkerOS event names to Snowplow ecommerce actions.
 * Fully explicit - no auto-detection or magic.
 */
export const config = {
  page: { view: pageView },
  product: {
    view: productView,
    add: addToCart,
    remove: removeFromCart,
    list: listView,
  },
  order: {
    complete: transaction,
    refund: refund,
  },
  checkout: {
    step: checkoutStep,
  },
  promo: {
    view: promoView,
    click: promoClick,
  },
} satisfies DestinationSnowplow.Rules;

/**
 * Web Analytics Mapping Configuration
 *
 * Maps walkerOS event names to Snowplow web analytics events.
 * Includes both self-describing events and structured events.
 */
export const webConfig = {
  link: { click: linkClick },
  form: { submit: formSubmit },
  search: { submit: siteSearch },
  social: { share: socialShare },
  button: { click: buttonClick },
  navigation: { click: navigationClick },
  video: { play: videoPlay },
  cta: { click: ctaClick },
  interaction: { track: genericInteraction },
} satisfies DestinationSnowplow.Rules;

/**
 * Media Tracking Mapping Configuration
 *
 * Maps walkerOS event names to Snowplow media tracking events.
 * Includes video playback, progress, and ad tracking.
 *
 * For automatic media tracking, consider using Snowplow's
 * @snowplow/browser-plugin-media-tracking plugin instead.
 */
export const mediaConfig = {
  video: {
    play: mediaPlay,
    pause: mediaPause,
    end: mediaEnd,
    seek: mediaSeek,
    progress: mediaProgress,
    buffer: mediaBuffer,
    quality: mediaQualityChange,
    fullscreen: mediaFullscreen,
    error: mediaError,
  },
  ad: {
    break_start: adBreakStart,
    start: adStart,
    complete: adComplete,
    skip: adSkip,
  },
} satisfies DestinationSnowplow.Rules;
