import { chmodSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildRelease } from '../helpers/release-fixture.js';
import {
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
      null,
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

    expect(await h.supervisor.boot(1)).toBe('waiting');

    expect(h.errors()).toEqual(['Release document not fetched (404)']);
    expect(h.port.open).toBe(true);
  });

  it('fetches, checks and starts the named release with an empty cache', async () => {
    h = await createHarness();
    const v1 = await buildRelease({ sequence: 1 });
    h.standIn.serve(v1, { current: true });

    expect(await h.supervisor.boot(1)).toBe('serving');

    expect(h.supervisor.state()).toEqual({ running: 1, last: null });
    expect(h.child(1).start.flowFile).toBe(
      join(h.folder, 'releases', '1', 'flow.mjs'),
    );
    expect(h.standIn.requests.map((request) => request.route)).toEqual([
      'release',
      'archive',
    ]);
  });

  it('waits with a line when a step of the boot fails on this instance', async () => {
    h = await createHarness();
    h.standIn.serve(await buildRelease({ sequence: 1 }), { current: true });
    const documents = join(h.cacheDir, 'documents');
    chmodSync(documents, 0o500);
    try {
      expect(await h.supervisor.boot(1)).toBe('waiting');
    } finally {
      chmodSync(documents, 0o700);
    }

    expect(h.port.open).toBe(true);
    expect(h.errors()).toEqual([
      expect.stringMatching(/^Release step failed: EACCES: /),
    ]);
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
      await h.supervisor.consider(3);

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

    expect(await h.supervisor.boot(2)).toBe('waiting');

    await until(() => h.supervisor.state().running === 2);
  });

  it('considers the named release at once after serving below it, and marks the sequence the document names', async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    const v4 = await buildRelease({ sequence: 4 });
    h.standIn.serve(v4, { current: true });

    expect(await h.supervisor.boot(3)).toBe('serving');

    await until(() => h.supervisor.state().running === 4);
    expect(h.lines.map((line) => line.message)).toContain(
      `Release v4 starting (sha256 ${v4.artifact.sha256.slice(0, 12)}, flow shop)`,
    );
  });
});
