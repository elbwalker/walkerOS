/**
 * Monaco Editor TypeScript Type Management
 *
 * This utility manages TypeScript type definitions in Monaco Editor for:
 * 1. Static walkerOS core types (bundled at build time via Vite ?raw import)
 * 2. Dynamic destination types (loaded on-the-fly when destinations are added)
 * 3. Context-specific function signatures (condition, fn, validate)
 *
 * Architecture:
 * - Uses monaco.languages.typescript.typescriptDefaults.addExtraLib()
 * - Each type definition gets a unique file path (e.g., 'file:///destinations/gtag.d.ts')
 * - Types can be added/removed dynamically without page reload
 * - Core types are bundled for offline support and predictable versioning
 */

import type { Monaco } from '@monaco-editor/react';
import { getContextTypes } from './monaco-context-types';

// This import will be replaced by tsup plugin with actual TypeScript content
import walkerosCoreTypesBundled from 'virtual:walkeros-core-types';

/**
 * Type library entry - tracks loaded type definitions
 */
interface TypeLibrary {
  uri: string; // Unique identifier (e.g., 'file:///walkeros-core.d.ts')
  content: string; // TypeScript definition content
  disposable?: { dispose: () => void }; // Monaco disposable for cleanup
}

/**
 * Registry of loaded type libraries
 */
const typeLibraries = new Map<string, TypeLibrary>();

// One-shot guards. Monaco's `setCompilerOptions` and `addExtraLib` invalidate
// all existing TypeScript workers and cancel their in-flight operations —
// those cancellations surface as unhandled rejections in the dev overlay.
// Every CodeBox mount would re-trigger this, so we guard per-monaco-instance.
const configuredMonacos = new WeakSet<Monaco>();
const ambientsRegistered = new WeakSet<Monaco>();

/**
 * Configuration for TypeScript compiler options
 */
export function configureMonacoTypeScript(monaco: Monaco) {
  if (configuredMonacos.has(monaco)) return;
  configuredMonacos.add(monaco);
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2022 ?? 9, // 9 = ES2022
    lib: ['es2022', 'dom'],
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleDetection: 3, // ModuleDetectionKind.Force — Monaco does not expose the enum. Auto=1, Legacy=2, Force=3.
    noEmit: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowJs: true,
    checkJs: false,
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [1108, 1005],
  });

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2022 ?? 9, // 9 = ES2022
    lib: ['es2022', 'dom'],
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleDetection: 3, // ModuleDetectionKind.Force — Monaco does not expose the enum. Auto=1, Legacy=2, Force=3.
    noEmit: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowJs: true,
    strict: false,
    noImplicitAny: false,
  });
}

/**
 * Add a type library from a string
 *
 * @param monaco - Monaco instance
 * @param uri - Unique identifier (e.g., 'file:///destinations/gtag.d.ts')
 * @param content - TypeScript definition content
 * @returns True if added, false if already exists
 */
export function addTypeLibrary(
  monaco: Monaco,
  uri: string,
  content: string,
): boolean {
  // Check if already loaded
  if (typeLibraries.has(uri)) {
    return false;
  }

  // Add to both JavaScript and TypeScript language services
  // This ensures types work whether the editor is in JS or TS mode
  const jsDisposable =
    monaco.languages.typescript.javascriptDefaults.addExtraLib(content, uri);

  const tsDisposable =
    monaco.languages.typescript.typescriptDefaults.addExtraLib(content, uri);

  // Track in registry (store both disposables)
  typeLibraries.set(uri, {
    uri,
    content,
    disposable: {
      dispose: () => {
        jsDisposable.dispose();
        tsDisposable.dispose();
      },
    },
  });

  return true;
}

/**
 * Remove a type library
 *
 * @param uri - URI to remove
 * @returns True if removed, false if not found
 */
export function removeTypeLibrary(uri: string): boolean {
  const lib = typeLibraries.get(uri);
  if (!lib) {
    return false;
  }

  // Dispose Monaco resource
  lib.disposable?.dispose();

  // Remove from registry
  typeLibraries.delete(uri);

  return true;
}

/**
 * Update a type library (remove + add)
 *
 * @param monaco - Monaco instance
 * @param uri - URI to update
 * @param content - New content
 */
export function updateTypeLibrary(
  monaco: Monaco,
  uri: string,
  content: string,
) {
  removeTypeLibrary(uri);
  addTypeLibrary(monaco, uri, content);
}

/**
 * Load type definitions from a URL
 *
 * @param monaco - Monaco instance
 * @param url - URL to .d.ts file
 * @param uri - Optional custom URI (defaults to URL)
 */
