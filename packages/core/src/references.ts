/**
 * walkerOS reference-syntax regex constants — single source of truth.
 *
 * Rule:
 * - `.` = key or path (resolver walks it)
 * - `:` = literal value or raw-code payload (resolver uses it verbatim)
 *
 * Every tool that recognizes references (core resolver, CLI bundler,
 * app secrets service, explorer IntelliSense) imports these — no
 * inline regexes elsewhere.
 */

// Anchored: matches only when the string is exactly "$var.name(.deep.path)?"
export const REF_VAR_FULL =
  /^\$var\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)$/;

// Global inline: matches any "$var.name(.deep.path)?" inside a larger string.
// Character class excludes `/`, `:`, `?`, `&`, etc. so URL contexts work.
export const REF_VAR_INLINE =
  /\$var\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
export const REF_ENV = /\$env\.([a-zA-Z_][a-zA-Z0-9_]*)(?::([^"}\s]*))?/g;
export const REF_CONTRACT = /^\$contract\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(.+))?$/;
/** Whole-string `$flow.<name>(.<path>)?`: cross-flow value reference. */
export const REF_FLOW =
  /^\$flow\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z0-9_.]+))?$/;
export const REF_STORE = /^\$store\.([a-zA-Z_][a-zA-Z0-9_]*)$/;
export const REF_SECRET = /^\$secret\.([A-Z0-9_]+)$/;
export const REF_CODE_PREFIX = '$code:';
