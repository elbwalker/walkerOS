import { JsonSchema } from './flow';
import type { ValidationIssue, ValidationResult } from './validate';
import type { IntelliSenseContext, PackageInfo } from './intellisense';

/**
 * Validate a Flow.Config JSON string.
 *
 * Performs three levels of validation:
 * 1. JSON syntax (parse error with line/column)
 * 2. Schema (Zod ConfigSchema validation with mapped positions)
 * 3. References (checks $var., $secret. against extracted context)
 *
 * Returns errors, warnings, and extracted IntelliSenseContext as a byproduct.
 * Pure function: works in Node.js (CLI/MCP) and browser (CodeBox).
 */
export function validateFlowConfig(json: string): ValidationResult {
  // 1. JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    const { line, column } = getJsonParsePosition(e, json);
    return {
      valid: false,
      errors: [
        {
          message: e instanceof Error ? e.message : 'Invalid JSON',
          severity: 'error',
          line,
          column,
        },
      ],
      warnings: [],
    };
  }

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 2. Schema validation
  const zodResult = JsonSchema.safeParse(parsed);
  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      const path = issue.path.join('.');
      const pos = findPathPosition(json, issue.path as (string | number)[]);
      errors.push({
        message: issue.message,
        severity: 'error',
        path: path || 'root',
        ...pos,
      });
    }
  }

  // 3. Extract context + check references (only if JSON is an object with flows)
  const context = extractContext(parsed);
  if (context) {
    const refWarnings = checkReferences(json, context);
    warnings.push(...refWarnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    context,
  };
}

// --- Context Extraction ---

function extractContext(
  parsed: unknown,
): Partial<IntelliSenseContext> | undefined {
  if (
    !isObject(parsed) ||
    !('version' in parsed) ||
    !('flows' in parsed) ||
    !isObject(parsed.flows)
  ) {
    return undefined;
  }

  const variables: Record<string, unknown> = {};
  const sources: string[] = [];
  const destinations: string[] = [];
  const transformers: string[] = [];
  const stores: string[] = [];
  const packages: PackageInfo[] = [];
  const contractEntities: Array<{ entity: string; actions: string[] }> = [];
  let platform: 'web' | 'server' | undefined;

  const flowNames = Object.keys(parsed.flows);

  // Setup-level
  mergeVars(variables, parsed.variables);
  extractContractEntities(contractEntities, parsed.contract);

  // Walk each flow config
  for (const flow of Object.values(parsed.flows)) {
    if (!isObject(flow)) continue;

    if (!platform) {
      const cfg = flow.config;
      if (
        isObject(cfg) &&
        (cfg.platform === 'web' || cfg.platform === 'server')
      ) {
        platform = cfg.platform;
      }
    }

    mergeVars(variables, flow.variables);

    for (const type of ['sources', 'destinations', 'transformers'] as const) {
      const stepType =
        type === 'sources'
          ? 'source'
          : type === 'destinations'
            ? 'destination'
            : 'transformer';
      const list =
        type === 'sources'
          ? sources
          : type === 'destinations'
            ? destinations
            : transformers;

      if (isObject(flow[type])) {
        for (const [name, ref] of Object.entries(
          flow[type] as Record<string, unknown>,
        )) {
          list.push(name);
          if (isObject(ref)) {
            mergeVars(variables, ref.variables);
            if (typeof ref.package === 'string') {
              packages.push({
                package: ref.package,
                shortName: name,
                type: stepType,
                platform: platform || 'web',
              });
            }
          }
        }
      }
    }

    // Stores are not part of the source/destination/transformer step taxonomy
    // used by IntelliSense step pickers, so they are not added to packages[].
    if (isObject(flow.stores)) {
      for (const [name, ref] of Object.entries(flow.stores)) {
        stores.push(name);
        if (isObject(ref)) {
          mergeVars(variables, ref.variables);
        }
      }
    }
  }

  const ctx: Partial<IntelliSenseContext> = {
    variables,
    stepNames: { sources, destinations, transformers, stores },
    flowNames,
  };

  if (platform) ctx.platform = platform;
  if (packages.length > 0) ctx.packages = packages;
  if (contractEntities.length > 0) ctx.contract = contractEntities;

  return ctx;
}

