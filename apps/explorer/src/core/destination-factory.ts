import type { WalkerOS } from '@walkerOS/core';
import {
  ExplorerStateManager,
  generateId,
  type DestinationFunction,
} from './state-manager';
import {
  DestinationInit,
  type DestinationInitOptions,
} from '../components/destination-init';
import {
  DestinationPush,
  type DestinationPushOptions,
} from '../components/destination-push';

export interface DestinationContextOptions {
  initialConfig?: WalkerOS.AnyObject;
  fnName?: string;
}

export interface DestinationInstance {
  id: string;
  createInit(
    container: HTMLElement | string,
    options?: DestinationInitOptions,
  ): DestinationInit;
  createPush(
    container: HTMLElement | string,
    options?: DestinationPushOptions,
  ): DestinationPush;
  updateConfig(newConfig: WalkerOS.AnyObject): void;
  getState(): import('./state-manager').DestinationState | undefined;
  destroy(): void;
}

/**
 * Create a destination context for testing and documentation
 * This replaces the React DestinationContextProvider
 */
export function createDestination(
  destination: DestinationFunction,
  options: DestinationContextOptions = {},
): DestinationInstance {
  const stateManager = new ExplorerStateManager();
  const id = generateId();

  // Initialize the destination with the state manager
  stateManager.createDestination(
    id,
    destination,
    options.initialConfig || {},
    options.fnName,
  );

  return {
    id,

    createInit(
      container: HTMLElement | string,
      initOptions: DestinationInitOptions = {},
    ): DestinationInit {
      return new DestinationInit(container, stateManager, id, initOptions);
    },

    createPush(
      container: HTMLElement | string,
      pushOptions: DestinationPushOptions = {},
    ): DestinationPush {
      return new DestinationPush(container, stateManager, id, pushOptions);
    },

    updateConfig(newConfig: WalkerOS.AnyObject): void {
      stateManager.updateConfig(id, newConfig);
    },

    getState(): import('./state-manager').DestinationState | undefined {
      return stateManager.getState(id);
    },

    destroy(): void {
      stateManager.cleanup(id);
    },
  };
}

/**
 * Create multiple destination instances with shared state
 * Useful for complex documentation scenarios
 */
export function createDestinationGroup(
  destinations: Array<{
    destination: DestinationFunction;
    id?: string;
    options?: DestinationContextOptions;
  }>,
): Record<string, DestinationInstance> {
  const instances: Record<string, DestinationInstance> = {};

  destinations.forEach(({ destination, id, options }) => {
    const instanceId = id || generateId();
    instances[instanceId] = createDestination(destination, options);
  });

  return instances;
}

/**
 * Utility function to create a mock destination for testing
 */
export function createMockDestination(
  initFn?: (config: WalkerOS.AnyObject) => unknown,
  pushFn?: (event: WalkerOS.Event, config?: WalkerOS.AnyObject) => unknown,
): DestinationFunction {
  return {
    init:
      initFn ||
      ((config) =>
        `Mock destination initialized with config: ${JSON.stringify(config)}`),
    push:
      pushFn ||
      ((event, config) =>
        `Mock destination received event: ${event.event} with config: ${JSON.stringify(config)}`),
  };
}
