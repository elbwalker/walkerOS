import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { c as tarCreate } from 'tar';
import type { RemoteLast, ServedDeployment } from '@walkeros/core';
import { sha256Hex } from '../../remote/release-document.js';
import { BOOT_WEB_FETCH_MS } from '../../remote/supervisor.js';
import {
  buildRelease,
  buildWebRelease,
  defaultFlowSource,
  type ReleaseFixture,
  type ReleaseFixtureOptions,
  type WebReleaseFixture,
} from '../helpers/release-fixture.js';
import {
  answer,
  createHarness,
  fault,
  until,
  withDocument,
  type Harness,
} from '../helpers/supervisor-harness.js';

let h: Harness;

afterEach(async () => {
  await h.close();
});

const WEB = 'dep_casamoda';
const PATH = 'casamoda/walker.js';

/**
 * A server release that serves one web part at `PATH`: its archive holds
 * `archive web v<web>` there, the copy of the web sequence its entry names.
 */
function servedRelease(
  sequence: number,
  web: number,
  options: Partial<ReleaseFixtureOptions> = {},
) {
  const served: ServedDeployment[] = [
    { deployment: WEB, path: PATH, sequence: web },
  ];
  return buildRelease({
    sequence,
    served,
    files: { [PATH]: `archive web v${web}` },
    ...options,
  });
}

/** A release of the web part whose script reads `web v<sequence>`. */
function web(sequence: number): WebReleaseFixture {
  return buildWebRelease({
    deployment: WEB,
    sequence,
    script: `web v${sequence}`,
  });
}

/** Writes a web release into the cache, as another instance on it would: its file, then its document. */
async function cacheWeb(release: WebReleaseFixture): Promise<void> {
  async function* once(): AsyncGenerator<Uint8Array> {
    yield release.file;
  }
  await h.cache.storeArtifact(once(), release.artifact, 'file');
  await h.cache.storeDocument(release.documentBytes, release.documentSha256);
}

/** The served file in a release's folder, as the flow reads it. */
function servedIn(sequence: number, path = PATH): string {
  return readFileSync(
    join(h.folder, 'releases', String(sequence), ...path.split('/')),
    'utf-8',
  );
}

/** What each child's folder holds at `path` the moment it forks. */
function atFork(path = PATH): string[] {
  const seen: string[] = [];
  h.onSpawn = (start) => {
    const file = join(dirname(start.flowFile), ...path.split('/'));
    seen.push(existsSync(file) ? readFileSync(file, 'utf-8') : 'nothing');
  };
  return seen;
}

function routes(): Array<string | undefined> {
  return h.standIn.requests.map((request) => request.route);
}

function infos(): string[] {
  return h.lines
    .filter((line) => line.level === 'info')
    .map((line) => line.message);
}

function short(release: WebReleaseFixture): string {
  return release.artifact.sha256.slice(0, 12);
}

/** A web release whose file is other bytes of the same length: its sha256 fails. */
function tampered(sequence: number): WebReleaseFixture {
  return { ...web(sequence), file: new TextEncoder().encode('web v9') };
}

/** The running child of `sequence` crashes; its restart forks after the 1 s back-off and gets ready. */
async function crashAndRestart(sequence: number): Promise<void> {
  const before = h.children.length;
  h.child(sequence).exit(1);
  await until(() => h.clock.waiting().includes(1000));
  h.clock.advance(1000);
  await until(
    () =>
      h.children.length === before + 1 &&
      h.supervisor.state().running === sequence,
  );
}