// --- Reference Checking ---

// Inline (global) variant of REF_STORE for scanning anywhere in JSON text.
// Source-of-truth REF_STORE in references.ts is anchored (^...$).
const STORE_INLINE_REGEX = /\$store\.([a-zA-Z_][a-zA-Z0-9_]*)/g;

// Permissive: $env. up to a JSON delimiter, with optional =default suffix.
// REF_ENV in references.ts only models the good shape ($env.NAME[:default]),
// so we use a looser pattern here to detect malformed cases too.
const ENV_LOOSE_REGEX = /\$env\.([A-Za-z_]\w*)(=[^"}\s]*)?/g;

// Inline variant of REF_FLOW. Captures $flow.NAME(.path)? anywhere in text.
// Path portion stops at JSON delimiters (quote, brace, whitespace).
const FLOW_INLINE_REGEX =
  /\$flow\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z0-9_.]+))?/g;

// Scans for $<prefix>:<name> where <prefix> is a reference type that uses a dot.
// Excludes $code: (legitimate code-payload prefix) and $env.NAME:default
// (which has the dot before the colon, so it doesn't match this pattern).
const COLON_TYPO_REGEX = /\$(var|store|flow|secret):([a-zA-Z_][a-zA-Z0-9_]*)/g;

function checkReferences(
  text: string,
  context: Partial<IntelliSenseContext>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Each check is independent. Order is irrelevant, issues are aggregated.
  // Run colon-typo scan first so the user sees the targeted suggestion
  // before any cascading "unknown" warnings from the per-type checks.
  checkColonTypos(text, context, issues);
  checkVarReferences(text, context, issues);
  checkStoreReferences(text, context, issues);
  checkEnvReferences(text, context, issues);
  checkFlowReferences(text, context, issues);

  return issues;
}

function checkColonTypos(
  text: string,
  _context: Partial<IntelliSenseContext>,
  issues: ValidationIssue[],
): void {
  COLON_TYPO_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COLON_TYPO_REGEX.exec(text)) !== null) {
    const full = match[0];
    const prefix = match[1];
    const name = match[2];
    const pos = offsetToPosition(text, match.index, full.length);
    issues.push({
      message: `Malformed reference "${full}", use a dot, not a colon: "$${prefix}.${name}".`,
      severity: 'warning',
      path: full,
      ...pos,
    });
  }
}

function checkStoreReferences(
  text: string,
  context: Partial<IntelliSenseContext>,
  issues: ValidationIssue[],
): void {
  const stores = context.stepNames?.stores ?? [];
  STORE_INLINE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STORE_INLINE_REGEX.exec(text)) !== null) {
    if (!stores.includes(match[1])) {
      const pos = offsetToPosition(text, match.index, match[0].length);
      issues.push({
        message: `Unknown store "$store.${match[1]}". Defined: ${stores.join(', ') || 'none'}`,
        severity: 'warning',
        path: `$store.${match[1]}`,
        ...pos,
      });
    }
  }
}

function checkFlowReferences(
  text: string,
  context: Partial<IntelliSenseContext>,
  issues: ValidationIssue[],
): void {
  const flowNames = context.flowNames ?? [];
  if (flowNames.length === 0) return;

  FLOW_INLINE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FLOW_INLINE_REGEX.exec(text)) !== null) {
    const full = match[0];
    const name = match[1];
    if (!flowNames.includes(name)) {
      const pos = offsetToPosition(text, match.index, full.length);
      issues.push({
        message: `Unknown flow "$flow.${name}". Defined: ${flowNames.join(', ')}`,
        severity: 'warning',
        path: full,
        ...pos,
      });
    }
  }
}

