/**
 * The reader of the release document a remote runner takes from the app, and
 * its checks. The document's type, version and check names are core's, so the
 * app writes it without the runner. Every check here runs before any code of
 * the release runs, on every download and on every load from the cache.
 */

import { createHash } from 'crypto';
import {
  RELEASE_DOCUMENT_VERSION,
  type RefusalCheck,
  type ReleaseDocument,
} from '@walkeros/core';
import { isRecord, jsonOf } from './json.js';
import { releaseRefusedLine } from './lines.js';

/** The largest document a runner reads (the channel's cap for it). */
export const DOCUMENT_MAX_BYTES = 65_536;

/** The largest archive a release may name. */
export const ARTIFACT_MAX_BYTES = 536_870_912;

/** The app's version ids: `dv_` and its id alphabet. */
const RELEASE_ID = /^dv_[a-z0-9]{1,64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SECRET_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A display field never refuses a release: it is cleaned and cut instead. */
const FLOW_NAME_MAX = 128;

/** A release a check refused; its message is the line that says so. */
export class ReleaseRefusal extends Error {
  constructor(
    readonly check: RefusalCheck,
    readonly sequence?: number,
    readonly names?: readonly string[],
  ) {
    super(releaseRefusedLine({ check, sequence, names }));
    this.name = 'ReleaseRefusal';
  }
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function isNameList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((name) => typeof name === 'string' && SECRET_NAME.test(name)) &&
    new Set(value).size === value.length
  );
}

/**
 * A character a terminal or a log viewer may act on: the C0 and C1
 * controls with DEL (an 8-bit CSI is U+009B), and the bidi embeddings,
 * overrides and isolates, which reorder what a line shows.
 */
function isControl(code: number): boolean {
  return (
    code <= 0x1f ||
    (code >= 0x7f && code <= 0x9f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

/**
 * The flowName as lines show it: each control character as U+FFFD, cut to
 * 128 characters. It counts code points, so a cut never splits a character.
 */
function shownFlowName(name: string): string {
  let shown = '';
  let count = 0;
  for (const character of name) {
    if (count === FLOW_NAME_MAX) break;
    shown += isControl(character.codePointAt(0) ?? 0) ? '\uFFFD' : character;
    count += 1;
  }
  return shown;
}

/**
 * Read and check a release document: its version first, before any other
 * field; then every field's type; then the deployment, the release id, the
 * archive's size and the sequence against the high-water mark (at or above
 * it, and equal only for the same bytes). Unknown fields are ignored. A
 * refusal names the sequence once the document's sequence reads.
 */
export function readReleaseDocument(
  bytes: Uint8Array,
  expect: {
    deployment: string;
    highWater?: { sequence: number; sha256: string };
  },
): { document: ReleaseDocument; sha256: string } {
  const value = jsonOf(bytes);
  if (!isRecord(value)) throw new ReleaseRefusal('document-format');
  if (value.version !== RELEASE_DOCUMENT_VERSION)
    throw new ReleaseRefusal('document-version');

  const sequence = isCount(value.sequence) ? value.sequence : undefined;
  const refuse = (check: RefusalCheck) => new ReleaseRefusal(check, sequence);
  if (sequence === undefined) throw refuse('document-format');

  const { deployment, release, flowName, artifact, secrets } = value;
  const { secretsSince, releasedAt } = value;
  if (
    typeof deployment !== 'string' ||
    typeof release !== 'string' ||
    typeof flowName !== 'string' ||
    !isRecord(artifact) ||
    typeof artifact.sha256 !== 'string' ||
    !SHA256.test(artifact.sha256) ||
    typeof artifact.bytes !== 'number' ||
    !isRecord(secrets) ||
    !isNameList(secrets.app) ||
    !isNameList(secrets.server) ||
    !isCount(secretsSince) ||
    secretsSince > sequence ||
    typeof releasedAt !== 'string' ||
    Number.isNaN(Date.parse(releasedAt))
  )
    throw refuse('document-format');
  const server = secrets.server;
  if (secrets.app.some((name) => server.includes(name)))
    throw refuse('document-format');

  if (deployment !== expect.deployment) throw refuse('deployment');
  if (!RELEASE_ID.test(release)) throw refuse('release-id');
  if (
    !Number.isSafeInteger(artifact.bytes) ||
    artifact.bytes < 1 ||
    artifact.bytes > ARTIFACT_MAX_BYTES
  )
    throw refuse('artifact-bytes');

  const sha256 = sha256Hex(bytes);
  const highWater = expect.highWater;
  if (
    highWater &&
    (sequence < highWater.sequence ||
      (sequence === highWater.sequence && sha256 !== highWater.sha256))
  )
    throw refuse('sequence');

  return {
    document: {
      version: RELEASE_DOCUMENT_VERSION,
      deployment,
      sequence,
      release,
      flowName: shownFlowName(flowName),
      artifact: { sha256: artifact.sha256, bytes: artifact.bytes },
      secrets: { app: [...secrets.app], server: [...server] },
      secretsSince,
      releasedAt,
    },
    sha256,
  };
}
