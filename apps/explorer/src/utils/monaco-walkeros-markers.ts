import {
  REF_VAR,
  REF_DEF,
  REF_ENV,
  REF_FLOW,
  REF_STORE,
  REF_SECRET,
} from '@walkeros/core';
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

  // Check $var. references
  if (context.variables) {
    const varRegex = inlineGlobal(REF_VAR);
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(text)) !== null) {
      if (!(match[1] in context.variables)) {
        issues.push({
          message: `Unknown variable "$var.${match[1]}". Defined variables: ${Object.keys(context.variables).join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check $def. references
  if (context.definitions) {
    const defRegex = inlineGlobal(REF_DEF);
    let match: RegExpExecArray | null;
    while ((match = defRegex.exec(text)) !== null) {
      if (!(match[1] in context.definitions)) {
        issues.push({
          message: `Unknown definition "$def.${match[1]}". Defined: ${Object.keys(context.definitions).join(', ') || 'none'}`,
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

  // Check next/before cross-references across scalar, array, and Route[] forms
  issues.push(...validateChainRefs(text, context.stepNames?.transformers));

  return issues;
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

  function collectRefs(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) {
      const out: string[] = [];
      for (const item of value) {
        if (typeof item === 'string') out.push(item);
        else if (item && typeof item === 'object' && 'next' in item) {
          out.push(...collectRefs((item as { next: unknown }).next));
        }
      }
      return out;
    }
    return [];
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
        // collectRefs handles scalar/array/Route[] uniformly. Do NOT walk
        // into the value afterwards — a Route[] item's inner `next` would
        // otherwise be re-detected on the recursive descent.
        for (const ref of collectRefs(value)) {
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
