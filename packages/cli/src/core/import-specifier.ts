/**
 * Normalise an absolute path for embedding into generated import statements
 * that esbuild will bundle. Backslashes become escape sequences when JS
 * parses the import (e.g. \5 turns into U+0005), so we always emit forward
 * slashes — esbuild and Node both resolve them on every platform, Windows
 * included. For Node runtime import() use pathToFileURL(...).href instead;
 * esbuild's static resolver does not accept file:// URLs.
 */
export const toFileImportSpecifier = (absPath: string): string =>
  absPath.replace(/\\/g, '/');
