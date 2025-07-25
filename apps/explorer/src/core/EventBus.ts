/**
 * EventBus - Global event system for component communication
 *
 * Features:
 * - Cross-component communication
 * - Event namespacing
 * - Wildcard event matching
 * - Automatic cleanup
 * - Type-safe event handling
 */

export interface EventHandler<T = unknown> {
  (data: T, meta: EventMeta): void;
}

export interface EventMeta {
  type: string;
  timestamp: number;
  source?: string;
  target?: string;
}

export interface EventSubscription {
  unsubscribe(): void;
}

/**
 * Global EventBus instance for component communication
 */
class ExplorerEventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private wildcardListeners = new Set<EventHandler>();
  private eventHistory: Array<{
    type: string;
    data: unknown;
    meta: EventMeta;
  }> = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to events
   */
  on<T = unknown>(
    eventType: string | string[],
    handler: EventHandler<T>,
  ): EventSubscription {
    const types = Array.isArray(eventType) ? eventType : [eventType];

    types.forEach((type) => {
      if (type === '*') {
        // Wildcard listener
        this.wildcardListeners.add(handler as EventHandler);
      } else {
        // Specific event type
        if (!this.listeners.has(type)) {
          this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(handler as EventHandler);
      }
    });

    // Return unsubscribe function
    return {
      unsubscribe: () => {
        types.forEach((type) => {
          if (type === '*') {
            this.wildcardListeners.delete(handler as EventHandler);
          } else {
            const handlers = this.listeners.get(type);
            if (handlers) {
              handlers.delete(handler as EventHandler);
              if (handlers.size === 0) {
                this.listeners.delete(type);
              }
            }
          }
        });
      },
    };
  }

  /**
   * Subscribe to events only once
   */
  once<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
  ): EventSubscription {
    const subscription = this.on(eventType, (data: T, meta: EventMeta) => {
      handler(data, meta);
      subscription.unsubscribe();
    });

    return subscription;
  }

  /**
   * Emit events
   */
  emit<T = unknown>(
    eventType: string,
    data?: T,
    options: { source?: string; target?: string } = {},
  ): void {
    const meta: EventMeta = {
      type: eventType,
      timestamp: Date.now(),
      source: options.source,
      target: options.target,
    };

    // Add to history
    this.eventHistory.push({ type: eventType, data, meta });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit to specific listeners
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data, meta);
        } catch (error) {
          console.error(`Error in event handler for '${eventType}':`, error);
        }
      });
    }

    // Emit to wildcard listeners
    this.wildcardListeners.forEach((handler) => {
      try {
        handler(data, meta);
      } catch (error) {
        console.error(
          `Error in wildcard event handler for '${eventType}':`,
          error,
        );
      }
    });

    // Emit namespace events (e.g., 'component:mount' also triggers 'component:*')
    if (eventType.includes(':')) {
      const namespace = eventType.split(':')[0];
      const namespacePattern = `${namespace}:*`;
      const namespaceHandlers = this.listeners.get(namespacePattern);

      if (namespaceHandlers) {
        namespaceHandlers.forEach((handler) => {
          try {
            handler(data, meta);
          } catch (error) {
            console.error(
              `Error in namespace event handler for '${namespacePattern}':`,
              error,
            );
          }
        });
      }
    }
  }

  /**
   * Remove all listeners for an event type
   */
  off(eventType?: string): void {
    if (eventType === undefined) {
      // Remove all listeners
      this.listeners.clear();
      this.wildcardListeners.clear();
    } else if (eventType === '*') {
      // Remove wildcard listeners
      this.wildcardListeners.clear();
    } else {
      // Remove specific event listeners
      this.listeners.delete(eventType);
    }
  }

  /**
   * Get event history
   */
  getHistory(
    eventType?: string,
  ): Array<{ type: string; data: unknown; meta: EventMeta }> {
    if (eventType) {
      return this.eventHistory.filter((event) => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory.length = 0;
  }

  /**
   * Get current listener counts
   */
  getListenerCounts(): { [eventType: string]: number } {
    const counts: { [eventType: string]: number } = {};

    this.listeners.forEach((handlers, eventType) => {
      counts[eventType] = handlers.size;
    });

    if (this.wildcardListeners.size > 0) {
      counts['*'] = this.wildcardListeners.size;
    }

    return counts;
  }

  /**
   * Check if there are listeners for an event type
   */
  hasListeners(eventType: string): boolean {
    return this.listeners.has(eventType) || this.wildcardListeners.size > 0;
  }
}

// Global EventBus instance
export const eventBus = new ExplorerEventBus();

/**
 * Typed event emitters for common component events
 */
export const ComponentEvents = {
  // Component lifecycle
  mount: (componentId: string, data?: unknown) =>
    eventBus.emit('component:mount', data, { source: componentId }),

  unmount: (componentId: string, data?: unknown) =>
    eventBus.emit('component:unmount', data, { source: componentId }),

  destroy: (componentId: string, data?: unknown) =>
    eventBus.emit('component:destroy', data, { source: componentId }),

  // Component state changes
  stateChange: (componentId: string, newState: unknown, oldState?: unknown) =>
    eventBus.emit(
      'component:state-change',
      { newState, oldState },
      { source: componentId },
    ),

  // Theme changes
  themeChange: (componentId: string, theme: 'light' | 'dark') =>
    eventBus.emit('component:theme-change', { theme }, { source: componentId }),

  // User interactions
  interaction: (
    componentId: string,
    interaction: { type: string; data?: unknown },
  ) =>
    eventBus.emit('component:interaction', interaction, {
      source: componentId,
    }),

  // Editor events
  codeChange: (componentId: string, code: string, language?: string) =>
    eventBus.emit(
      'editor:code-change',
      { code, language },
      { source: componentId },
    ),

  codeExecute: (componentId: string, code: string, result?: unknown) =>
    eventBus.emit(
      'editor:code-execute',
      { code, result },
      { source: componentId },
    ),

  // Preview events
  previewUpdate: (componentId: string, html: string) =>
    eventBus.emit('preview:update', { html }, { source: componentId }),

  previewInteraction: (componentId: string, event: unknown) =>
    eventBus.emit('preview:interaction', event, { source: componentId }),

  // Flow events
  eventCapture: (componentId: string, event: unknown) =>
    eventBus.emit('flow:event-capture', event, { source: componentId }),

  mappingUpdate: (componentId: string, mapping: unknown) =>
    eventBus.emit('flow:mapping-update', mapping, { source: componentId }),

  resultUpdate: (componentId: string, result: unknown) =>
    eventBus.emit('flow:result-update', result, { source: componentId }),
};

/**
 * Create a scoped event bus for a component
 */
export function createScopedEventBus(componentId: string) {
  return {
    on: <T = unknown>(eventType: string, handler: EventHandler<T>) =>
      eventBus.on(eventType, handler),

    once: <T = unknown>(eventType: string, handler: EventHandler<T>) =>
      eventBus.once(eventType, handler),

    emit: <T = unknown>(eventType: string, data?: T, target?: string) =>
      eventBus.emit(eventType, data, { source: componentId, target }),

    off: (eventType?: string) => eventBus.off(eventType),

    // Convenience methods with component ID automatically included
    mount: (data?: unknown) => ComponentEvents.mount(componentId, data),
    unmount: (data?: unknown) => ComponentEvents.unmount(componentId, data),
    destroy: (data?: unknown) => ComponentEvents.destroy(componentId, data),
    stateChange: (newState: unknown, oldState?: unknown) =>
      ComponentEvents.stateChange(componentId, newState, oldState),
    themeChange: (theme: 'light' | 'dark') =>
      ComponentEvents.themeChange(componentId, theme),
    interaction: (interaction: { type: string; data?: unknown }) =>
      ComponentEvents.interaction(componentId, interaction),
  };
}

/**
 * Debug utilities for event monitoring
 */
export const EventDebug = {
  /**
   * Log all events to console
   */
  enableLogging(filter?: string | RegExp): EventSubscription {
    return eventBus.on('*', (data, meta) => {
      if (filter) {
        const matches =
          typeof filter === 'string'
            ? meta.type.includes(filter)
            : filter.test(meta.type);

        if (!matches) return;
      }

      console.log(`[EventBus] ${meta.type}`, {
        data,
        source: meta.source,
        target: meta.target,
        timestamp: new Date(meta.timestamp).toISOString(),
      });
    });
  },

  /**
   * Get event statistics
   */
  getStats() {
    const history = eventBus.getHistory();
    const eventCounts: { [type: string]: number } = {};

    history.forEach((event) => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });

    return {
      totalEvents: history.length,
      eventTypes: Object.keys(eventCounts).length,
      eventCounts,
      listenerCounts: eventBus.getListenerCounts(),
      recentEvents: history.slice(-10),
    };
  },

  /**
   * Clear all debug data
   */
  clear() {
    eventBus.clearHistory();
  },
};

// Export the global instance
export default eventBus;
