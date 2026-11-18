import type { CounterSnapshot } from '../../heartbeat.js';
import { readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  buildRelease,
  defaultFlowSource,
  type ReleaseFixture,
} from '../helpers/release-fixture.js';
import {
  createHarness,
  settle,
  until,
  type Harness,
} from '../helpers/supervisor-harness.js';

let h: Harness;

afterEach(async () => {
  await h.close();
});

async function serveV1(): Promise<ReleaseFixture> {
  const v1 = await buildRelease({ sequence: 1 });
  await h.cacheRelease(v1);
  expect(await h.supervisor.boot(1)).toBe('serving');
  return v1;
}

function snapshot(events: number): CounterSnapshot {
  return {
    in: events,
    out: events,
    failed: 0,
    destinations: {
      api: { count: events, failed: 0, duration: 0, dlqSize: 0, dropped: 0 },
    },
  };
}

describe('a release that does not get ready', () => {
  it('kills a child not ready by the deadline, refuses it here and starts v1 again', async () => {
    h = await createHarness();
    await serveV1();
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    h.behaviours.set(2, { start: 'wait' });

    const swap = h.supervisor.consider(2);
    await until(() => h.clock.waiting().includes(60_000));
    h.clock.advance(60_000);
    await swap;

    expect(h.child(2).signals).toEqual(['SIGTERM']);
    expect(h.supervisor.state()).toEqual({
      running: 1,
      last: { sequence: 2, state: 'failed', check: 'not-ready' },
    });
    expect(h.errors()).toEqual([
      'Release v2 not ready within 60 s, refused on this instance',
    ]);
    expect(h.lines.map((line) => line.message)).toContain(
      'Release v1 starting again',
    );
  });

  it('refuses a child that exits before it is ready, with its own line', async () => {
    h = await createHarness();
    await serveV1();
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    h.behaviours.set(2, { start: 'exit', exitCode: 1 });

    await h.supervisor.consider(2);

    expect(h.supervisor.state()).toEqual({
      running: 1,
      last: { sequence: 2, state: 'failed', check: 'not-ready' },
    });
    expect(h.errors()).toEqual([
      'Release v2 exited before it was ready (code 1), refused on this instance',
    ]);
  });

  it('starts nothing below a release that changed secret values', async () => {
    h = await createHarness();
    await serveV1();
    h.standIn.serve(await buildRelease({ sequence: 2, secretsSince: 2 }), {
      current: true,
    });
    h.behaviours.set(2, { start: 'exit' });

    await h.supervisor.consider(2);

    expect(h.children.map((child) => child.sequence)).toEqual([1, 2]);
    expect(h.supervisor.state().running).toBeNull();
    expect(h.port.open).toBe(true);
    expect(h.errors()).toContain(
      'No release can run: v2 changed secret values and did not start; /ready answers 503',
    );
  });

  it('marks the check a child refused its secrets by', async () => {
    h = await createHarness();
    await serveV1();
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    h.behaviours.set(2, {
      start: 'exit',
      failed: {
        type: 'failed',
        message: 'Secrets refused: API_KEY (secret-in-env)',
        refused: [{ name: 'API_KEY', reason: 'secret-in-env' }],
      },
    });

    await h.supervisor.consider(2);

    expect(h.supervisor.state().last).toEqual({
      sequence: 2,
      state: 'refused',
      check: 'secret-in-env',
      names: ['API_KEY'],
    });
    expect(h.errors()).toEqual(['Release v2 refused (secret-in-env: API_KEY)']);
  });

  describe('after a cold boot', () => {
    async function coldBoot(withV1: boolean): Promise<void> {
      if (withV1) await h.cacheRelease(await buildRelease({ sequence: 1 }));
      await h.cacheRelease(
        await buildRelease({
          sequence: 2,
          secrets: { app: ['API_KEY'], server: [] },
        }),
      );
      const v3 = await buildRelease({ sequence: 3 });
      await h.cacheRelease(v3);
      h.standIn.serve(v3, { current: true });
      h.behaviours.set(3, { start: 'exit' });
      await h.supervisor.boot(3);
    }

    it('skips a lower release whose walkerOS secrets the app no longer serves, and starts the one below', async () => {
      h = await createHarness();
      await coldBoot(true);

      expect(h.errors()).toContain(
        'Release v2 skipped (the app does not serve its walkerOS secrets)',
      );
      expect(h.supervisor.state().running).toBe(1);
    });

    it('says no release can run when none is left', async () => {
      h = await createHarness();
      await coldBoot(false);

      expect(h.errors()).toContain(
        'No release can run: no good release in the cache; /ready answers 503',
      );
      expect(h.supervisor.state().running).toBeNull();
    });
  });
});

