import {
  REF_ENV,
  REF_FLOW,
  REF_STORE,
  REF_SECRET,
  getRouteGraph,
} from '@walkeros/core';
import type { Transformer } from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';
import type { IntelliSenseContext } from '../types/intellisense';

export interface ValidationIssue {
  message: string;
  severity: 'error' | 'warning' | 'info';
  startIndex: number;
  endIndex: number;
}

/**
 * Build an inline global regex from any REF_* source. The shared REF_*
 * constants include `^`/`$` anchors for whole-value matches; for global
 * text scanning we need a non-anchored global variant. We also bound the
 * trailing optional `.+` path group to `[\w.]+` so it doesn't greedily
 * swallow characters past the reference token. A fresh clone per call
 * keeps `lastIndex` state local.
 */
function inlineGlobal(pattern: RegExp): RegExp {
  const src = pattern.source
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/\(\.\+\)\?$/, '([\\w.]+)?');
  return new RegExp(src, 'g');
}

/**
 * Validate walkerOS references in JSON text against the current context.
 * Returns issues for dangling references and invalid cross-references.
 */
export function validateWalkerOSReferences(
  text: string,
  context: Partial<IntelliSenseContext>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check $var. references (supports deep paths: $var.name.deep.path)
  if (context.variables) {
    const varRegex =
      /\$var\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(text)) !== null) {
      const name = match[1];
      if (!(name in context.variables)) {
        issues.push({
          message: `Unknown variable "$var.${name}". Defined variables: ${Object.keys(context.variables).join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check $secret. references
  if (context.secrets) {
    const secretRegex = inlineGlobal(REF_SECRET);
    let match: RegExpExecArray | null;
    while ((match = secretRegex.exec(text)) !== null) {
      if (!context.secrets.includes(match[1])) {
        issues.push({
          message: `Unknown secret "$secret.${match[1]}". Available: ${context.secrets.join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check $store. references (always when stores inventory is present)
  if (context.stores) {
    const storeRegex = inlineGlobal(REF_STORE);
    let match: RegExpExecArray | null;
    while ((match = storeRegex.exec(text)) !== null) {
      if (!context.stores.includes(match[1])) {
        issues.push({
          message: `Unknown store "$store.${match[1]}". Available: ${context.stores.join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check $flow. references (only when flows inventory is present)
  if (context.flows) {
    const flowRegex = inlineGlobal(REF_FLOW);
    let match: RegExpExecArray | null;
    while ((match = flowRegex.exec(text)) !== null) {
      if (!context.flows.includes(match[1])) {
        issues.push({
          message: `Unknown flow "$flow.${match[1]}". Available: ${context.flows.join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check $env. references (only when envNames inventory is provided)
  if (context.envNames) {
    const envRegex = inlineGlobal(REF_ENV);
    let match: RegExpExecArray | null;
    while ((match = envRegex.exec(text)) !== null) {
      if (!context.envNames.includes(match[1])) {
        issues.push({
          message: `Unknown env var "$env.${match[1]}". Known: ${context.envNames.join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check next/before cross-references in every Route form
  issues.push(...validateChainRefs(text, context.stepNames?.transformers));

  return issues;
}

/**
 * A chain field value is only enumerated once it is a valid Route. The
 * schema is the grammar's single source; an invalid value is reported by the
 * JSON schema markers, not here.
 */
function isRoute(value: unknown): value is Transformer.Route {
  return schemas.RouteSchema.safeParse(value).success;
}

/**
 * Every transformer id a Route can reach, read through core's `getRouteGraph`
 * (the one enumerator over the compiled route form). Covers `one`, `many`,
 * gates and sequences; a `stop` entry has no target and yields no ref.
 */
function routeRefs(route: Transformer.Route): string[] {
  const refs = new Set<string>();
  for (const node of getRouteGraph(route)) {
    for (const target of node.targets) refs.add(target);
  }
  return [...refs];
}

// TODO: precise source offsets for chain-ref markers (currently path-only).
function validateChainRefs(
  text: string,
  stepNamesInput: string[] | undefined,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!stepNamesInput) return issues;
  // Local const so nested closures see the narrowed non-undefined type.
  const stepNames: string[] = stepNamesInput;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return issues;
  }

  function walk(node: unknown, path: (string | number)[]): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, [...path, i]));
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      const p = [...path, key];
      if (key === 'next' || key === 'before') {
        // The whole Route is enumerated here. Do NOT walk into the value
        // afterwards: a route entry's inner `next` is part of this Route.
        if (!isRoute(value)) continue;
        for (const ref of routeRefs(value)) {
          if (!stepNames.includes(ref)) {
            // v1: path-only diagnostic with index 0,0; offset tracking is a
            // follow-up (see TODO above).
            issues.push({
              message: `Unknown transformer "${ref}" in ${p.join('.')}. Available: ${stepNames.join(', ') || 'none'}`,
              severity: 'warning',
              startIndex: 0,
              endIndex: 0,
            });
          }
        }
        continue;
      }
      walk(value, p);
    }
  }

  walk(parsed, []);
  return issues;
}
