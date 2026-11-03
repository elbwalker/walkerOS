// Dev subpath entry, used by CLI `validate`, MCP, and the docs. Schemas and
// examples live here, not in the main runtime entry, so zod never reaches
// production bundles.
export * as schemas from './schemas';
export * as examples from './examples';