export async function loadTypeLibraryFromURL(
  monaco: Monaco,
  url: string,
  uri?: string,
): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return false;
    }

    const content = await response.text();
    const typeUri = uri || `file:///${url}`;

    return addTypeLibrary(monaco, typeUri, content);
  } catch {
    return false;
  }
}

/**
 * Strip problematic imports from type definition content
 *
 * Removes import statements that Monaco can't resolve, while preserving:
 * - Type declarations
 * - Export statements
 * - Re-export statements (export * from / export { } from)
 *
 * Uses multiple strategies for robustness:
 * 1. Simple single-line imports (fast path)
 * 2. Multi-line imports (comprehensive)
 * 3. Import type assertions
 *
 * Does NOT remove:
 * - export { } from 'module' (re-exports)
 * - export * from 'module' (re-exports)
 * - Triple-slash directives (/// <reference types="..." />)
 *
 * @param content - Raw .d.ts file content
 * @returns Cleaned content safe for Monaco
 */
function stripExternalImports(content: string): string {
  // Strategy 1: Remove simple single-line imports
  // Matches: import ... from '...';
  // Handles: import type, import *, import { }, default imports
  let cleaned = content.replace(
    /^import\s+(?:type\s+)?(?:\*\s+as\s+\w+|\{[^}]*\}|[\w$]+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?\s+from\s+['"][^'"]+['"];?\s*$/gm,
    '',
  );

  // Strategy 2: Remove multi-line imports (more aggressive)
  // Matches imports that span multiple lines
  cleaned = cleaned.replace(
    /^import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|[\w$]+)\s+from\s+['"][^'"]+['"];?\s*$/gms,
    '',
  );

  // Strategy 3: Remove import type assertions
  // Matches: import('module')
  cleaned = cleaned.replace(/import\s*\(\s*['"][^'"]+['"]\s*\)/g, 'any');

  // Clean up excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
}

/**
 * Options for loading package types dynamically
 */
export interface LoadPackageTypesOptions {
  /** Package name (e.g., '@walkeros/destination-gtag') */
  package: string;
  /** Version to load (e.g., '0.1.0', 'latest') */
  version?: string;
}

export async function loadPackageTypes(
  monaco: Monaco,
  options: LoadPackageTypesOptions,
): Promise<boolean> {
  const { package: packageName, version = 'latest' } = options;
  const uri = `file:///node_modules/${packageName}/index.d.ts`;

  if (typeLibraries.has(uri)) {
    return true;
  }

  const url = `https://cdn.jsdelivr.net/npm/${packageName}@${version}/dist/index.d.ts`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return false;
    }

    let content = await response.text();
    content = stripExternalImports(content);

    const moduleContent = `declare module '${packageName}' {\n${content}\n}`;
    const success = addTypeLibrary(monaco, uri, moduleContent);

    return success;
  } catch {
    return false;
  }
}

/**
 * Load walkerOS core types (bundled at build time)
 *
 * Uses bundled types imported via Vite's ?raw import.
 * This ensures types are always available offline and match the installed version.
 */
export function loadWalkerOSCoreTypes(monaco: Monaco): boolean {
  const uri = 'file:///node_modules/@walkeros/core/index.d.ts';

  // Check if already loaded
  if (typeLibraries.has(uri)) {
    return true;
  }

  // Clean the types using the same robust stripping function
  const cleanedTypes = stripExternalImports(walkerosCoreTypesBundled);

  // Wrap in module declaration
  const moduleContent = `declare module '@walkeros/core' {
${cleanedTypes}
}`;

  return addTypeLibrary(monaco, uri, moduleContent);
}

/**
 * Type of function context (fn, condition, validate)
 */
export type FunctionType = 'condition' | 'fn' | 'validate';

/**
 * Add context-specific globals for function editors
 *
 * Provides type definitions for inline function parameters without imports.
 * Supports three function types:
 * - fn: Transform functions (value, mapping, options) => Property
 * - condition: Condition functions (value, mapping, collector) => boolean
 * - validate: Validation functions (value) => boolean
 */
export interface FunctionContext {
  type: FunctionType;
  valueType?: string; // Optional: Custom type for 'value' parameter
}

export function addFunctionContextTypes(
  monaco: Monaco,
  context: FunctionContext,
) {
  const uri = `file:///context/${context.type}.d.ts`;

  // Use hand-crafted type templates from monaco-context-types
  const contextTypes = getContextTypes(context.type);

  // Update or add
  updateTypeLibrary(monaco, uri, contextTypes);
}

