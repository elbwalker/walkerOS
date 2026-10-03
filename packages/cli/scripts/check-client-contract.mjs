#!/usr/bin/env node
/**
 * Release checks for the client contract. Plain node (22.18 or later), no
 * install and no credential: it imports the subset module directly.
 *
 *   --live <openapi url> [--warn-only]
 *     Prunes the live OpenAPI document to the operations in
 *     openapi/client-operations.json and compares each operation's wire
 *     digest with the committed openapi/spec.json. A changed or missing
 *     operation prints an ::error:: line and exits 1; with --warn-only it
 *     prints ::warning:: and exits 0. A server that cannot be reached, or
 *     does not answer 200 with an OpenAPI document, prints a ::warning:: and
 *     exits 0.
 *
 *   --label-base <spec.json>
 *     Exits 1 when the contract label's floor in openapi/spec.json is below
 *     the one in the given base spec, or when a label is not a version. A
 *     base label without build metadata names no floor and is skipped.
 *
 * Usage:
 *   node packages/cli/scripts/check-client-contract.mjs --live https://stage.app.walkeros.io/api/openapi.json [--warn-only]
 *   node packages/cli/scripts/check-client-contract.mjs --label-base <base spec.json>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  labelFloorRegressed,
  manifestOperations,
  operationDigests,
} from '../src/core/openapi-subset.ts';

const LIVE_TIMEOUT_MS = 20000;

const cliDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(cliDir, 'openapi', 'spec.json');
const manifestPath = path.join(cliDir, 'openapi', 'client-operations.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function labelOf(doc) {
  const version = doc && doc.info && doc.info.version;
  return typeof version === 'string' ? version : undefined;
}

function failureReason(error) {
  if (error && error.name === 'TimeoutError') {
    return `timeout after ${LIVE_TIMEOUT_MS} ms`;
  }
  const code = error && error.cause && error.cause.code;
  const message = error && error.message ? error.message : String(error);
  return code ? `${message} (${code})` : message;
}

function parseArgs(argv) {
  const args = { warnOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--warn-only') args.warnOnly = true;
    else if (arg === '--live' || arg === '--label-base') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`${arg} needs a value`);
      }
      args[arg === '--live' ? 'live' : 'labelBase'] = value;
      i += 1;
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (args.live === undefined && args.labelBase === undefined) {
    throw new Error('--live <url> or --label-base <file> is required');
  }
  return args;
}

/** Exit code of the live check: 1 on a mismatch unless warnOnly. */
async function checkLive(url, warnOnly) {
  let document;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
    });
    if (response.status !== 200) {
      console.log(`::warning::${url} answered HTTP ${response.status}`);
      return 0;
    }
    document = await response.json();
  } catch (error) {
    console.log(`::warning::${url} unreachable: ${failureReason(error)}`);
    return 0;
  }
  if (!document || typeof document !== 'object' || !document.paths) {
    console.log(`::warning::${url} served no OpenAPI paths`);
    return 0;
  }

  const ops = manifestOperations(readJson(manifestPath));
  const committed = operationDigests(readJson(specPath), ops);
  const level = warnOnly ? 'warning' : 'error';
  const host = new URL(url).host;
  let live;
  try {
    live = operationDigests(document, ops);
  } catch (error) {
    console.log(`::${level}::${url}: ${error.message}`);
    return warnOnly ? 0 : 1;
  }

  const findings = [];
  for (const op of ops) {
    if (!Object.hasOwn(live, op)) findings.push(`missing on ${host}: ${op}`);
    else if (live[op] !== committed[op]) findings.push(`changed: ${op}`);
  }
  for (const finding of findings) console.log(`::${level}::${finding}`);
  const label = labelOf(document) ?? 'no label';
  if (findings.length === 0) {
    console.log(
      `${host} (${label}): ${ops.length} client operations match openapi/spec.json`,
    );
    return 0;
  }
  console.log(
    `${host} (${label}): ${findings.length} of ${ops.length} client operations differ from openapi/spec.json`,
  );
  return warnOnly ? 0 : 1;
}

/** Exit code of the label check: 1 when the floor regressed. */
function checkLabelBase(baseFile) {
  const base = labelOf(readJson(baseFile));
  const head = labelOf(readJson(specPath));
  if (head === undefined) {
    console.log('::error::openapi/spec.json has no info.version');
    return 1;
  }
  if (base === undefined) {
    console.log(`${baseFile} has no info.version; label check skipped`);
    return 0;
  }
  if (!base.includes('+')) {
    console.log(
      `contract label ${base} (base) has no build metadata; label check skipped`,
    );
    return 0;
  }
  let regressed;
  try {
    regressed = labelFloorRegressed(base, head);
  } catch (error) {
    console.log(`::error::${error.message}`);
    return 1;
  }
  if (regressed) {
    console.log(`::error::contract label went from ${base} to ${head}`);
    return 1;
  }
  console.log(`contract label ${base} to ${head}: floor not lower`);
  return 0;
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`check-client-contract: ${error.message}`);
  process.exitCode = 2;
}

if (args) {
  let code = 0;
  if (args.live !== undefined) {
    code = Math.max(code, await checkLive(args.live, args.warnOnly));
  }
  if (args.labelBase !== undefined) {
    code = Math.max(code, checkLabelBase(args.labelBase));
  }
  process.exitCode = code;
}
