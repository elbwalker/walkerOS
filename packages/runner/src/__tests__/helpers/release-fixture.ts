import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { c as tarCreate } from 'tar';
import type { ReleaseDocument } from '@walkeros/core';
import { sha256Hex } from '../../remote/release-document.js';

/** The deployment the fixtures and the stand-in app name by default. */
export const FIXTURE_DEPLOYMENT = 'dep_standin';

export interface ReleaseFixtureOptions {
  sequence: number;
  deployment?: string;
  /** The version id; `dv_r<sequence>` by default. */
  release?: string;
  flowName?: string;
  /** The archive's `flow.mjs`; {@link defaultFlowSource} by default. */
  source?: string;
  /** More archive entries, by path inside the archive. */
  files?: Record<string, string>;
  secrets?: { app: string[]; server: string[] };
  secretsSince?: number;
  releasedAt?: string;
  /** The secret set's values; one per `secrets.app` name by default. */
  values?: Record<string, string>;
}

export interface ReleaseFixture {
  document: ReleaseDocument;
  documentBytes: Uint8Array;
  /** The document's sha256: its cache name and its ETag. */
  documentSha256: string;
  archive: Uint8Array;
  artifact: ReleaseDocument['artifact'];
  /** The release's secret set as the stand-in seam reads it. */
  secretSet: Uint8Array;
}

/**
 * A flow.mjs that needs no package: a default factory returning a collector
 * with push, command, status, name and release, and an HTTP handler that
 * answers the sequence, the release and which secret names are set (never a
 * value). It declares the secret names, so the runner's injection sets them.
 */
export function defaultFlowSource(input: {
  sequence: number;
  release: string;
  flowName: string;
  names: readonly string[];
}): string {
  const declared = JSON.stringify({ secrets: [...input.names], env: [] });
  return `export const __walkerosEnv = ${declared};

export default async function () {
  const status = {
    startedAt: Date.now(),
    in: 0,
    out: 0,
    failed: 0,
    sources: {},
    destinations: {},
    dropped: {},
    breakers: {},
    connectionErrors: {},
  };
  const collector = {
    name: ${JSON.stringify(input.flowName)},
    release: ${JSON.stringify(input.release)},
    status,
    async push() {
      status.in += 1;
      status.out += 1;
      return { ok: true };
    },
    async command() {
      return { ok: true };
    },
  };
  const names = __walkerosEnv.secrets;
  const httpHandler = (req, res) => {
    status.in += 1;
    status.out += 1;
    const set = Object.fromEntries(
      names.map((name) => [name, process.env[name] !== undefined]),
    );
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        sequence: ${input.sequence},
        release: ${JSON.stringify(input.release)},
        set,
      }),
    );
  };
  return { collector, httpHandler };
}
`;
}

/** A fixed entry time, so the same entries give the same archive bytes. */
const ENTRY_TIME = new Date('2026-01-01T00:00:00.000Z');

async function tgzOf(entries: Record<string, string>): Promise<Uint8Array> {
  const folder = await mkdtemp(join(tmpdir(), 'walkeros-fixture-'));
  try {
    for (const [path, content] of Object.entries(entries)) {
      await mkdir(dirname(join(folder, path)), { recursive: true });
      await writeFile(join(folder, path), content);
    }
    const chunks: Buffer[] = [];
    const pack = tarCreate(
      { gzip: true, cwd: folder, portable: true, mtime: ENTRY_TIME },
      Object.keys(entries).sort(),
    );
    for await (const chunk of pack) chunks.push(Buffer.from(chunk));
    return new Uint8Array(Buffer.concat(chunks));
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

/** One release as the app would serve it: archive, document and secret set. */
export async function buildRelease(
  options: ReleaseFixtureOptions,
): Promise<ReleaseFixture> {
  const deployment = options.deployment ?? FIXTURE_DEPLOYMENT;
  const release = options.release ?? `dv_r${options.sequence}`;
  const flowName = options.flowName ?? 'shop';
  const secrets = options.secrets ?? { app: [], server: [] };
  const source =
    options.source ??
    defaultFlowSource({
      sequence: options.sequence,
      release,
      flowName,
      names: [...secrets.app, ...secrets.server].sort(),
    });

  const archive = await tgzOf({ 'flow.mjs': source, ...options.files });
  const artifact = { sha256: sha256Hex(archive), bytes: archive.byteLength };
  const document: ReleaseDocument = {
    version: 1,
    deployment,
    sequence: options.sequence,
    release,
    flowName,
    artifact,
    secrets,
    secretsSince: options.secretsSince ?? 1,
    releasedAt: options.releasedAt ?? '2026-11-18T10:00:00.000Z',
  };
  const documentBytes = new TextEncoder().encode(JSON.stringify(document));
  const values =
    options.values ??
    Object.fromEntries(
      secrets.app.map((name) => [
        name,
        `value-${name.toLowerCase()}-v${options.sequence}`,
      ]),
    );
  const secretSet = new TextEncoder().encode(
    JSON.stringify({ deployment, sequence: options.sequence, values }),
  );

  return {
    document,
    documentBytes,
    documentSha256: sha256Hex(documentBytes),
    archive,
    artifact,
    secretSet,
  };
}

/** A `.tgz` of the given entries, for archives a release should refuse. */
export function archiveOf(
  entries: Record<string, string>,
): Promise<Uint8Array> {
  return tgzOf(entries);
}