describe('an archive refused', () => {
  it.each([
    ['the app', false, 'Release v2 archive refused by the app (403)'],
    ['storage', true, 'Release v2 archive refused by storage (403)'],
  ] as const)(
    'names %s as the side that refused, marks nothing and asks again at the next consider',
    async (_side, redirect, line) => {
      h = await createHarness();
      await serveV1();
      h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
      h.standIn.redirectArchives(redirect);
      h.standIn.setAnswer(redirect ? 'storage' : 'archive', { status: 403 });

      await h.supervisor.consider(2);

      expect(h.child(1).signals).toEqual([]);
      expect(h.supervisor.state()).toEqual({ running: 1, last: null });
      expect(h.errors()).toEqual([line]);
      const asked = h.standIn.requests.filter(
        (request) => request.route === 'archive',
      ).length;
      await h.supervisor.consider(2);
      expect(
        h.standIn.requests.filter((request) => request.route === 'archive'),
      ).toHaveLength(asked + 1);
    },
  );
});

describe('a crash restart', () => {
  it('runs the archive again, not the files its child changed', async () => {
    h = await createHarness();
    await serveV1();
    const { flowFile } = h.child(1).start;
    writeFileSync(flowFile, 'export default "changed by the flow";');

    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));
    h.clock.advance(1000);
    await until(() => h.children.length === 2);

    expect(readFileSync(flowFile, 'utf-8')).toBe(
      defaultFlowSource({
        sequence: 1,
        release: 'dv_r1',
        flowName: 'shop',
        names: [],
      }),
    );
  });

  it('backs off again without a fork when the archive fails its check, marking nothing', async () => {
    h = await createHarness();
    const v1 = await serveV1();
    const cached = join(h.cacheDir, 'artifacts', `${v1.artifact.sha256}.tgz`);
    const bytes = readFileSync(cached);
    bytes[bytes.length - 1] ^= 0xff;
    writeFileSync(cached, bytes);

    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));
    h.clock.advance(1000);
    await until(() => h.clock.waiting().includes(2000));

    expect(h.children).toHaveLength(1);
    expect(h.supervisor.state()).toEqual({ running: null, last: null });
    expect(h.errors()).toEqual([
      'Release v1 exited (code 1), starting it again in 1 s',
      `Cached artifact sha256 ${v1.artifact.sha256.slice(0, 12)} failed its check and was removed`,
      'Release v1 not started on this instance: extraction refused (artifact-sha256); starting it again in 2 s',
    ]);
  });
});

describe('the secretsSince floor', () => {
  it('holds after the newest document file is gone before the fallback', async () => {
    h = await createHarness();
    await serveV1();
    const v2 = await buildRelease({ sequence: 2, secretsSince: 2 });
    h.standIn.serve(v2, { current: true });
    h.behaviours.set(2, { start: 'exit' });
    h.onSpawn = (start) => {
      if (start.sequence === 2)
        rmSync(join(h.cacheDir, 'documents', `${v2.documentSha256}.json`));
    };

    await h.supervisor.consider(2);

    expect(h.children.map((child) => child.sequence)).toEqual([1, 2]);
    expect(h.errors()).toContain(
      'No release can run: v2 changed secret values and did not start; /ready answers 503',
    );
  });
});

