import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { RefusalCheck } from '@walkeros/core';
import { errorSinkPath } from '../../error-sink.js';
import {
  archiveOf,
  buildRelease,
  defaultFlowSource,
  type ReleaseFixture,
} from '../helpers/release-fixture.js';
import { sha256Hex } from '../../remote/release-document.js';
import {
  TOKEN,
  createHarness,
  settle,
  until,
  withDocument,
  type Harness,
} from '../helpers/supervisor-harness.js';

let h: Harness;

afterEach(async () => {
  await h.close();
});

/** v1 from the cache, ready and serving. */
async function serveV1(): Promise<ReleaseFixture> {
  const v1 = await buildRelease({ sequence: 1 });
  await h.cacheRelease(v1);
  expect(await h.supervisor.boot(1)).toBe('serving');
  return v1;
}

/** A fixture around another archive, its document naming that archive. */
function withArchive(
  release: ReleaseFixture,
  archive: Uint8Array,
): ReleaseFixture {
  const artifact = { sha256: sha256Hex(archive), bytes: archive.byteLength };
  return {
    ...withDocument(release, (document) => ({ ...document, artifact })),
    archive,
    artifact,
  };
}

function routes(): Array<string | undefined> {
  return h.standIn.requests.map((request) => request.route);
}

describe('the swap', () => {
  it('checks the document, the artifact and the set before v1 stops, then forks v2 after v1 exited', async () => {
    h = await createHarness();
    await serveV1();
    const v2 = await buildRelease({
      sequence: 2,
      secrets: { app: ['API_KEY'], server: [] },
    });
    h.standIn.serve(v2, { current: true });
    let routesAtSigterm: Array<string | undefined> = [];
    const v1Child = h.child(1);
    const kill = v1Child.kill.bind(v1Child);
    v1Child.kill = (signal) => {
      routesAtSigterm = routes();
      kill(signal);
    };

    await h.supervisor.consider(2);

    expect(routesAtSigterm).toEqual(['release', 'archive', 'secrets']);
    const tail = h.events.slice(h.events.indexOf('SIGTERM v1'));
    expect(tail).toEqual([
      'SIGTERM v1',
      'exit v1',
      'port open',
      'port close',
      'spawn v2',
    ]);
    expect(h.supervisor.state()).toEqual({ running: 2, last: null });
    expect(h.lines.map((line) => line.message)).toContain(
      `Release v2 running (sha256 ${v2.artifact.sha256.slice(0, 12)}, flow shop, was v1)`,
    );
    expect(existsSync(join(h.folder, 'releases', '1'))).toBe(false);
    expect(existsSync(join(h.folder, 'releases', '2', 'flow.mjs'))).toBe(true);
  });

  it.each<
    [string, () => Promise<ReleaseFixture>, RefusalCheck, string[] | undefined]
  >([
    [
      'another deployment',
      () => buildRelease({ sequence: 2, deployment: 'dep_other' }),
      'deployment',
      undefined,
    ],
    [
      'a lower sequence',
      async () => {
        await h.cacheRelease(await buildRelease({ sequence: 3 }));
        return buildRelease({ sequence: 2 });
      },
      'sequence',
      undefined,
    ],
    [
      'the same sequence with other bytes',
      async () => {
        await h.cacheRelease(await buildRelease({ sequence: 2 }));
        return buildRelease({ sequence: 2, flowName: 'shop two' });
      },
      'sequence',
      undefined,
    ],
    [
      'a release id off its pattern',
      () => buildRelease({ sequence: 2, release: 'dv_Upper' }),
      'release-id',
      undefined,
    ],
    [
      'another document version',
      async () =>
        withDocument(await buildRelease({ sequence: 2 }), (document) => ({
          ...document,
          version: 2,
        })),
      'document-version',
      undefined,
    ],
    [
      'a field of the wrong type',
      async () =>
        withDocument(await buildRelease({ sequence: 2 }), (document) => ({
          ...document,
          flowName: 7,
        })),
      'document-format',
      undefined,
    ],
    [
      'a document above 64 KiB',
      async () =>
        withDocument(await buildRelease({ sequence: 2 }), (document) => ({
          ...document,
          padding: 'x'.repeat(70_000),
        })),
      'document-size',
      undefined,
    ],
    [
      'an archive with other bytes',
      async () => {
        const v2 = await buildRelease({ sequence: 2 });
        const flipped = new Uint8Array(v2.archive);
        flipped[flipped.length - 1] ^= 0xff;
        return { ...v2, archive: flipped };
      },
      'artifact-sha256',
      undefined,
    ],
    [
      'an archive longer than named',
      async () => {
        const v2 = await buildRelease({ sequence: 2 });
        const longer = new Uint8Array(v2.archive.byteLength + 1);
        longer.set(v2.archive);
        return { ...v2, archive: longer };
      },
      'artifact-bytes',
      undefined,
    ],
    [
      'an archive without flow.mjs',
      async () =>
        withArchive(
          await buildRelease({ sequence: 2 }),
          await archiveOf({ 'other.mjs': 'export default 1;' }),
        ),
      'archive-entry',
      undefined,
    ],
    [
      'a walkerOS secret already set here',
      () =>
        buildRelease({
          sequence: 2,
          secrets: { app: ['API_KEY'], server: [] },
        }),
      'secret-in-env',
      ['API_KEY'],
    ],
    [
      'a reserved secret name',
      () =>
        buildRelease({
          sequence: 2,
          secrets: { app: ['NODE_OPTIONS'], server: [] },
        }),
      'secret-reserved',
      ['NODE_OPTIONS'],
    ],
    [
      'a server name every object inherits',
      () =>
        buildRelease({
          sequence: 2,
          secrets: { app: [], server: ['__proto__'] },
        }),
      'secret-missing',
      ['__proto__'],
    ],
    [
      'a server secret missing here',
      () =>
        buildRelease({ sequence: 2, secrets: { app: [], server: ['SALT'] } }),
      'secret-missing',
      ['SALT'],
    ],
    [
      'a secret set for another sequence',
      async () => {
        const v2 = await buildRelease({
          sequence: 2,
          secrets: { app: ['TOKEN_B'], server: [] },
        });
        return {
          ...v2,
          secretSet: (await buildRelease({ sequence: 3 })).secretSet,
        };
      },
      'secret-set',
      undefined,
    ],
    [
      'a secret set without a name the release names',
      () =>
        buildRelease({
          sequence: 2,
          secrets: { app: ['TOKEN_B'], server: [] },
          values: { OTHER: 'value-other-v2' },
        }),
      'secret-set',
      undefined,
    ],
  ])(
    'refuses %s without touching v1, and takes nothing more for it',
    async (_name, make, check, names) => {
      h = await createHarness({ env: { API_KEY: 'host-value' } });
      await serveV1();
      const v2 = await make();
      h.standIn.serve(v2, { current: true });
      const errorsBefore = h.errors().length;

      await h.supervisor.consider(2);

      expect(h.child(1).signals).toEqual([]);
      expect(h.supervisor.state()).toEqual({
        running: 1,
        last: {
          sequence: 2,
          state: 'refused',
          check,
          ...(names && { names }),
        },
      });
      // A check that refuses before the document's sequence reads names no release.
      const subject =
        check === 'document-version' || check === 'document-size'
          ? 'Release document'
          : 'Release v2';
      expect(h.errors().slice(errorsBefore)).toEqual([
        `${subject} refused (${check}${names ? `: ${names.join(', ')}` : ''})`,
      ]);

      const requests = h.standIn.requests.length;
      const lines = h.lines.length;
      await h.supervisor.consider(2);
      expect(h.standIn.requests).toHaveLength(requests);
      expect(h.lines).toHaveLength(lines);
    },
  );

  it('knows a fetched set even when its release then fails the extraction', async () => {
    h = await createHarness();
    await serveV1();
    h.standIn.serve(
      withArchive(
        await buildRelease({
          sequence: 2,
          secrets: { app: ['API_KEY'], server: [] },
        }),
        await archiveOf({ 'other.mjs': 'export default 1;' }),
      ),
      { current: true },
    );

    await h.supervisor.consider(2);

    expect(h.supervisor.state().last).toEqual({
      sequence: 2,
      state: 'refused',
      check: 'archive-entry',
    });
    expect(h.knownValues.values()).toContain('value-api_key-v2');
  });

  it('caps the names a refusal carries at 20 of 128 characters', async () => {
    h = await createHarness();
    await serveV1();
    const server = Array.from(
      { length: 30 },
      (_, index) => `S${String(index).padStart(2, '0')}_${'X'.repeat(200)}`,
    );
    h.standIn.serve(
      await buildRelease({ sequence: 2, secrets: { app: [], server } }),
      { current: true },
    );

    await h.supervisor.consider(2);

    const cut = server.slice(0, 20).map((name) => name.slice(0, 128));
    expect(h.supervisor.state().last).toEqual({
      sequence: 2,
      state: 'refused',
      check: 'secret-missing',
      names: cut,
    });
    expect(h.errors()).toEqual([
      `Release v2 refused (secret-missing: ${cut.join(', ')})`,
    ]);
  });

  it('starts a secret-only release without an archive request, with its own values', async () => {
    h = await createHarness();
    const secrets = { app: ['API_KEY'], server: [] };
    const source = defaultFlowSource({
      sequence: 2,
      release: 'dv_r2',
      flowName: 'shop',
      names: ['API_KEY'],
    });
    const v2 = await buildRelease({ sequence: 2, secrets, source });
    const v3 = await buildRelease({ sequence: 3, secrets, source });
    expect(v3.artifact).toEqual(v2.artifact);
    await serveV1();
    h.standIn.serve(v2, { current: true });
    await h.supervisor.consider(2);
    h.standIn.serve(v3, { current: true });
    const archives = routes().filter((route) => route === 'archive').length;

    await h.supervisor.consider(3);

    expect(routes().filter((route) => route === 'archive')).toHaveLength(
      archives,
    );
    expect(h.child(3).start.values).toEqual({ API_KEY: 'value-api_key-v3' });
    expect(h.knownValues.values()).toEqual(
      expect.arrayContaining(['value-api_key-v2', 'value-api_key-v3']),
    );
    expect(h.supervisor.state().running).toBe(3);
  });

  it('knows the new and the server values before the fork, and hands them in the start', async () => {
    h = await createHarness({ env: { SALT: 'server-salt-value' } });
    await serveV1();
    const v2 = await buildRelease({
      sequence: 2,
      secrets: { app: ['API_KEY'], server: ['SALT'] },
    });
    h.standIn.serve(v2, { current: true });
    let knownAtFork: readonly string[] = [];
    h.onSpawn = (start) => {
      if (start.sequence === 2) knownAtFork = h.knownValues.values();
    };

    await h.supervisor.consider(2);

    expect(knownAtFork).toEqual(
      expect.arrayContaining(['value-api_key-v2', 'server-salt-value']),
    );
    expect(h.child(2).start.known).toEqual(
      expect.arrayContaining(['value-api_key-v2', 'server-salt-value']),
    );
  });

  it('hands the child its release values, never the token the supervisor masks', async () => {
    h = await createHarness({ env: { SALT: 'server-salt-value' } });
    await serveV1();
    h.standIn.serve(
      await buildRelease({
        sequence: 2,
        secrets: { app: ['API_KEY'], server: ['SALT'] },
      }),
      { current: true },
    );

    await h.supervisor.consider(2);

    expect(h.child(2).start.known).toEqual(
      expect.arrayContaining(['value-api_key-v2', 'server-salt-value']),
    );
    expect(h.child(2).start.known).not.toContain(TOKEN);
    expect(h.child(1).start.known).not.toContain(TOKEN);
    expect(h.knownValues.values()).toContain(TOKEN);
  });

  it('takes a consider during the swap after the new child is ready, never two children at once', async () => {
    h = await createHarness();
    await serveV1();
    const v2 = await buildRelease({ sequence: 2 });
    const v3 = await buildRelease({ sequence: 3 });
    h.standIn.serve(v2, { current: true });
    h.behaviours.set(2, { start: 'wait' });
    let most = 0;
    const count = () => {
      most = Math.max(most, h.alive().length);
    };
    const timer = setInterval(count, 1);

    const toV2 = h.supervisor.consider(2);
    await until(() => h.children.some((child) => child.sequence === 2));
    h.standIn.serve(v3, { current: true });
    const toV3 = h.supervisor.consider(3);
    await settle();
    expect(h.children.some((child) => child.sequence === 3)).toBe(false);

    h.child(2).ready();
    await Promise.all([toV2, toV3]);
    clearInterval(timer);
    count();

    expect(h.supervisor.state().running).toBe(3);
    expect(h.events.indexOf('exit v2')).toBeLessThan(
      h.events.indexOf('spawn v3'),
    );
    expect(most).toBe(1);
  });

  it('follows the archive redirect without the token', async () => {
    h = await createHarness();
    await serveV1();
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    h.standIn.redirectArchives(true);

    await h.supervisor.consider(2);

    const archive = h.standIn.requests.find(
      (request) => request.route === 'archive',
    );
    const storage = h.standIn.requests.find(
      (request) => request.route === 'storage',
    );
    expect(archive?.headers.authorization).toBe(
      `Bearer stand-in-token-for-tests`,
    );
    expect(storage?.headers.authorization).toBeUndefined();
    expect(h.supervisor.state().running).toBe(2);
  });

  it.each([
    [
      'a 404 on the secret set',
      'secrets',
      404,
      'Release v2 skipped (the app does not serve its walkerOS secrets)',
    ],
    [
      'a 302 on the document',
      'release',
      302,
      'Release document not fetched (302)',
    ],
  ] as const)(
    'marks nothing for %s and tries again at the next consider',
    async (_name, route, status, line) => {
      h = await createHarness();
      await serveV1();
      h.standIn.serve(
        await buildRelease({
          sequence: 2,
          secrets: { app: ['API_KEY'], server: [] },
        }),
        { current: true },
      );
      h.standIn.setAnswer(route, { status });

      await h.supervisor.consider(2);

      expect(h.supervisor.state()).toEqual({ running: 1, last: null });
      expect(h.errors()).toEqual([line]);
      const asked = routes().filter((seen) => seen === route).length;
      await h.supervisor.consider(2);
      expect(routes().filter((seen) => seen === route)).toHaveLength(asked + 1);
    },
  );

  it('refuses a release as not-ready when the heap is below 64 MB, v1 untouched', async () => {
    h = await createHarness();
    await serveV1();
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    h.heap.fails = true;

    await h.supervisor.consider(2);

    expect(h.child(1).signals).toEqual([]);
    expect(h.supervisor.state()).toEqual({
      running: 1,
      last: { sequence: 2, state: 'failed', check: 'not-ready' },
    });
    expect(h.errors()).toEqual([
      'Release v2 not started on this instance: Heap 36 MB for the flow is below the 64 MB minimum: three quarters of 128 MB granted, less 60 MB for the supervisor',
    ]);
  });

  it('starts a new release with an empty error sink, so the old one is not reported again', async () => {
    h = await createHarness();
    await serveV1();
    const sink = errorSinkPath(h.folder);
    writeFileSync(sink, '{"message":"v1 failed","firstSeen":1}\n');
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    let sinkAtFork: string | undefined = 'unread';
    h.onSpawn = (start) => {
      if (start.sequence === 2)
        sinkAtFork = existsSync(sink) ? readFileSync(sink, 'utf-8') : undefined;
    };

    await h.supervisor.consider(2);

    expect(sinkAtFork ?? '').toBe('');
  });

  it('keeps the error sink for the restart after a crash of the same release', async () => {
    h = await createHarness();
    await serveV1();
    const sink = errorSinkPath(h.folder);
    writeFileSync(sink, '{"message":"v1 failed","firstSeen":1}\n');

    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));
    h.clock.advance(1000);
    await until(() => h.children.length === 2);

    expect(readFileSync(sink, 'utf-8')).toBe(
      '{"message":"v1 failed","firstSeen":1}\n',
    );
  });
});
