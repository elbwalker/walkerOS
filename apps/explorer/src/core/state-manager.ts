import type { WalkerOS } from '@walkerOS/core';

export interface DestinationFunction {
  init?: (config: WalkerOS.AnyObject) => unknown;
  push?: (event: WalkerOS.Event, config?: WalkerOS.AnyObject) => unknown;
  config?: WalkerOS.AnyObject;
  [key: string]: unknown;
}

export interface DestinationState {
  destination: DestinationFunction;
  config: WalkerOS.AnyObject;
  fnName?: string;
  initResult?: unknown;
  lastPushResult?: unknown;
  error?: Error;
}

export type StateChangeCallback = (state: DestinationState) => void;

/**
 * State manager for destination testing with isolated state per instance
 */
export class ExplorerStateManager {
  private states = new Map<string, DestinationState>();
  private subscribers = new Map<string, Set<StateChangeCallback>>();

  /**
   * Create a new destination context with isolated state
   */
  createDestination(
    id: string,
    destination: DestinationFunction,
    initialConfig: WalkerOS.AnyObject = {},
    fnName?: string,
  ): string {
    const state: DestinationState = {
      destination,
      config: { ...initialConfig },
      fnName,
    };

    this.states.set(id, state);
    this.subscribers.set(id, new Set());

    // Initialize destination if it has an init method
    this.initializeDestination(id);

    return id;
  }

  /**
   * Get current state for a destination
   */
  getState(id: string): DestinationState | undefined {
    return this.states.get(id);
  }

  /**
   * Update configuration for a destination
   */
  updateConfig(id: string, newConfig: WalkerOS.AnyObject): void {
    const state = this.states.get(id);
    if (!state) return;

    state.config = { ...newConfig };
    state.error = undefined;

    // Re-initialize destination with new config
    this.initializeDestination(id);
    this.notifySubscribers(id, state);
  }

  /**
   * Execute a push event for a destination
   */
  async pushEvent(id: string, event: WalkerOS.Event): Promise<unknown> {
    const state = this.states.get(id);
    if (!state) throw new Error(`Destination ${id} not found`);

    try {
      state.error = undefined;

      if (state.destination.push) {
        const result = await state.destination.push(event, state.config);
        state.lastPushResult = result;
        this.notifySubscribers(id, state);
        return result;
      } else {
        throw new Error('Destination does not have a push method');
      }
    } catch (error) {
      state.error = error as Error;
      this.notifySubscribers(id, state);
      throw error;
    }
  }

  /**
   * Subscribe to state changes for a destination
   */
  subscribe(id: string, callback: StateChangeCallback): () => void {
    const callbacks = this.subscribers.get(id);
    if (!callbacks) return () => {};

    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
    };
  }

  /**
   * Clean up a destination and all its subscribers
   */
  cleanup(id: string): void {
    this.states.delete(id);
    this.subscribers.delete(id);
  }

  /**
   * Clean up all destinations
   */
  cleanupAll(): void {
    this.states.clear();
    this.subscribers.clear();
  }

  /**
   * Initialize destination if it has an init method
   */
  private async initializeDestination(id: string): Promise<void> {
    const state = this.states.get(id);
    if (!state) return;

    try {
      if (state.destination.init) {
        const result = await state.destination.init(state.config);
        state.initResult = result;
      }
    } catch (error) {
      state.error = error as Error;
    }
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(id: string, state: DestinationState): void {
    const callbacks = this.subscribers.get(id);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }
}

/**
 * Generate a unique ID for destination instances
 */
export function generateId(): string {
  return `dest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
