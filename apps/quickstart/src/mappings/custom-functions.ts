import { createCollector } from '@walkerOS/collector';
import { destinationGtag } from '@walkerOS/web-destination-gtag';
import type { WalkerOS, Destination, Collector } from '@walkerOS/core';

// Custom destination with advanced mapping functions
const advancedMappingDestination: Destination.Instance = {
  type: 'advanced-mapping',

  config: {},

  init() {
    console.log('Advanced mapping destination initialized');
  },

  async push(event, { config }) {
    // Apply custom mappings
    const mappedData = applyCustomMappings(event);

    console.log('Advanced Mapping Result:', {
      original: event,
      mapped: mappedData,
    });
  },
};

// Custom mapping utility functions
function applyCustomMappings(event: WalkerOS.Event) {
  const mapped: Record<string, unknown> = {};

  // Currency formatting function
  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Time-based segmentation
  const getTimeSegment = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  };

  // Apply mappings based on event type
  switch (event.entity) {
    case 'product':
      mapped.item = {
        id: event.data.id,
        name: event.data.name,
        price_formatted: formatCurrency(
          typeof event.data.price === 'number' ? event.data.price : 0,
        ),
        category:
          typeof event.data.category === 'string'
            ? event.data.category
            : 'Uncategorized',
        in_stock: typeof event.data.stock === 'number' && event.data.stock > 0,
      };
      break;

    case 'order':
      mapped.transaction = {
        id: event.data.id,
        revenue_formatted: formatCurrency(
          typeof event.data.total === 'number' ? event.data.total : 0,
        ),
        is_high_value:
          typeof event.data.total === 'number' && event.data.total > 100,
        order_day_segment: getTimeSegment(),
      };
      break;

    default:
      mapped.generic = {
        event_type: event.entity,
        action: event.action,
        timestamp_iso: new Date(event.timestamp).toISOString(),
        time_segment: getTimeSegment(),
      };
  }

  return mapped;
}

export async function setupCustomMappingFunctions(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      // Advanced mapping destination
      advanced: {
        ...advancedMappingDestination,
        config: {
          settings: {},
        },
      },
      // GA4 with custom mapping
      gtag: {
        ...destinationGtag,
        config: {
          settings: {
            ga4: { measurementId: 'G-XXXXXXXXXX' },
          },
          mapping: {
            product: {
              view: {
                name: 'view_item',
                settings: { ga4: {} },
                data: {
                  map: {
                    currency: { value: 'USD' },
                    value: 'data.price',
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

export async function trackCustomMappedEvents(
  elb: WalkerOS.Elb,
): Promise<void> {
  // Track product with rich data
  await elb('product view', {
    id: 'prod-123',
    name: 'Wireless Headphones',
    price: 129.99,
    category: 'Electronics',
    stock: 15,
  });

  // Track order
  await elb('order complete', {
    id: 'order-456',
    total: 259.98,
    currency: 'USD',
  });

  // Track custom event
  await elb('feature used', {
    feature: 'custom-mapping',
    success: true,
  });
}