/** The release with an archive whose `casamoda` is a link, beside its flow.mjs. */
async function withLinkedParent(
  release: ReleaseFixture,
): Promise<ReleaseFixture> {
  const folder = mkdtempSync(join(tmpdir(), 'walkeros-served-test-'));
  try {
    const { sequence, release: versionId, flowName } = release.document;
    writeFileSync(
      join(folder, 'flow.mjs'),
      defaultFlowSource({ sequence, release: versionId, flowName, names: [] }),
    );
    symlinkSync('elsewhere', join(folder, 'casamoda'));
    const chunks: Buffer[] = [];
    for await (const chunk of tarCreate({ gzip: true, cwd: folder }, [
      'flow.mjs',
      'casamoda',
    ]))
      chunks.push(Buffer.from(chunk));
    const archive = new Uint8Array(Buffer.concat(chunks));
    const artifact = { sha256: sha256Hex(archive), bytes: archive.byteLength };
    return {
      ...withDocument(release, (document) => ({ ...document, artifact })),
      archive,
      artifact,
    };
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

/** Each way a server release starts, with web v<cached> in the cache and every web fetch failing. */
const STARTS: Record<string, (cached: number) => Promise<void>> = {
  'a server release': async (cached) => {
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    await cacheWeb(web(cached));
    h.standIn.serve(await servedRelease(2, 5), { current: true });
    await h.supervisor.consider(answer(2, { [WEB]: 7 }));
  },
  'a boot from the cache': async (cached) => {
    await h.cacheRelease(await servedRelease(2, 5));
    await cacheWeb(web(cached));
    expect(await h.supervisor.boot(answer(2, { [WEB]: 7 }))).toBe('serving');
  },
  'a cold-boot fallback': async (cached) => {
    await h.cacheRelease(await servedRelease(2, 5));
    await h.cacheRelease(await buildRelease({ sequence: 3 }));
    h.behaviours.set(3, { start: 'exit' });
    await cacheWeb(web(cached));
    expect(await h.supervisor.boot(answer(3, { [WEB]: 7 }))).toBe('serving');
  },
  'a crash restart': async (cached) => {
    await h.cacheRelease(await servedRelease(2, 5));
    expect(await h.supervisor.boot(answer(2))).toBe('serving');
    await cacheWeb(web(cached));
    await crashAndRestart(2);
  },
  'a web swap': async (cached) => {
    await h.cacheRelease(await servedRelease(2, 5));
    expect(await h.supervisor.boot(answer(2))).toBe('serving');
    await cacheWeb(web(cached));
    await h.supervisor.consider(answer(2, { [WEB]: 7 }));
  },
};

describe('a server release that serves a web part', () => {
  it('forks a boot with an empty cache with the named web file the app serves at once, so the first request after ready gets it', async () => {
    h = await createHarness();
    h.standIn.serve(await servedRelease(1, 3), { current: true });
    const w4 = web(4);
    h.standIn.serveWeb(w4, { current: true });
    const forked = atFork();

    expect(await h.supervisor.boot(answer(1, { [WEB]: 4 }))).toBe('serving');

    expect(forked).toEqual(['web v4']);
    expect(routes()).toEqual([
      'release',
      'archive',
      'served-release',
      'served-file',
    ]);
    expect(h.children).toHaveLength(1);
    expect(h.child(1).signals).toEqual([]);
    expect(infos()).toContain(
      `Served file casamoda/walker.js v4 placed (sha256 ${short(w4)})`,
    );
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 4, last: null },
    });
  });

  it("forks a boot with an empty cache at the cap with the archive's copy while the named web file is held, then places that file with no restart", async () => {
    h = await createHarness();
    h.standIn.serve(await servedRelease(1, 3), { current: true });
    const w4 = web(4);
    h.standIn.serveWeb(w4, { current: true });
    const release = h.standIn.hold('served-file');
    const forked = atFork();

    const booted = h.supervisor.boot(answer(1, { [WEB]: 4 }));
    await until(
      () =>
        routes().includes('served-file') &&
        h.clock.waiting().includes(BOOT_WEB_FETCH_MS),
    );
    expect(forked).toEqual([]);
    h.clock.advance(BOOT_WEB_FETCH_MS);

    expect(await booted).toBe('serving');
    expect(forked).toEqual(['archive web v3']);
    release();
    await until(() => servedIn(1) === 'web v4');
    expect(routes()).toEqual([
      'release',
      'archive',
      'served-release',
      'served-file',
    ]);
    expect(h.children).toHaveLength(1);
    expect(h.child(1).signals).toEqual([]);
    expect(infos()).toContain(
      `Served file casamoda/walker.js v4 placed (sha256 ${short(w4)}, was v3)`,
    );
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 4, last: null },
    });
  });

  it('places a newer web release named at a boot from the cache with no restart once its held file comes, the child forking at once with the cached one', async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    await cacheWeb(web(4));
    const w5 = web(5);
    h.standIn.serveWeb(w5, { current: true });
    const release = h.standIn.hold('served-file');
    const forked = atFork();

    expect(await h.supervisor.boot(answer(1, { [WEB]: 5 }))).toBe('serving');

    expect(forked).toEqual(['web v4']);
    await until(() => routes().includes('served-file'));
    expect(servedIn(1)).toBe('web v4');
    release();
    await until(() => servedIn(1) === 'web v5');
    expect(h.children).toHaveLength(1);
    expect(h.child(1).signals).toEqual([]);
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 5, last: null },
    });
    expect(infos()).toContain(
      `Served file casamoda/walker.js v5 placed (sha256 ${short(w5)}, was v4)`,
    );
  });

  it('takes a web release named while v1 serves: its file checked, its document cached after the file, placed by rename with no child stopped or forked', async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 3, last: null },
    });
    const target = join(h.folder, 'releases', '1', ...PATH.split('/'));
    const inode = statSync(target).ino;
    const w4 = web(4);
    h.standIn.serveWeb(w4, { current: true });
    const release = h.standIn.hold('served-file');

    const named = h.supervisor.consider(answer(1, { [WEB]: 4 }));
    await until(() => routes().includes('served-file'));
    expect(await h.cache.documents(WEB)).toEqual([]);
    release();
    await named;

    expect(servedIn(1)).toBe('web v4');
    expect(statSync(target).ino).not.toBe(inode);
    expect(
      (await h.cache.documents(WEB)).map((entry) => entry.document.sequence),
    ).toEqual([4]);
    expect(h.children).toHaveLength(1);
    expect(h.child(1).signals).toEqual([]);
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 4, last: null },
    });
    expect(infos()).toContain(
      `Served file casamoda/walker.js v4 placed (sha256 ${short(w4)}, was v3)`,
    );
  });

  it("forks a server release with the current web release's bytes at its path, not the archive's copy", async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    await cacheWeb(web(4));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serve(await servedRelease(2, 3), { current: true });
    const forked = atFork();

    await h.supervisor.consider(answer(2, { [WEB]: 4 }));

    expect(forked).toEqual(['web v4']);
    expect(h.supervisor.state()).toEqual({
      running: 2,
      last: null,
      served: { [WEB]: { running: 4, last: null } },
    });
  });

  it('places a web release named after a crash restart that served again once its refused re-fetch left the release unmarked, downloading the refused archive once', async () => {
    h = await createHarness();
    const v1 = await servedRelease(1, 3);
    await h.cacheRelease(v1);
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    const cached = join(h.cacheDir, 'artifacts', `${v1.artifact.sha256}.tgz`);
    rmSync(cached);
    const archive = new Uint8Array(v1.archive);
    archive[archive.length >> 1] ^= 0xff;
    h.standIn.serve({ ...v1, archive });

    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));
    h.clock.advance(1000);
    await until(() => h.clock.waiting().includes(2000));
    // A sibling on the shared cache stores a good copy meanwhile.
    async function* good(): AsyncGenerator<Uint8Array> {
      yield v1.archive;
    }
    await h.cache.storeArtifact(good(), v1.artifact, 'archive');
    h.clock.advance(2000);
    await until(
      () => h.children.length === 2 && h.supervisor.state().running === 1,
    );
    const w4 = web(4);
    h.standIn.serveWeb(w4, { current: true });
    await h.supervisor.consider(answer(1, { [WEB]: 4 }));

    expect(servedIn(1)).toBe('web v4');
    expect(routes().filter((route) => route === 'archive')).toEqual([
      'archive',
    ]);
    expect(h.errors()).toEqual([
      'Release v1 exited (code 1), starting it again in 1 s',
      'Release v1 not started on this instance: archive refused (artifact-sha256); starting it again in 2 s',
    ]);
    expect(h.supervisor.state()).toEqual({
      running: 1,
      last: null,
      served: { [WEB]: { running: 4, last: null } },
    });
  });

  it('restarts a crashed child after a web swap on the web release it served', async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serveWeb(web(4), { current: true });
    await h.supervisor.consider(answer(1, { [WEB]: 4 }));
    const forked = atFork();

    await crashAndRestart(1);

    expect(forked).toEqual(['web v4']);
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 4, last: null },
    });
  });

  it.each<[string, boolean, string[]]>([
    ['the held web file comes before the restart', true, ['web v5']],
    ['the held web file comes after the restart', false, ['web v4']],
  ])(
    'ends with the newest web bytes when a crash restart and a web swap meet: %s',
    async (_case, fileFirst, forkedWith) => {
      h = await createHarness();
      await h.cacheRelease(await servedRelease(1, 3));
      await cacheWeb(web(4));
      expect(await h.supervisor.boot(answer(1))).toBe('serving');
      h.standIn.serveWeb(web(5), { current: true });
      const release = h.standIn.hold('served-file');
      const named = h.supervisor.consider(answer(1, { [WEB]: 5 }));
      await until(() => routes().includes('served-file'));
      const forked = atFork();

      h.child(1).exit(1);
      await until(() => h.clock.waiting().includes(1000));
      if (fileFirst) {
        release();
        await named;
      }
      h.clock.advance(1000);
      await until(
        () => h.children.length === 2 && h.supervisor.state().running === 1,
      );
      if (!fileFirst) {
        release();
        await named;
      }

      expect(forked).toEqual(forkedWith);
      expect(servedIn(1)).toBe('web v5');
      expect(h.supervisor.state().served).toEqual({
        [WEB]: { running: 5, last: null },
      });
    },
  );

  it("starts a server release with the archive's copy when its web file answers 500, writes the line once, and the next check-in places the file with no restart", async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serve(await servedRelease(2, 3), { current: true });
    h.standIn.serveWeb(web(4), { current: true });
    h.standIn.setAnswer('served-file', { status: 500 });
    const forked = atFork();

    await h.supervisor.consider(answer(2, { [WEB]: 4 }));

    expect(forked).toEqual(['archive web v3']);
    expect(h.errors()).toEqual([
      'Served file casamoda/walker.js v4 not fetched (500)',
    ]);
    h.standIn.setAnswer('served-file', undefined);
    await h.supervisor.consider(answer(2, { [WEB]: 4 }));
    expect(servedIn(2)).toBe('web v4');
    expect(h.children.map((child) => child.sequence)).toEqual([1, 2]);
    expect(h.errors()).toHaveLength(1);
  });

  it.each(
    Object.keys(STARTS).flatMap(
      (start): Array<[string, number, string, number]> => [
        [start, 4, 'archive web v5', 5],
        [start, 5, 'web v5', 5],
        [start, 6, 'web v6', 6],
      ],
    ),
  )(
    "lets the entry's sequence decide at %s with web v%d cached and its fetch failing: %s serves",
    async (start, cached, bytes, running) => {
      h = await createHarness();
      h.standIn.setAnswer('served-release', { status: 503 });

      await STARTS[start](cached);
      // The next check-in: the serial chain has drained after it.
      await h.supervisor.consider(answer(2, { [WEB]: 7 }));

      expect(servedIn(2)).toBe(bytes);
      expect(h.supervisor.state().running).toBe(2);
      expect(h.supervisor.state().served).toEqual({
        [WEB]: { running, last: null },
      });
    },
  );

  it('writes the not-fetched line with (404) for a web document the release route does not serve, and marks nothing', async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');

    await h.supervisor.consider(answer(1, { [WEB]: 4 }));

    expect(h.errors()).toEqual([
      'Served file casamoda/walker.js v4 not fetched (404)',
    ]);
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 3, last: null },
    });
    h.standIn.serveWeb(web(4), { current: true });
    await h.supervisor.consider(answer(1, { [WEB]: 4 }));
    expect(servedIn(1)).toBe('web v4');
  });

  it('writes each web deployment its own not-fetched line once while both fail in turn', async () => {
    h = await createHarness();
    const A = 'dep_web_a';
    const B = 'dep_web_b';
    await h.cacheRelease(
      await buildRelease({
        sequence: 1,
        served: [
          { deployment: A, path: 'a/walker.js', sequence: 3 },
          { deployment: B, path: 'b/walker.js', sequence: 3 },
        ],
        files: { 'a/walker.js': 'a v3', 'b/walker.js': 'b v3' },
      }),
    );
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.setAnswer('served-release', { status: 503 });

    await h.supervisor.consider(answer(1, { [A]: 4, [B]: 4 }));
    await h.supervisor.consider(answer(1, { [A]: 4, [B]: 4 }));

    expect(h.errors()).toEqual([
      'Served file a/walker.js v4 not fetched (503)',
      'Served file b/walker.js v4 not fetched (503)',
    ]);
  });

  it.each<[string, () => Promise<void>, number, RemoteLast, string, string[]]>([
    [
      'file holds other bytes',
      async () => {
        h.standIn.serveWeb(tampered(5), { current: true });
      },
      3,
      { sequence: 5, state: 'refused', check: 'artifact-sha256' },
      'Served file casamoda/walker.js v5 refused (artifact-sha256)',
      [],
    ],
    [
      'sequence is below the cached one',
      async () => {
        await cacheWeb(web(4));
        h.standIn.serveWeb(web(3), { current: true });
      },
      4,
      { sequence: 3, state: 'refused', check: 'sequence' },
      'Served file casamoda/walker.js v3 refused (sequence)',
      // v5 is still asked for; the v3 served again is refused with no line.
      ['served-release'],
    ],
    [
      'document names another deployment',
      async () => {
        const w5 = web(5);
        const documentBytes = new TextEncoder().encode(
          JSON.stringify({ ...w5.document, deployment: 'dep_other' }),
        );
        h.standIn.serveWeb({ ...w5, documentBytes }, { current: true });
      },
      3,
      { sequence: 5, state: 'refused', check: 'deployment' },
      'Served file casamoda/walker.js v5 refused (deployment)',
      [],
    ],
  ])(
    'refuses a web release whose %s, leaves the served file and fetches that sequence no more',
    async (_case, setUp, running, refusal, line, askedAgain) => {
      h = await createHarness();
      await h.cacheRelease(await servedRelease(1, 3));
      await setUp();
      expect(await h.supervisor.boot(answer(1))).toBe('serving');
      const before = servedIn(1);

      await h.supervisor.consider(answer(1, { [WEB]: 5 }));
      const asked = routes().length;
      await h.supervisor.consider(answer(1, { [WEB]: 5 }));

      expect(h.errors()).toEqual([line]);
      expect(h.supervisor.state().served).toEqual({
        [WEB]: { running, last: refusal },
      });
      expect(servedIn(1)).toBe(before);
      expect(routes().slice(asked)).toEqual(askedAgain);
    },
  );

  it('falls back at a cold boot to the lower server release with the newest cached web release at the path its own document lists', async () => {
    h = await createHarness();
    await h.cacheRelease(
      await buildRelease({
        sequence: 2,
        served: [{ deployment: WEB, path: PATH, sequence: 1 }],
        files: { [PATH]: 'archive web v1' },
      }),
    );
    await h.cacheRelease(
      await buildRelease({
        sequence: 3,
        served: [{ deployment: WEB, path: 'js/walker.js', sequence: 1 }],
        files: { 'js/walker.js': 'archive web v1' },
      }),
    );
    h.behaviours.set(3, { start: 'exit' });
    await cacheWeb(web(1));
    await h.standIn.stop();
    const forked = atFork();

    expect(await h.supervisor.boot(undefined)).toBe('serving');

    expect(h.supervisor.state().running).toBe(2);
    expect(forked).toEqual(['nothing', 'web v1']);
    expect(existsSync(join(h.folder, 'releases', '2', 'js'))).toBe(false);
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 1, last: null },
    });
  });

  it('fetches nothing for a web deployment the running release does not list', async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serveWeb(
      buildWebRelease({ deployment: 'dep_unlisted', sequence: 4, script: 'x' }),
      { current: true },
    );

    await h.supervisor.consider(answer(1, { dep_unlisted: 4 }));

    expect(routes()).toEqual([]);
    expect(h.errors()).toEqual([]);
  });

  it("refuses a server release whose archive holds a link at a listed path's parent, and the serving child stays", async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serve(await withLinkedParent(await servedRelease(2, 3)), {
      current: true,
    });

    await h.supervisor.consider(answer(2));

    expect(h.supervisor.state()).toEqual({
      running: 1,
      last: { sequence: 2, state: 'refused', check: 'archive-entry' },
    });
    expect(h.errors()).toEqual(['Release v2 refused (archive-entry)']);
    expect(h.children).toHaveLength(1);
    expect(h.child(1).signals).toEqual([]);
  });

  it('fetches and caches a web release named while no child runs, and the next extraction places it', async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));
    h.standIn.serveWeb(web(4), { current: true });

    await h.supervisor.consider(answer(1, { [WEB]: 4 }));

    expect(
      (await h.cache.documents(WEB)).map((entry) => entry.document.sequence),
    ).toEqual([4]);
    expect(servedIn(1)).toBe('archive web v3');
    const forked = atFork();
    h.clock.advance(1000);
    await until(() => h.children.length === 2);
    expect(forked).toEqual(['web v4']);
  });

  it.each<[string, (folder: string) => () => void, string]>([
    [
      'its folder is a link now',
      (folder) => {
        rmSync(folder, { recursive: true, force: true });
        symlinkSync('elsewhere', folder);
        return () => {};
      },
      'Served file casamoda/walker.js v4 not placed (archive-entry)',
    ],
    [
      'its folder cannot be written',
      (folder) => {
        chmodSync(folder, 0o500);
        return () => chmodSync(folder, 0o700);
      },
      'Served file casamoda/walker.js v4 not placed: EACCES',
    ],
  ])(
    'writes one line and marks nothing when a web release cannot be placed into the running folder because %s, and the next extraction places it',
    async (_case, change, line) => {
      h = await createHarness();
      await h.cacheRelease(await servedRelease(1, 3));
      expect(await h.supervisor.boot(answer(1))).toBe('serving');
      const undo = change(join(h.folder, 'releases', '1', 'casamoda'));
      h.standIn.serveWeb(web(4), { current: true });

      try {
        await h.supervisor.consider(answer(1, { [WEB]: 4 }));
      } finally {
        undo();
      }

      expect(h.errors()).toEqual([line]);
      expect(h.supervisor.state().served).toEqual({
        [WEB]: { running: 3, last: null },
      });
      const forked = atFork();
      await crashAndRestart(1);
      expect(forked).toEqual(['web v4']);
    },
  );

  it.each(['__proto__', 'toString'])(
    'never reads %s, a name the answer does not hold, as a web part the answer names',
    async (name) => {
      h = await createHarness();
      await h.cacheRelease(
        await buildRelease({
          sequence: 1,
          served: [{ deployment: name, path: PATH, sequence: 3 }],
          files: { [PATH]: 'archive web v3' },
        }),
      );
      expect(await h.supervisor.boot(answer(1))).toBe('serving');

      await h.supervisor.consider(answer(1, { [WEB]: 4 }));

      expect(routes()).toEqual([]);
      expect(h.errors()).toEqual([]);
      expect(servedIn(1)).toBe('archive web v3');
    },
  );

  it('reports a web part named __proto__ as an own entry of served, as the wire carries it', async () => {
    h = await createHarness();
    await h.cacheRelease(
      await buildRelease({
        sequence: 1,
        served: [{ deployment: '__proto__', path: PATH, sequence: 3 }],
        files: { [PATH]: 'archive web v3' },
      }),
    );
    expect(await h.supervisor.boot(answer(1))).toBe('serving');

    const { served } = h.supervisor.state();

    expect(Object.getPrototypeOf(served)).toBe(Object.prototype);
    expect(JSON.stringify(served)).toBe(
      '{"__proto__":{"running":3,"last":null}}',
    );
  });

  it('places two listed paths under one parent the archive does not hold', async () => {
    h = await createHarness();
    const A = 'dep_web_a';
    const B = 'dep_web_b';
    await h.cacheRelease(
      await buildRelease({
        sequence: 1,
        served: [
          { deployment: A, path: 'js/a.js', sequence: 1 },
          { deployment: B, path: 'js/b.js', sequence: 1 },
        ],
      }),
    );
    for (const deployment of [A, B])
      await cacheWeb(
        buildWebRelease({ deployment, sequence: 1, script: `${deployment}` }),
      );

    expect(await h.supervisor.boot(answer(1))).toBe('serving');

    expect([servedIn(1, 'js/a.js'), servedIn(1, 'js/b.js')]).toEqual([A, B]);
    expect(h.errors()).toEqual([]);
  });

  it('writes the not-placed line with the code alone when the walk of a listed path fails at an extraction, and the release starts', async () => {
    h = await createHarness();
    // A folder name past the file system's 255 characters: lstat answers ENAMETOOLONG.
    const long = `${'x'.repeat(256)}/walker.js`;
    await h.cacheRelease(
      await buildRelease({
        sequence: 1,
        served: [{ deployment: WEB, path: long, sequence: 3 }],
      }),
    );
    await cacheWeb(web(4));

    expect(await h.supervisor.boot(answer(1))).toBe('serving');

    expect(h.errors()).toEqual([
      `Served file ${long} v4 not placed: ENAMETOOLONG`,
    ]);
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 3, last: null },
    });
  });

  describe('a cache fault on a web part', () => {
    let armed = false;
    /** The harness, its cache's check and copy of a web file throwing EIO while armed, as a failing disk does. */
    async function faulty(): Promise<void> {
      armed = false;
      h = await createHarness({
        cache: (real) => ({
          ...real,
          async checkArtifact(artifact, kind) {
            if (armed && kind === 'file') throw fault('EIO');
            return real.checkArtifact(artifact, kind);
          },
          async placeFile(artifact, target) {
            if (armed) throw fault('EIO');
            return real.placeFile(artifact, target);
          },
        }),
      });
      await h.cacheRelease(await servedRelease(1, 3));
    }

    it.each<[string, () => Promise<void>, string[]]>([
      [
        'an extraction',
        async () => {
          await cacheWeb(web(4));
          armed = true;
          expect(await h.supervisor.boot(answer(1))).toBe('serving');
        },
        ['Served file casamoda/walker.js v4 not placed: EIO'],
      ],
      [
        'a crash restart',
        async () => {
          await cacheWeb(web(4));
          expect(await h.supervisor.boot(answer(1))).toBe('serving');
          armed = true;
          await crashAndRestart(1);
        },
        [
          'Release v1 exited (code 1), starting it again in 1 s',
          'Served file casamoda/walker.js v4 not placed: EIO',
        ],
      ],
      [
        'a placement into the running folder',
        async () => {
          expect(await h.supervisor.boot(answer(1))).toBe('serving');
          await cacheWeb(web(4));
          armed = true;
          await h.supervisor.consider(answer(1));
        },
        ['Served file casamoda/walker.js v4 not placed: EIO'],
      ],
      [
        'a web fetch',
        async () => {
          expect(await h.supervisor.boot(answer(1))).toBe('serving');
          h.standIn.serveWeb(web(5), { current: true });
          armed = true;
          await h.supervisor.consider(answer(1, { [WEB]: 5 }));
        },
        ['Served file casamoda/walker.js v5 not fetched (EIO)'],
      ],
    ])(
      "serves the archive's copy with one line naming the code when the web file's check fails at %s",
      async (_case, run, lines) => {
        await faulty();

        await run();
        // The next check-in: its web consider writes no line again.
        await h.supervisor.consider(answer(1));

        expect(h.supervisor.state().running).toBe(1);
        expect(servedIn(1)).toBe('archive web v3');
        expect(h.errors()).toEqual(lines);
      },
    );
  });

  it('takes the named web release once the route serves it, after the route served a refused older one', async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serveWeb(tampered(5), { current: true });
    await h.supervisor.consider(answer(1, { [WEB]: 6 }));
    h.standIn.serveWeb(web(6), { current: true });

    await h.supervisor.consider(answer(1, { [WEB]: 6 }));

    expect(servedIn(1)).toBe('web v6');
    expect(h.errors()).toEqual([
      'Served file casamoda/walker.js v5 refused (artifact-sha256)',
    ]);
  });

  it("clears a web part's refusal once a newer web release is placed", async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serveWeb(tampered(5), { current: true });
    await h.supervisor.consider(answer(1, { [WEB]: 5 }));
    h.standIn.serveWeb(web(6), { current: true });

    await h.supervisor.consider(answer(1, { [WEB]: 6 }));

    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 6, last: null },
    });
  });

  it('keeps the served file with one line and marks nothing when the cached web file is gone between its check and its copy', async () => {
    let gone = false;
    h = await createHarness({
      cache: (real) => ({
        ...real,
        placeFile: async (artifact, target) =>
          gone ? false : real.placeFile(artifact, target),
      }),
    });
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serveWeb(web(4), { current: true });
    gone = true;

    await h.supervisor.consider(answer(1, { [WEB]: 4 }));

    expect(h.errors()).toEqual([
      'Served file casamoda/walker.js v4 not placed: not in the cache',
    ]);
    expect(servedIn(1)).toBe('archive web v3');
    expect(h.supervisor.state().served).toEqual({
      [WEB]: { running: 3, last: null },
    });
    gone = false;
    await h.supervisor.consider(answer(1, { [WEB]: 4 }));
    expect(servedIn(1)).toBe('web v4');
  });

  it("never lets a web part's secretsSince reach the server release's floor at a fallback", async () => {
    h = await createHarness();
    await h.cacheRelease(await servedRelease(1, 1));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serveWeb(
      buildWebRelease({
        deployment: WEB,
        sequence: 3,
        script: 'web v3',
        secretsSince: 3,
      }),
      { current: true },
    );
    await h.supervisor.consider(answer(1, { [WEB]: 3 }));
    h.standIn.serve(await servedRelease(2, 1), { current: true });
    h.behaviours.set(2, { start: 'exit' });

    await h.supervisor.consider(answer(2, { [WEB]: 3 }));

    expect(h.supervisor.state().running).toBe(1);
    expect(servedIn(1)).toBe('web v3');
    expect(h.errors()).toEqual([
      'Release v2 exited before it was ready (code 1), refused on this instance',
    ]);
  });

  it('reads each web part once and hashes no web file at a check-in where nothing changed', async () => {
    const counts = { documents: 0, hashes: 0 };
    h = await createHarness({
      cache: (real) => ({
        ...real,
        async documents(deployment) {
          if (deployment === WEB) counts.documents += 1;
          return real.documents(deployment);
        },
        async checkArtifact(artifact, kind) {
          if (kind === 'file') counts.hashes += 1;
          return real.checkArtifact(artifact, kind);
        },
      }),
    });
    await h.cacheRelease(await servedRelease(1, 3));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    h.standIn.serveWeb(web(4), { current: true });
    await h.supervisor.consider(answer(1, { [WEB]: 4 }));
    expect(servedIn(1)).toBe('web v4');
    counts.documents = 0;
    counts.hashes = 0;

    await h.supervisor.consider(answer(1, { [WEB]: 4 }));

    expect(counts).toEqual({ documents: 1, hashes: 0 });
  });

  it('writes the not-fetched line with (304) when the route answers 304 for a cached web document gone since', async () => {
    let hidden = false;
    h = await createHarness({
      cache: (real) => ({
        ...real,
        documents: async (deployment) =>
          hidden && deployment === WEB ? [] : real.documents(deployment),
      }),
    });
    await h.cacheRelease(await servedRelease(1, 3));
    await cacheWeb(web(4));
    h.standIn.serveWeb(web(4), { current: true });
    expect(await h.supervisor.boot(answer(1))).toBe('serving');
    hidden = true;

    await h.supervisor.consider(answer(1, { [WEB]: 5 }));

    expect(h.errors()).toEqual([
      'Served file casamoda/walker.js v5 not fetched (304)',
    ]);
  });

  it('reports no served key while the running release lists no web part', async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    expect(await h.supervisor.boot(answer(1))).toBe('serving');

    expect(Object.keys(h.supervisor.state())).toEqual(['running', 'last']);
  });
});