function checkEnvReferences(
  text: string,
  _context: Partial<IntelliSenseContext>,
  issues: ValidationIssue[],
): void {
  ENV_LOOSE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENV_LOOSE_REGEX.exec(text)) !== null) {
    const full = match[0];
    const name = match[1];
    const eqDefault = match[2];
    const pos = offsetToPosition(text, match.index, full.length);

    // Case A: $env.NAME=default (= instead of :)
    if (eqDefault) {
      issues.push({
        message: `Malformed $env reference "${full}". Use ":" for default values, not "=" (e.g., "$env.${name}:fallback").`,
        severity: 'warning',
        path: full,
        ...pos,
      });
      continue;
    }

    // Case B: lowercase / mixed-case name (convention warning).
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
      issues.push({
        message: `$env.${name} should use UPPER_SNAKE_CASE by convention (e.g., $env.${name.toUpperCase()}).`,
        severity: 'warning',
        path: full,
        ...pos,
      });
    }
  }
}

function checkVarReferences(
  text: string,
  context: Partial<IntelliSenseContext>,
  issues: ValidationIssue[],
): void {
  if (!context.variables) return;
  const regex = /\$var\.(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (!(match[1] in context.variables)) {
      const pos = offsetToPosition(text, match.index, match[0].length);
      issues.push({
        message: `Unknown variable "$var.${match[1]}". Defined: ${Object.keys(context.variables).join(', ') || 'none'}`,
        severity: 'warning',
        path: `$var.${match[1]}`,
        ...pos,
      });
    }
  }
}

// --- Position Utilities ---

function getJsonParsePosition(
  error: unknown,
  json: string,
): { line: number; column: number } {
  if (error instanceof SyntaxError) {
    // Node.js: "... at position N" or "... at line N column M"
    const posMatch = error.message.match(/position\s+(\d+)/);
    if (posMatch) {
      const offset = parseInt(posMatch[1], 10);
      return offsetToLineCol(json, offset);
    }
    const lineColMatch = error.message.match(/line\s+(\d+)\s+column\s+(\d+)/);
    if (lineColMatch) {
      return {
        line: parseInt(lineColMatch[1], 10),
        column: parseInt(lineColMatch[2], 10),
      };
    }
  }
  return { line: 1, column: 1 };
}

function offsetToLineCol(
  text: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, column: col };
}

function offsetToPosition(
  text: string,
  startOffset: number,
  length: number,
): { line: number; column: number; endLine: number; endColumn: number } {
  const start = offsetToLineCol(text, startOffset);
  const end = offsetToLineCol(text, startOffset + length);
  return {
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

function findPathPosition(
  json: string,
  path: (string | number)[],
): { line: number; column: number } {
  if (path.length === 0) return { line: 1, column: 1 };

  // Search for the last path segment as a JSON key
  const lastKey = path[path.length - 1];
  if (typeof lastKey === 'string') {
    const pattern = `"${lastKey}"`;
    const idx = json.lastIndexOf(pattern);
    if (idx !== -1) return offsetToLineCol(json, idx);
  }

  return { line: 1, column: 1 };
}

// --- Helpers ---

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function mergeVars(target: Record<string, unknown>, source: unknown): void {
  if (!isObject(source)) return;
  for (const [k, v] of Object.entries(source)) {
    target[k] = v;
  }
}

function extractContractEntities(
  target: Array<{ entity: string; actions: string[] }>,
  contract: unknown,
): void {
  if (!isObject(contract)) return;

  // Named contracts: iterate each named entry
  for (const [, entry] of Object.entries(contract)) {
    if (!isObject(entry)) continue;
    const events = entry.events;
    if (!isObject(events)) continue;

    for (const [entity, actions] of Object.entries(events)) {
      if (!isObject(actions)) continue;
      const existing = target.find((e) => e.entity === entity);
      const actionNames = Object.keys(actions);
      if (existing) {
        for (const a of actionNames) {
          if (!existing.actions.includes(a)) existing.actions.push(a);
        }
      } else {
        target.push({ entity, actions: actionNames });
      }
    }
  }
}
