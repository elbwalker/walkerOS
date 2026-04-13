// Dev subpath entry — used by CLI `validate`, MCP, and explorer UI.
// Schemas live here, not in the main runtime entry, so zod never reaches
// production bundles.
export * as schemas from './schemas';
