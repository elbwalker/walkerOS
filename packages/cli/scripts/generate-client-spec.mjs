#!/usr/bin/env node
/**
 * Writes openapi/spec.json as the client subset of an app OpenAPI document:
 * the operations listed in openapi/client-operations.json, the components
 * they reference, without documentation keywords.
 *
 * The input is $OPENAPI_SPEC, a file path or an http(s) URL, and defaults to
 * openapi/spec.json itself, so a second run over its own output changes
 * nothing. A subset equal to the committed one apart from info.version, with
 * a label of the same floor, leaves openapi/spec.json byte for byte: an app
 * change no client operation sees changes nothing here. Runs on plain node
 * (22.18 or later), which strips the types of the imported subset module.
 *
 * Usage: OPENAPI_SPEC=<path or URL> node packages/cli/scripts/generate-client-spec.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  manifestOperations,
  pruneToOperations,
  subsetUnchanged,
} from '../src/core/openapi-subset.ts';

const cliDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(cliDir, 'openapi', 'spec.json');
const manifestPath = path.join(cliDir, 'openapi', 'client-operations.json');

const source = process.env.OPENAPI_SPEC || specPath;

async function readInput(location) {
  if (/^https?:\/\//.test(location)) {
    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`GET ${location}: HTTP ${response.status}`);
    }
    return response.json();
  }
  return JSON.parse(fs.readFileSync(location, 'utf8'));
}

const operations = manifestOperations(
  JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
);
function readPrevious() {
  try {
    return JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch {
    return undefined;
  }
}

const subset = pruneToOperations(await readInput(source), operations);
const unchanged = subsetUnchanged(readPrevious(), subset);
if (!unchanged) {
  fs.writeFileSync(specPath, `${JSON.stringify(subset, null, 2)}\n`);
}
console.log(
  `generate-client-spec: ${operations.length} operations from ${source}; subset ${unchanged ? 'unchanged' : 'written'}`,
);
