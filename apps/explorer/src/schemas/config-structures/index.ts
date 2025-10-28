/**
 * Config Structure Definitions
 *
 * Meta-schemas that describe the SHAPE of configuration objects.
 * These are used by ConfigEditor to:
 * - Build navigation trees
 * - Determine NodeTypes for editing
 * - Route to appropriate panes
 * - Show property metadata (titles, descriptions)
 *
 * NOT to be confused with JSON Schema (which validates VALUES).
 * These describe STRUCTURE.
 */

export * from './types';
export * from './destination-config';
export * from './mapping-rule';
