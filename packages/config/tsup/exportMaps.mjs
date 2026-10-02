// Guards for published step metadata in dist/walkerOS.json. A package that
// declares two or more exports in package.json `walkerOS.exports` ships
// `exportExamples` and `exportSchemas` keyed by exactly those export names,
// the default export included, so a reader never falls back to another
// export's examples or settings schema.

const STEP_TYPES = ['source', 'transformer', 'destination', 'store'];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKeys(packageName, mapName, map, declared) {
  if (!isRecord(map)) throw new Error(`${packageName}: ${mapName} is missing`);
  for (const name of declared) {
    if (!(name in map))
      throw new Error(`${packageName}: ${mapName} is missing export "${name}"`);
  }
  for (const name of Object.keys(map)) {
    if (!declared.includes(name))
      throw new Error(
        `${packageName}: ${mapName} has undeclared export "${name}"`,
      );
  }
}

/**
 * Throw when the per-export maps do not match the declared exports: with two
 * or more exports both maps list every export and each `exportSchemas` entry
 * carries a `settings` schema; with fewer, neither map is present.
 */
function assertExportMaps(packageName, declaredExports, maps) {
  const declared = isRecord(declaredExports)
    ? Object.keys(declaredExports)
    : [];
  const { exportExamples, exportSchemas } = maps;

  if (declared.length < 2) {
    for (const [mapName, map] of [
      ['exportExamples', exportExamples],
      ['exportSchemas', exportSchemas],
    ]) {
      if (map !== undefined)
        throw new Error(
          `${packageName}: ${mapName} is set but the package declares fewer than two exports`,
        );
    }
    return;
  }

  assertKeys(packageName, 'exportExamples', exportExamples, declared);
  assertKeys(packageName, 'exportSchemas', exportSchemas, declared);
  for (const [name, entry] of Object.entries(exportSchemas)) {
    if (!isRecord(entry) || !isRecord(entry.settings))
      throw new Error(
        `${packageName}: exportSchemas.${name} has no settings schema`,
      );
  }
}

/** Throw when a step package (source, transformer, destination, store) publishes no settings schema. */
function assertStepSettings(packageName, type, schemas) {
  if (!STEP_TYPES.includes(type)) return;
  if (!isRecord(schemas) || !isRecord(schemas.settings))
    throw new Error(`${packageName}: schemas.settings is missing`);
}

/**
 * The `$meta.exports` a package publishes: its declared `walkerOS.exports`,
 * else an empty list for a step package, so a reader can tell a package
 * without named exports from an older package that published no list.
 */
function publishedExports(walkerOS) {
  if (isRecord(walkerOS.exports)) return walkerOS.exports;
  return STEP_TYPES.includes(walkerOS.type) ? {} : undefined;
}

export { assertExportMaps, assertStepSettings, publishedExports };
