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

export const REF_VAR = /\$var\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
export const REF_DEF = /^\$def\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(.+))?$/;
export const REF_ENV = /\$env\.([a-zA-Z_][a-zA-Z0-9_]*)(?::([^"}\s]*))?/g;
export const REF_CONTRACT = /^\$contract\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(.+))?$/;
export const REF_STORE = /^\$store\.([a-zA-Z_][a-zA-Z0-9_]*)$/;
export const REF_SECRET = /^\$secret\.([A-Z0-9_]+)$/;
export const REF_CODE_PREFIX = '$code:';
