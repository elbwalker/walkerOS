import { chmodSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { openSealedSecretSet } from '@walkeros/server-core';
import { testCredential } from '../helpers/credential.js';
import {
  FIXTURE_DEPLOYMENT,
  buildRelease,
  type ReleaseFixture,
} from '../helpers/release-fixture.js';
import {
  answer,
  createHarness,
  until,
  type Harness,
} from '../helpers/supervisor-harness.js';

let h: Harness;

afterEach(async () => {
  await h.close();
});

/** Flips the last byte of a cached artifact, as a damaged disk would. */
function damage(sha256: string): void {
  const path = join(h.cacheDir, 'artifacts', `${sha256}.tgz`);
  const bytes = readFileSync(path);
  bytes[bytes.length - 1] ^= 0xff;
  writeFileSync(path, bytes);
}

describe('boot', () => {
  it.each([
    [
      'names no release',
      answer(null),
      'No release to run: the cache is empty and the app names no release',
    ],
    [
      'did not answer',
      undefined,
      'No release to run: the cache is empty and the app did not answer',
    ],
  ] as const)(
    'answers nothing with an empty cache when the app %s',
    async (_name, named, line) => {
      h = await createHarness();

      expect(await h.supervisor.boot(named)).toBe('nothing');

      expect(h.errors()).toEqual([line]);
      expect(h.children).toEqual([]);
    },
  );

  it('says why it waits when the document route answers 404 for the named release', async () => {
    h = await createHarness();

    expect(await h.supervisor.boot(answer(1))).toBe('waiting');

    expect(h.errors()).toEqual(['Release document not fetched (404)']);
    expect(h.port.open).toBe(true);
  });

  it('fetches, checks and starts the named release with an empty cache', async () => {
    h = await createHarness();
    const v1 = await buildRelease({ sequence: 1 });
    h.standIn.serve(v1, { current: true });

    expect(await h.supervisor.boot(answer(1))).toBe('serving');

    expect(h.supervisor.state()).toEqual({ running: 1, last: null });
    expect(h.child(1).start.flowFile).toBe(
      join(h.folder, 'releases', '1', 'flow.mjs'),
    );
    expect(h.standIn.requests.map((request) => request.route)).toEqual([
      'release',
      'archive',
    ]);
  });

  it.each<[string, () => Promise<void>, number[]]>([
    [
      'the document and the archive at a boot with an empty cache',
      async () => {
        h.standIn.serve(await buildRelease({ sequence: 1 }), { current: true });
        await h.supervisor.boot(answer(1));
      },
      [200, 200],
    ],
    [
      'the same document asked again',
      async () => {
        h.standIn.serve(await buildRelease({ sequence: 1 }), { current: true });
        await h.supervisor.boot(answer(1));
        await h.supervisor.consider(answer(2));
      },
      [200, 200, 304],
    ],
  ])('hands the link the status of %s', async (_case, run, statuses) => {
    h = await createHarness();

    await run();

    expect(h.answers).toEqual(statuses.map((status) => ({ status })));
  });

  it('waits with a line when a step of the boot fails on this instance', async () => {
    h = await createHarness();
    h.standIn.serve(await buildRelease({ sequence: 1 }), { current: true });
    const documents = join(h.cacheDir, 'documents');
    chmodSync(documents, 0o500);
    try {
      expect(await h.supervisor.boot(answer(1))).toBe('waiting');
    } finally {
      chmodSync(documents, 0o700);
    }

    expect(h.port.open).toBe(true);
    expect(h.errors()).toEqual([
      expect.stringMatching(/^Release step failed: EACCES: /),
    ]);
  });

  it('skips a cached release whose archive is not in the cache, with one line, starts the one below at once and leaves the newer one to the consider', async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    const v2 = await buildRelease({ sequence: 2 });
    await h.cache.storeDocument(v2.documentBytes, v2.documentSha256);
    h.standIn.serve(v2, { current: true });

    expect(await h.supervisor.boot(answer(2))).toBe('serving');

    expect(h.children.map((child) => child.sequence)).toEqual([1]);
    expect(h.errors()).toEqual([
      'Release v2 skipped (its archive is not in the cache)',
    ]);
    await until(() => h.supervisor.state().running === 2);
    expect(h.children.map((child) => child.sequence)).toEqual([1, 2]);
  });

  describe('with the app down', () => {
    it('starts the highest good release at or above the floor', async () => {
      h = await createHarness();
      for (const [sequence, secretsSince] of [
        [1, 1],
        [2, 2],
        [3, 2],
      ])
        await h.cacheRelease(await buildRelease({ sequence, secretsSince }));
      await h.standIn.stop();

      expect(await h.supervisor.boot(undefined)).toBe('serving');

      expect(h.supervisor.state().running).toBe(3);
      expect(h.children.map((child) => child.sequence)).toEqual([3]);
    });

    it('removes a damaged cached artifact with its line and starts the next lower good one', async () => {
      h = await createHarness();
      const v2 = await buildRelease({ sequence: 2 });
      const v3 = await buildRelease({ sequence: 3 });
      await h.cacheRelease(v2);
      await h.cacheRelease(v3);
      damage(v3.artifact.sha256);
      await h.standIn.stop();

      expect(await h.supervisor.boot(undefined)).toBe('serving');

      expect(h.supervisor.state().running).toBe(2);
      expect(h.errors()).toContain(
        `Cached artifact sha256 ${v3.artifact.sha256.slice(0, 12)} failed its check and was removed`,
      );
    });

    it('waits when the newest release needs its walkerOS secrets from the app, and starts it once the app answers', async () => {
      h = await createHarness();
      const v3 = await buildRelease({
        sequence: 3,
        secrets: { app: ['API_KEY'], server: [] },
        secretsSince: 3,
      });
      await h.cacheRelease(await buildRelease({ sequence: 2 }));
      await h.cacheRelease(v3);
      await h.standIn.stop();

      expect(await h.supervisor.boot(undefined)).toBe('waiting');

      expect(h.port.open).toBe(true);
      expect(h.children).toEqual([]);
      expect(h.errors()).toContain(
        'No release can run: the walkerOS secrets of v3 need the app; /ready answers 503',
      );

      h.standIn.serve(v3, { current: true });
      await h.standIn.start();
      await h.supervisor.consider(answer(3));

      expect(h.supervisor.state().running).toBe(3);
      expect(h.child(3).start.values).toEqual({
        API_KEY: 'value-api_key-v3',
      });
    });
  });

  it('refuses a cached release whose server secret is missing here, and starts the next good one', async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    await h.cacheRelease(
      await buildRelease({
        sequence: 2,
        secrets: { app: [], server: ['SALT', 'GA4_API_SECRET_2024_PROD'] },
      }),
    );

    expect(await h.supervisor.boot(undefined)).toBe('serving');

    expect(h.supervisor.state()).toEqual({
      running: 1,
      last: {
        sequence: 2,
        state: 'refused',
        check: 'secret-missing',
        names: ['SALT', 'GA4_API_SECRET_2024_PROD'],
      },
    });
  });

  it('refuses a cached release whose server secret is missing here at the not-ready fallback too', async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    await h.cacheRelease(
      await buildRelease({
        sequence: 2,
        secrets: { app: [], server: ['SALT'] },
      }),
    );
    await h.cacheRelease(await buildRelease({ sequence: 3 }));
    h.behaviours.set(3, { start: 'exit' });

    expect(await h.supervisor.boot(undefined)).toBe('serving');

    expect(h.children.map((child) => child.sequence)).toEqual([3, 1]);
    expect(h.supervisor.state().running).toBe(1);
    expect(h.errors()).toContain('Release v2 refused (secret-missing: SALT)');
  });

  it('considers the named release at once after a waiting boot', async () => {
    h = await createHarness();
    await h.cacheRelease(
      await buildRelease({
        sequence: 1,
        secrets: { app: [], server: ['SALT'] },
      }),
    );
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });

    expect(await h.supervisor.boot(answer(2))).toBe('waiting');

    await until(() => h.supervisor.state().running === 2);
  });

  it('considers the named release at once after serving below it, and marks the sequence the document names', async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    const v4 = await buildRelease({ sequence: 4 });
    h.standIn.serve(v4, { current: true });

    expect(await h.supervisor.boot(answer(3))).toBe('serving');

    await until(() => h.supervisor.state().running === 4);
    expect(h.lines.map((line) => line.message)).toContain(
      `Release v4 starting (sha256 ${v4.artifact.sha256.slice(0, 12)}, flow shop)`,
    );
  });
});