/**
 * Add destination-specific types dynamically
 *
 * @param monaco - Monaco instance
 * @param destinationId - Unique destination identifier (e.g., 'gtag', 'fbq')
 * @param typeDefinition - TypeScript definition for destination's custom config/event
 *
 * @example
 * ```typescript
 * addDestinationType(monaco, 'gtag', `
 *   declare namespace Gtag {
 *     interface Settings {
 *       measurementId: string;
 *       sendPageView?: boolean;
 *     }
 *
 *     interface EventParams {
 *       event_category?: string;
 *       event_label?: string;
 *       value?: number;
 *     }
 *   }
 *
 *   // Extend WalkerOS namespace
 *   declare namespace WalkerOS {
 *     namespace Destination {
 *       interface ConfigMap {
 *         gtag: Gtag.Settings;
 *       }
 *     }
 *   }
 * `);
 * ```
 */
export function addDestinationType(
  monaco: Monaco,
  destinationId: string,
  typeDefinition: string,
) {
  const uri = `file:///destinations/${destinationId}.d.ts`;
  updateTypeLibrary(monaco, uri, typeDefinition);
}

/**
 * Remove destination types when destination is removed
 */
export function removeDestinationType(destinationId: string) {
  const uri = `file:///destinations/${destinationId}.d.ts`;
  removeTypeLibrary(uri);
}

/**
 * Simple helper to register only walkerOS core types
 *
 * Use this for basic scenarios where you just need @walkeros/core types.
 * For advanced usage (destinations, function contexts), use initializeMonacoTypes.
 *
 * @param monaco - Monaco editor instance
 *
 * @example
 * ```typescript
 * const handleBeforeMount = (monaco: Monaco) => {
 *   registerWalkerOSTypes(monaco);
 * };
 * ```
 */
export function registerWalkerOSTypes(monaco: Monaco): void {
  configureMonacoTypeScript(monaco);
  loadWalkerOSCoreTypes(monaco);
  registerWalkerOSAmbients(monaco);
}

/**
 * Register walkerOS runtime globals so snippets can reference them without
 * imports. Uses Monaco's official `addExtraLib` API — the documented way to
 * inject ambient TypeScript declarations into the editor.
 *
 * Globals declared here:
 *  - getMappingEvent, getMappingValue: pure mapping helpers from @walkeros/core
 *  - elb: the walker push function bound by startFlow
 */
export function registerWalkerOSAmbients(monaco: Monaco): void {
  if (ambientsRegistered.has(monaco)) return;
  ambientsRegistered.add(monaco);

  // Re-alias real exports from @walkeros/core as globals — no duplication,
  // signatures stay in sync with the package.
  const ambients = `
    import type {
      getMappingEvent as _getMappingEvent,
      getMappingValue as _getMappingValue,
      WalkerOS,
    } from '@walkeros/core';

    declare global {
      const getMappingEvent: typeof _getMappingEvent;
      const getMappingValue: typeof _getMappingValue;
      const elb: WalkerOS.Elb;
    }

    export {};
  `;

  const uri = 'file:///node_modules/@walkeros/_ambient/index.d.ts';

  monaco.languages.typescript.typescriptDefaults.addExtraLib(ambients, uri);
  monaco.languages.typescript.javascriptDefaults.addExtraLib(ambients, uri);
}

/**
 * Initialize Monaco with walkerOS types (full setup)
 *
 * Call this once in CodeBox's beforeMount handler.
 * Includes core types, TypeScript config, and default function context.
 *
 * @param monaco - Monaco editor instance
 *
 * @example
 * ```typescript
 * const handleBeforeMount = (monaco: Monaco) => {
 *   initializeMonacoTypes(monaco);
 * };
 * ```
 */
export function initializeMonacoTypes(monaco: Monaco): void {
  // Configure compiler
  configureMonacoTypeScript(monaco);

  // Load core types (now synchronous with bundled types)
  loadWalkerOSCoreTypes(monaco);

  // Add default function context (condition)
  addFunctionContextTypes(monaco, { type: 'condition' });
}

/**
 * Get all loaded type libraries (for debugging)
 */
export function getLoadedTypeLibraries(): string[] {
  return Array.from(typeLibraries.keys());
}

/**
 * Clear all type libraries (for testing)
 */
export function clearAllTypeLibraries() {
  for (const lib of typeLibraries.values()) {
    lib.disposable?.dispose();
  }
  typeLibraries.clear();
}
