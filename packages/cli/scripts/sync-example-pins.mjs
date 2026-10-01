#!/usr/bin/env node
/**
 * Pins every @walkeros/* bundle package in examples/flow-complete.json to the
 * version the cli ships with (packages/cli/package.json). All @walkeros/*
 * packages release at one version, so the example always matches its release.
 *
 * Run by release.yml right after `changeset version`. Edits the version
 * strings in place, so the file keeps its formatting, and writes only when a
 * pin changed.
 *
 * Usage: node packages/cli/scripts/sync-example-pins.mjs [version]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cliDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = path.join(cliDir, 'examples', 'flow-complete.json');

const version =
  process.argv[2] ??
  JSON.parse(fs.readFileSync(path.join(cliDir, 'package.json'), 'utf8'))
    .version;

if (
  typeof version !== 'string' ||
  !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)
) {
  console.error(
    `sync-example-pins: invalid version ${JSON.stringify(version)}`,
  );
  process.exit(1);
}

/** Every @walkeros/* entry of every flow's bundle.packages. */
function walkerosPins(json) {
  const pins = [];
  for (const flow of Object.values(json.flows ?? {}))
    for (const [name, pkg] of Object.entries(
      flow.config?.bundle?.packages ?? {},
    ))
      if (name.startsWith('@walkeros/'))
        pins.push({ name, version: pkg.version });
  return pins;
}

const raw = fs.readFileSync(examplePath, 'utf8');
const expected = walkerosPins(JSON.parse(raw));

let matched = 0;
let changed = 0;
const next = raw.replace(
  /("@walkeros\/[^"]+":\s*\{[^{}]*?"version":\s*")([^"]*)(")/g,
  (_, head, current, tail) => {
    matched++;
    if (current !== version) changed++;
    return `${head}${version}${tail}`;
  },
);

const pins = walkerosPins(JSON.parse(next));
if (
  matched !== expected.length ||
  pins.some((pin) => pin.version !== version)
) {
  console.error(
    `sync-example-pins: expected ${expected.length} @walkeros/* pins, rewrote ${matched}; ` +
      'every bundle.packages entry needs a "version" and nothing else may look like one',
  );
  process.exit(1);
}

const file = path.relative(process.cwd(), examplePath);
if (changed === 0) {
  console.log(
    `sync-example-pins: ${file} already pins ${pins.length} packages to ${version}`,
  );
} else {
  fs.writeFileSync(examplePath, next);
  console.log(
    `sync-example-pins: ${file} pinned ${changed} of ${pins.length} packages to ${version}`,
  );
}
