// Export environment configurations
export * as env from './env';

// Export example events with namespace
export * as Events from './events';

// Export mapping configurations with namespace
export * as Mapping from './mapping';

// Re-export specific items for easy access
export { config as dataLayerExamples, consentOnlyMapping } from './mapping';
export { consentUpdate as consentUpdateEvent } from './events';