describe('a crash', () => {
  it('names the missed deadline of a fallback to a release seen ready', async () => {
    h = await createHarness();
    await serveV1();
    h.behaviours.set(1, { start: 'wait' });
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    h.behaviours.set(2, { start: 'exit' });

    const swap = h.supervisor.consider(2);
    await until(
      () => h.children.length === 3 && h.clock.waiting().includes(60_000),
    );
    h.clock.advance(60_000);
    await swap;

    expect(h.errors()).toEqual([
      'Release v2 exited before it was ready (code 1), refused on this instance',
      'Release v1 not ready within 60 s after a restart, starting it again in 1 s',
    ]);
  });

  it('counts a fallback to a release seen ready that then fails as a crash, not a refusal', async () => {
    h = await createHarness();
    await serveV1();
    h.behaviours.set(1, { start: 'exit' });
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    h.behaviours.set(2, { start: 'exit' });

    await h.supervisor.consider(2);

    expect(h.supervisor.state()).toEqual({
      running: null,
      last: { sequence: 2, state: 'failed', check: 'not-ready' },
    });
    expect(h.errors()).toEqual([
      'Release v2 exited before it was ready (code 1), refused on this instance',
      'Release v1 exited (code 1), starting it again in 1 s',
    ]);
    expect(h.clock.waiting()).toContain(1000);
  });

  it('starts the same release again after 1 s, then 2 s, and after 60 s ready after 1 s', async () => {
    h = await createHarness();
    await serveV1();

    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));
    h.clock.advance(1000);
    await until(() => h.supervisor.state().running === 1);

    h.child(1).exit(null, 'SIGKILL');
    await until(() => h.clock.waiting().includes(2000));
    h.clock.advance(2000);
    await until(() => h.supervisor.state().running === 1);

    h.clock.advance(60_000);
    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));

    expect(h.errors()).toEqual([
      'Release v1 exited (code 1), starting it again in 1 s',
      'Release v1 exited (signal SIGKILL), starting it again in 2 s',
      'Release v1 exited (code 1), starting it again in 1 s',
    ]);
    expect(new Set(h.children.map((child) => child.sequence))).toEqual(
      new Set([1]),
    );
  });

  it('names the missed deadline of a restarted child that never gets ready', async () => {
    h = await createHarness();
    await serveV1();
    h.behaviours.set(1, { start: 'wait' });

    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));
    h.clock.advance(1000);
    await until(() => h.clock.waiting().includes(60_000));
    h.clock.advance(60_000);
    await until(() => h.clock.waiting().includes(2000));

    expect(h.errors()).toEqual([
      'Release v1 exited (code 1), starting it again in 1 s',
      'Release v1 not ready within 60 s after a restart, starting it again in 2 s',
    ]);
    expect(h.supervisor.state()).toEqual({ running: null, last: null });
  });

  it('counts a restarted child that does not get ready as a crash, not a refusal', async () => {
    h = await createHarness();
    await serveV1();
    h.behaviours.set(1, { start: 'exit' });

    h.child(1).exit(1);
    await until(() => h.clock.waiting().includes(1000));
    h.clock.advance(1000);
    await until(() => h.clock.waiting().includes(2000));

    expect(h.supervisor.state()).toEqual({ running: null, last: null });
    expect(h.errors()).toEqual([
      'Release v1 exited (code 1), starting it again in 1 s',
      'Release v1 exited (code 1), starting it again in 2 s',
    ]);
  });
});

