/**
 * Monaco JSON Schema Registry
 *
 * Manages JSON Schema registrations for Monaco's JSON language service.
 * Multiple Code instances can register schemas concurrently — the registry
 * accumulates all schemas and issues a single setDiagnosticsOptions() call.
 *
 * The monaco json namespace is initialized via initMonacoJson() when the
 * Code atom's beforeMount fires. Schemas registered before initialization
 * are queued and flushed once the namespace becomes available.
 */

interface RegisteredSchema {
  /** Unique schema identifier */
  uri: string;
  /** Glob patterns matching model URIs */
  fileMatch: string[];
  /** JSON Schema Draft 7 object */
  schema: Record<string, unknown>;
}

const schemaRegistry = new Map<string, RegisteredSchema>();

let idCounter = 0;

// Monaco JSON namespace, set via initMonacoJson() from Code atom's beforeMount
let _json: typeof import('monaco-editor').json | undefined;

/**
 * Initialize the JSON schema registry with the monaco instance.
 * Called from Code atom's handleBeforeMount where monaco is guaranteed loaded.
 * Flushes any schemas registered before initialization.
 */
export function initMonacoJson(monaco: typeof import('monaco-editor')): void {
  if (_json) return;
  _json = monaco.json;
  if (schemaRegistry.size > 0) applySchemas();
}

/**
 * Reset state (for testing only).
 */
export function resetMonacoJson(): void {
  _json = undefined;
  schemaRegistry.clear();
  idCounter = 0;
}

/**
 * Generate a unique model path for a Code instance.
 * Used as the `path` prop for @monaco-editor/react Editor.
 */
export function generateModelPath(): string {
  return `inmemory://walkeros/json-${++idCounter}.json`;
}

/**
 * Register a JSON schema for a specific model path.
 * Triggers a global setDiagnosticsOptions update.
 */
export function registerJsonSchema(
  modelPath: string,
  schema: Record<string, unknown>,
): void {
  schemaRegistry.set(modelPath, {
    uri: `schema://walkeros/${modelPath}`,
    fileMatch: [modelPath],
    schema,
  });
  applySchemas();
}

/**
 * Unregister a JSON schema when a Code instance unmounts.
 * Triggers a global setDiagnosticsOptions update.
 */
export function unregisterJsonSchema(modelPath: string): void {
  schemaRegistry.delete(modelPath);
  applySchemas();
}

/**
 * Apply all registered schemas to Monaco's JSON language service.
 */
function applySchemas(): void {
  if (!_json) return;
  _json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemaValidation: 'error',
    schemaRequest: 'ignore',
    enableSchemaRequest: false,
    schemas: Array.from(schemaRegistry.values()),
  });
}

/**
 * Get count of registered schemas (for testing/debugging).
 */
export function getRegisteredSchemaCount(): number {
  return schemaRegistry.size;
}

/**
 * Clear all schemas (for testing).
 */
export function clearAllSchemas(): void {
  schemaRegistry.clear();
  applySchemas();
}
