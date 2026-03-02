import { SetupSchema } from './flow';
import type { ValidationIssue, ValidationResult } from './validate';
import type { IntelliSenseContext, PackageInfo } from './intellisense';

/**
 * Validate a Flow.Setup JSON string.
 *
 * Performs three levels of validation:
 * 1. JSON syntax — parse error with line/column
 * 2. Schema — Zod SetupSchema validation with mapped positions
 * 3. References — checks $var., $def., $secret. against extracted context
 *
 * Returns errors, warnings, and extracted IntelliSenseContext as a byproduct.
 * Pure function — works in Node.js (CLI/MCP) and browser (CodeBox).
 */
export function validateFlowSetup(json: string): ValidationResult {
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
  const zodResult = SetupSchema.safeParse(parsed);
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

  const variables: Record<string, string | number | boolean> = {};
  const definitions: Record<string, unknown> = {};
  const sources: string[] = [];
  const destinations: string[] = [];
  const transformers: string[] = [];
  const packages: PackageInfo[] = [];
  const contractEntities: Array<{ entity: string; actions: string[] }> = [];
  let platform: 'web' | 'server' | undefined;

  // Setup-level
  mergeVars(variables, parsed.variables);
  mergeDefs(definitions, parsed.definitions);
  extractContractEntities(contractEntities, parsed.contract);

  // Walk each flow config
  for (const config of Object.values(parsed.flows)) {
    if (!isObject(config)) continue;

    if (!platform) {
      if ('web' in config) platform = 'web';
      else if ('server' in config) platform = 'server';
    }

    mergeVars(variables, config.variables);
    mergeDefs(definitions, config.definitions);
    extractContractEntities(contractEntities, config.contract);

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

      if (isObject(config[type])) {
        for (const [name, ref] of Object.entries(
          config[type] as Record<string, unknown>,
        )) {
          list.push(name);
          if (isObject(ref)) {
            mergeVars(variables, ref.variables);
            mergeDefs(definitions, ref.definitions);
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
  }

  const ctx: Partial<IntelliSenseContext> = {
    variables,
    definitions,
    stepNames: { sources, destinations, transformers },
  };

  if (platform) ctx.platform = platform;
  if (packages.length > 0) ctx.packages = packages;
  if (contractEntities.length > 0) ctx.contract = contractEntities;

  return ctx;
}

// --- Reference Checking ---

function checkReferences(
  text: string,
  context: Partial<IntelliSenseContext>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (context.variables) {
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

  if (context.definitions) {
    const regex = /\$def\.(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (!(match[1] in context.definitions)) {
        const pos = offsetToPosition(text, match.index, match[0].length);
        issues.push({
          message: `Unknown definition "$def.${match[1]}". Defined: ${Object.keys(context.definitions).join(', ') || 'none'}`,
          severity: 'warning',
          path: `$def.${match[1]}`,
          ...pos,
        });
      }
    }
  }

  return issues;
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

function isPrimitive(v: unknown): v is string | number | boolean {
  return (
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
  );
}

function mergeVars(
  target: Record<string, string | number | boolean>,
  source: unknown,
): void {
  if (!isObject(source)) return;
  for (const [k, v] of Object.entries(source)) {
    if (isPrimitive(v)) target[k] = v;
  }
}

function mergeDefs(target: Record<string, unknown>, source: unknown): void {
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
  for (const [key, value] of Object.entries(contract)) {
    if (key.startsWith('$') || !isObject(value)) continue;
    const existing = target.find((e) => e.entity === key);
    const actions = Object.keys(value);
    if (existing) {
      for (const a of actions) {
        if (!existing.actions.includes(a)) existing.actions.push(a);
      }
    } else {
      target.push({ entity: key, actions });
    }
  }
}