describe('stop', () => {
  it('sends SIGTERM and resolves with the child code', async () => {
    h = await createHarness();
    await serveV1();

    expect(await h.supervisor.stop()).toBe(0);
    expect(h.child(1).signals).toEqual(['SIGTERM']);
  });

  it('kills a child that ignores SIGTERM at 9500 ms and resolves 1', async () => {
    h = await createHarness();
    h.behaviours.set(1, { onSigterm: 'ignore' });
    await serveV1();

    const stopped = h.supervisor.stop();
    await until(() => h.clock.waiting().includes(9500));
    h.clock.advance(9499);
    expect(h.child(1).signals).toEqual(['SIGTERM']);
    h.clock.advance(1);

    expect(await stopped).toBe(1);
    expect(h.child(1).signals).toEqual(['SIGTERM', 'SIGKILL']);
  });

  it('takes a child that exits on its own signal while stopping as no crash', async () => {
    h = await createHarness();
    h.behaviours.set(1, { onSigterm: 'ignore' });
    await serveV1();

    const stopped = h.supervisor.stop();
    h.child(1).exit(0);

    expect(await stopped).toBe(0);
    expect(h.errors()).toEqual([]);
    expect(h.clock.waiting()).toEqual([]);
    expect(h.children).toHaveLength(1);
  });

  it('forks nothing more when stopped during a swap', async () => {
    h = await createHarness();
    h.behaviours.set(1, { onSigterm: 'ignore' });
    await serveV1();
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });

    const swap = h.supervisor.consider(2);
    await until(() => h.child(1).signals.length === 1);
    const stopped = h.supervisor.stop();
    h.child(1).exit(0);

    expect(await stopped).toBe(0);
    await swap;
    expect(h.children.map((child) => child.sequence)).toEqual([1]);
  });

  it('forks nothing more when stopped during a crash back-off', async () => {
    h = await createHarness();
    await serveV1();
    h.child(1).exit(3);
    await until(() => h.clock.waiting().includes(1000));

    expect(await h.supervisor.stop()).toBe(3);
    h.clock.advance(1000);
    await settle();
    expect(h.children).toHaveLength(1);
  });

  it('forks nothing when stopped during the checks of a boot', async () => {
    h = await createHarness();
    await h.cacheRelease(await buildRelease({ sequence: 1 }));
    let stopped: Promise<number> | undefined;
    h.heap.onCall = () => {
      stopped ??= h.supervisor.stop();
    };

    await h.supervisor.boot(undefined);

    expect(await stopped).toBe(0);
    expect(h.children).toEqual([]);
  });
});

describe('report', () => {
  it('resolves with the running child counters, asked for now', async () => {
    h = await createHarness();
    h.behaviours.set(1, { counters: () => snapshot(3) });
    await serveV1();

    const report = await h.supervisor.report();

    expect(h.child(1).sent).toContainEqual({ type: 'report' });
    expect(report.counters?.eventsIn).toBe(3);
    expect(report.release).toBe('dv_r1');
  });

  it('resolves after 1000 ms without the child report when none comes', async () => {
    h = await createHarness();
    h.behaviours.set(1, { counters: () => snapshot(3), answers: false });
    await serveV1();

    const report = h.supervisor.report();
    await until(() => h.clock.waiting().includes(1000));
    h.clock.advance(1000);

    expect((await report).counters).toBeUndefined();
  });

  it('adds a drained child last delta once to the next check-in', async () => {
    h = await createHarness();
    let v1Events = 3;
    h.behaviours.set(1, { counters: () => snapshot(v1Events) });
    h.behaviours.set(2, { counters: () => snapshot(2) });
    await serveV1();
    (await h.supervisor.report()).taken();
    v1Events = 5;
    h.standIn.serve(await buildRelease({ sequence: 2 }), { current: true });
    await h.supervisor.consider(2);

    const afterSwap = await h.supervisor.report();
    afterSwap.taken();
    const next = await h.supervisor.report();

    expect(afterSwap.counters?.eventsIn).toBe(4);
    expect(next.counters?.eventsIn).toBe(0);
  });

  it('keeps the counters of a check-in that was not taken for the next', async () => {
    h = await createHarness();
    h.behaviours.set(1, { counters: () => snapshot(3) });
    await serveV1();

    await h.supervisor.report();
    const next = await h.supervisor.report();

    expect(next.counters?.eventsIn).toBe(3);
  });

  it('masks a known value in the child errors again with every value the supervisor holds', async () => {
    h = await createHarness();
    h.behaviours.set(1, {
      errors: [
        {
          message: 'failed with learned-after-the-line',
          count: 1,
          firstSeen: '2026-11-18T10:00:00.000Z',
          lastSeen: '2026-11-18T10:00:00.000Z',
        },
      ],
    });
    await serveV1();
    h.knownValues.add(['learned-after-the-line']);

    const report = await h.supervisor.report();

    expect(report.errors.map((error) => error.message)).toContain(
      'failed with ***',
    );
  });
});
