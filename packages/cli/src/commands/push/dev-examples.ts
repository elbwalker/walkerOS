function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * Selects the dev examples of one export from a package's awaited `/dev`
 * module.
 *
 * A package with several exports (`walkerOS.exports` in its package.json)
 * ships `exportExamples`, a map from export name to that export's examples,
 * the default export included. A package with one export ships only
 * `examples`.
 *
 * - Map present, export named: `exportExamples[exportName]`. A name missing
 *   from the map resolves to `undefined`, never to another export's examples.
 * - Map present, no export name (the step uses the default export):
 *   `examples`, which by convention holds the default export's examples.
 * - No map: `examples`.
 *
 * `exportName` comes from `resolveExportName` (step `import`, else
 * `bundle.packages[pkg].imports[0]`, else default).
 */
export function selectDevExamples(
  devModule: unknown,
  exportName: string | undefined,
): Record<string, unknown> | undefined {
  if (!isRecord(devModule)) return undefined;

  const map = devModule.exportExamples;
  if (isRecord(map) && exportName !== undefined) {
    const selected = map[exportName];
    return isRecord(selected) ? selected : undefined;
  }

  const examples = devModule.examples;
  return isRecord(examples) ? examples : undefined;
}

/**
 * A package version from before export-keyed examples ships only
 * `examples` (the default export's), even when it declares several
 * exports. For a step naming an export, those examples may belong to
 * another export, so simulate must refuse instead of running that export's
 * mock (or none) against the real vendor. Returns the refusal message, or
 * `undefined` when the examples can be trusted.
 *
 * `packageExports` is the bundle's `__packageExports` (declared exports per
 * package, read at build time from the bundled copy). A bundle without it
 * (built before it existed) cannot tell single- from multi-export packages,
 * so a step naming an export without a map is refused.
 */
export function legacyExportRefusal(
  devModule: unknown,
  packageExports: Record<string, string[]> | undefined,
  packageName: string,
  exportName: string | undefined,
): string | undefined {
  if (exportName === undefined) return undefined;
  if (isRecord(devModule) && isRecord(devModule.exportExamples))
    return undefined;
  if (packageExports) {
    const declared = packageExports[packageName];
    if (!declared || declared.length <= 1) return undefined;
  }
  return `No mock env for ${packageName} export ${exportName}: this package version predates export-keyed examples; use a version with exportExamples or a local path.`;
}