describe('a boot with walkerOS secrets in the cache', () => {
  afterEach(() => {
    expect(h.filesHoldingSecrets()).toEqual([]);
  });

  /** v2 with one walkerOS secret, its document and archive cached. */
  async function cachedV2(): Promise<ReleaseFixture> {
    const v2 = await buildRelease({
      sequence: 2,
      secrets: { app: ['API_KEY'], server: [] },
    });
    await h.cacheRelease(v2);
    return v2;
  }

  function sealedPath(keyId: string, sequence: number): string {
    return join(h.cacheDir, 'secrets', keyId, `${sequence}.jwe`);
  }

  /** The set with one character of its ciphertext changed: still base64url, no longer sealed. */
  function damagedCopy(sealed: Uint8Array): Uint8Array {
    const parts = new TextDecoder().decode(sealed).split('.');
    parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`;
    return new TextEncoder().encode(parts.join('.'));
  }

  function routes(): Array<string | undefined> {
    return h.standIn.requests.map((request) => request.route);
  }

  /** The values the runner's own key opens from the cached set. */
  async function cachedValues(
    sequence: number,
  ): Promise<Record<string, string>> {
    const sealed = await h.cache.sealedSet(h.credential.enc.kid, sequence);
    if (!sealed) throw new Error(`no sealed set of v${sequence} cached`);
    return openSealedSecretSet(sealed, {
      key: h.credential.enc,
      deployment: FIXTURE_DEPLOYMENT,
      sequence,
    });
  }

  // The app is up and would serve the set: only its requests show a call.
  it('starts a cached release from its sealed set and asks the app nothing', async () => {
    h = await createHarness();
    const v2 = await cachedV2();
    await h.cacheSealedSet(v2);
    h.standIn.serve(v2, { current: true });

    expect(await h.supervisor.boot(undefined)).toBe('serving');

    expect(h.child(2).start.values).toEqual({ API_KEY: 'value-api_key-v2' });
    expect(h.errors()).toEqual([]);
    expect(h.standIn.requests).toEqual([]);
  });

  it('waits for the app on a set sealed to another key, caches its own under its key id and leaves the other folder as it was', async () => {
    h = await createHarness();
    const v2 = await cachedV2();
    const { credential: before } = await testCredential('deployment', {
      id: FIXTURE_DEPLOYMENT,
    });
    const theirs = await h.cacheSealedSet(v2, before.enc);
    await h.standIn.stop();

    expect(await h.supervisor.boot(undefined)).toBe('waiting');
    expect(h.children).toEqual([]);
    expect(h.errors()).toContain(
      'No release can run: the walkerOS secrets of v2 need the app; /ready answers 503',
    );

    h.standIn.serve(v2, { current: true });
    await h.standIn.start();
    await h.supervisor.consider(answer(2));

    expect(h.supervisor.state().running).toBe(2);
    expect(h.child(2).start.values).toEqual(v2.values);
    expect(await cachedValues(2)).toEqual(v2.values);
    expect(readdirSync(join(h.cacheDir, 'secrets', before.enc.kid))).toEqual([
      '2.jwe',
    ]);
    expect(new Uint8Array(readFileSync(sealedPath(before.enc.kid, 2)))).toEqual(
      theirs,
    );
  });

  it('removes a cached set that does not open with its line, fetches it from the app and caches it anew', async () => {
    h = await createHarness();
    const v2 = await cachedV2();
    const damaged = damagedCopy(await h.cacheSealedSet(v2));
    writeFileSync(sealedPath(h.credential.enc.kid, 2), damaged);
    h.standIn.serve(v2, { current: true });

    expect(await h.supervisor.boot(undefined)).toBe('serving');

    expect(h.errors()).toEqual([
      'Cached walkerOS secrets of v2 did not open and were removed',
    ]);
    expect(routes()).toEqual(['secrets']);
    expect(h.child(2).start.values).toEqual(v2.values);
    const fresh = await h.cache.sealedSet(h.credential.enc.kid, 2);
    expect(fresh).not.toEqual(damaged);
    expect(await cachedValues(2)).toEqual(v2.values);
  });

  it("refuses a set of its own key filed under another sequence's name, fetches the release's own and caches it anew", async () => {
    h = await createHarness();
    const v1 = await buildRelease({
      sequence: 1,
      secrets: { app: ['API_KEY'], server: [] },
    });
    const v2 = await cachedV2();
    writeFileSync(
      sealedPath(h.credential.enc.kid, 2),
      await h.cacheSealedSet(v1),
    );
    h.standIn.serve(v2, { current: true });

    expect(await h.supervisor.boot(undefined)).toBe('serving');

    expect(h.errors()).toEqual([
      'Cached walkerOS secrets of v2 did not open and were removed',
    ]);
    expect(routes()).toEqual(['secrets']);
    expect(h.child(2).start.values).toEqual(v2.values);
    expect(await cachedValues(2)).toEqual(v2.values);
  });

  it('takes a set it cannot read as not cached, with one line, and starts the next lower release while the app is down', async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    const v2 = await cachedV2();
    await h.cacheSealedSet(v2);
    const path = sealedPath(h.credential.enc.kid, 2);
    await h.standIn.stop();
    chmodSync(path, 0o000);
    let booted: string;
    try {
      booted = await h.supervisor.boot(undefined);
    } finally {
      chmodSync(path, 0o600);
    }

    expect(booted).toBe('serving');
    expect(h.children.map((child) => child.sequence)).toEqual([1]);
    expect(h.errors()).toEqual([
      'Cached walkerOS secrets of v2 not read: EACCES',
      'Release v2 walkerOS secrets not fetched (transport)',
    ]);
  });

  it('fetches a set that does not open and cannot be removed from the app, with one line for the removal and one for the store', async () => {
    h = await createHarness();
    const v2 = await cachedV2();
    writeFileSync(
      sealedPath(h.credential.enc.kid, 2),
      damagedCopy(await h.cacheSealedSet(v2)),
    );
    h.standIn.serve(v2, { current: true });
    const folder = join(h.cacheDir, 'secrets', h.credential.enc.kid);
    chmodSync(folder, 0o500);
    let booted: string;
    try {
      booted = await h.supervisor.boot(undefined);
    } finally {
      chmodSync(folder, 0o700);
    }

    expect(booted).toBe('serving');
    expect(h.errors()).toEqual([
      'Cached walkerOS secrets of v2 did not open and were not removed: EACCES',
      'Release v2 walkerOS secrets not cached: EACCES',
    ]);
    expect(routes()).toEqual(['secrets']);
    expect(h.child(2).start.values).toEqual(v2.values);
  });
});
