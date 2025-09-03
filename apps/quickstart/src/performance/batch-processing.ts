import { createCollector } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/web-destination-api';
import type { WalkerOS, Destination, Collector } from '@walkeros/core';

// Custom batching destination for high-performance event processing
const batchingDestination: Destination.Instance = {
  type: 'batching',

  config: {},

  init({ config }) {
    const { settings } = config;

    if (!settings || typeof settings !== 'object') {
      console.log('Batch destination initialized with default settings');
      return;
    }

    // Initialize batch processing
    const settingsObj = settings as Record<string, unknown>;
    const batchSize =
      typeof settingsObj.batchSize === 'number' ? settingsObj.batchSize : 10;
    const flushInterval =
      typeof settingsObj.flushInterval === 'number'
        ? settingsObj.flushInterval
        : 5000;
    const maxWaitTime =
      typeof settingsObj.maxWaitTime === 'number'
        ? settingsObj.maxWaitTime
        : 30000;

    console.log(
      `Batch destination initialized: size=${batchSize}, interval=${flushInterval}ms`,
    );
  },

  async pushBatch(events, { config }) {
    const { settings } = config;
    const batchId = Date.now().toString(36);

    // Handle batch as array
    const eventsArray = Array.isArray(events) ? events : [];
    console.log(
      `📦 Processing batch ${batchId} with ${eventsArray.length} events`,
    );

    try {
      // Simulate API call with batched events
      const payload = {
        batch_id: batchId,
        timestamp: new Date().toISOString(),
        events: eventsArray.map((event: WalkerOS.Event) => ({
          event_name: event.event,
          event_data: event.data,
          user_id:
            event.user && typeof event.user === 'object' && 'id' in event.user
              ? String(event.user.id)
              : undefined,
          session_id:
            event.context?.session &&
            typeof event.context.session === 'object' &&
            'id' in event.context.session
              ? String(event.context.session.id)
              : undefined,
          timestamp: event.timestamp,
        })),
        metadata: {
          source: 'walkerOS-batch',
          version: '1.0',
          total_events: eventsArray.length,
        },
      };

      // In production, this would be an actual API call
      const settingsObj =
        settings && typeof settings === 'object'
          ? (settings as Record<string, unknown>)
          : {};
      const endpoint =
        typeof settingsObj.endpoint === 'string' ? settingsObj.endpoint : null;

      if (endpoint) {
        const headers =
          settingsObj.headers && typeof settingsObj.headers === 'object'
            ? (settingsObj.headers as Record<string, string>)
            : {};

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Batch API failed: ${response.status}`);
        }
      }

      console.log(`✅ Batch ${batchId} sent successfully`);
      return { ok: true };
    } catch (error) {
      console.error(`❌ Batch ${batchId} failed:`, error);
      throw error;
    }
  },

  async push(event, context) {
    // Fallback for single events (shouldn't be called when pushBatch is available)
    console.log('Single event fallback:', event.event);
  },
};

export async function setupBatchProcessing(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      // High-performance batch destination
      batch: {
        code: batchingDestination,
        config: {
          settings: {
            endpoint: 'https://api.example.com/events/batch',
            batchSize: 5, // Small batch for demo
            flushInterval: 3000, // 3 seconds
            maxWaitTime: 10000, // 10 seconds max wait
            headers: {
              Authorization: 'Bearer batch-api-token',
              'X-Batch-Source': 'walkerOS',
            },
          },
        },
      },
      // Regular API destination for comparison
      api_single: {
        code: destinationAPI,
        config: {
          settings: {
            url: 'https://api.example.com/events/single',
            headers: {
              Authorization: 'Bearer single-api-token',
            },
          },
          mapping: {
            // Send all events to single endpoint
            '*': {
              '*': {
                name: 'tracked_event',
                data: {
                  map: {
                    event_type: 'event',
                    event_action: 'action',
                    properties: 'data',
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

// Simulate high-volume event tracking
export async function simulateHighVolumeTracking(
  elb: WalkerOS.Elb,
): Promise<void> {
  console.log('🚀 Starting high-volume event simulation...');

  const eventTypes = [
    { entity: 'page', action: 'view' },
    { entity: 'product', action: 'view' },
    { entity: 'product', action: 'add' },
    { entity: 'button', action: 'click' },
    { entity: 'form', action: 'submit' },
    { entity: 'video', action: 'play' },
    { entity: 'search', action: 'perform' },
  ];

  const sampleData = [
    { title: 'Homepage', category: 'navigation' },
    { id: 'prod-001', name: 'Product A', price: 29.99 },
    { id: 'prod-002', name: 'Product B', price: 49.99 },
    { label: 'CTA Button', position: 'header' },
    { type: 'newsletter', success: true },
    { id: 'video-123', duration: 120 },
    { query: 'wireless headphones', results: 25 },
  ];

  // Send events rapidly to trigger batching
  for (let i = 0; i < 10; i++) {
    const eventType = eventTypes[i % eventTypes.length];
    const data = sampleData[i % sampleData.length];

    await elb(`${eventType.entity} ${eventType.action}`, {
      ...data,
      sequence: i + 1,
      timestamp: Date.now(),
    });

    // Very small delay for testing
    await new Promise((resolve) => setTimeout(resolve, 1));
  }

  console.log('📊 High-volume simulation completed');
}

// Performance comparison: batched vs individual requests
export async function comparePerformance(elb: WalkerOS.Elb): Promise<void> {
  console.log('⚡ Starting performance comparison...');

  const events = Array.from({ length: 50 }, (_, i) => ({
    entity: 'performance',
    action: 'test',
    data: {
      test_id: `perf-test-${i}`,
      batch_number: Math.floor(i / 10),
      sequence: i,
    },
  }));

  // Measure batched processing time
  const batchStart = performance.now();

  for (const event of events) {
    await elb(`${event.entity} ${event.action}`, event.data);
  }

  // Wait for batches to flush
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const batchEnd = performance.now();
  const batchDuration = batchEnd - batchStart;

  console.log(`📈 Performance Results:`);
  console.log(`  Total events: ${events.length}`);
  console.log(`  Batch processing time: ${batchDuration.toFixed(2)}ms`);
  console.log(
    `  Average per event: ${(batchDuration / events.length).toFixed(2)}ms`,
  );
}

// Monitor batch queue status
export function monitorBatchQueue(collector: Collector.Instance): void {
  // Check queue status periodically
  const monitor = setInterval(() => {
    const queueInfo = {
      pending_events: 'Queue monitoring not directly available',
      destinations: Object.keys(collector.destinations).length,
      timestamp: new Date().toISOString(),
    };

    console.log('📋 Queue Status:', queueInfo);
  }, 10000); // Every 10 seconds

  // Clean up after 1 minute
  setTimeout(() => {
    clearInterval(monitor);
    console.log('🛑 Queue monitoring stopped');
  }, 60000);
}
