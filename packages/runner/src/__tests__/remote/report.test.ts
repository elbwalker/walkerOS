import type { CheckInAnswer, RemoteState } from '@walkeros/core';
import type { CounterPayload } from '../../heartbeat.js';
import type { RecentError, RecentLogEntry } from '../../log-ring.js';
import { VERSION } from '../../version.js';
import {
  addCounters,
  checkInBody,
  readCheckInAnswer,
} from '../../remote/report.js';

const remote: RemoteState = {
  running: 16,
  last: { sequence: 17, state: 'refused', check: 'artifact-sha256' },
};

function errorAt(minute: number): RecentError {
  const at = new Date(Date.UTC(2026, 10, 18, 10, minute)).toISOString();
  return { message: `error ${minute}`, count: 1, firstSeen: at, lastSeen: at };
}

function lineAt(second: number): RecentLogEntry {
  return {
    time: new Date(Date.UTC(2026, 10, 18, 10, 0, second)).toISOString(),
    level: 'info',
    message: `line ${second}`,
  };
}

const counters: CounterPayload = {
  eventsIn: 3,
  eventsOut: 2,
  eventsFailed: 1,
  destinations: {},
};

const encode = (text: string) => new TextEncoder().encode(text);

describe('checkInBody', () => {
  const base = {
    instanceId: '3f9a2b7c1d4e5f60',
    intervalMs: 30_000,
    remote,
    uptimeS: 12,
    release: 'dv_r16',
    counters,
    errors: [errorAt(1)],
    logs: [lineAt(1)],
  };

  it('carries only the instance, the version, the interval and remote without the heartbeat', () => {
    expect(checkInBody({ ...base, heartbeat: false })).toEqual({
      instanceId: '3f9a2b7c1d4e5f60',
      cliVersion: VERSION,
      intervalMs: 30_000,
      remote,
    });
  });

  it('adds the heartbeat with the heartbeat, never a flow or a deployment id', () => {
    expect(checkInBody({ ...base, heartbeat: true })).toEqual({
      instanceId: '3f9a2b7c1d4e5f60',
      cliVersion: VERSION,
      release: 'dv_r16',
      intervalMs: 30_000,
      uptime: 12,
      counters,
      recentErrors: [errorAt(1)],
      recentLogs: [lineAt(1)],
      remote,
    });
  });

  it('leaves the lines out when there are none', () => {
    expect(
      checkInBody({ ...base, heartbeat: true, logs: [] }),
    ).not.toHaveProperty('recentLogs');
  });

  it('sends the 50 newest of 200 errors', () => {
    const errors = Array.from({ length: 200 }, (_, minute) => errorAt(minute));
    const body = checkInBody({ ...base, heartbeat: true, errors });
    expect(body.recentErrors).toEqual(
      Array.from({ length: 50 }, (_, index) => errorAt(199 - index)),
    );
  });

  it('sends the last 50 lines by time of lines from several sources', () => {
    const early = Array.from({ length: 40 }, (_, second) => lineAt(second));
    const late = Array.from({ length: 40 }, (_, second) => lineAt(second + 1));
    const body = checkInBody({
      ...base,
      heartbeat: true,
      logs: [...late, ...early],
    });
    const sent = [...late, ...early]
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(-50);
    expect(body.recentLogs).toEqual(sent);
  });
});

describe('addCounters', () => {
  it('sums the deltas per destination and keeps the second payload dlqSize', () => {
    const drained: CounterPayload = {
      eventsIn: 5,
      eventsOut: 4,
      eventsFailed: 1,
      destinations: {
        api: { count: 4, failed: 1, duration: 40, dlqSize: 3, dropped: 1 },
        old: { count: 2, failed: 0, duration: 10, dlqSize: 2, dropped: 0 },
      },
    };
    const running: CounterPayload = {
      eventsIn: 2,
      eventsOut: 2,
      eventsFailed: 0,
      destinations: {
        api: { count: 2, failed: 0, duration: 15, dlqSize: 1, dropped: 2 },
        next: { count: 1, failed: 0, duration: 5, dlqSize: 4, dropped: 0 },
      },
    };
    expect(addCounters(drained, running)).toEqual({
      eventsIn: 7,
      eventsOut: 6,
      eventsFailed: 1,
      destinations: {
        api: { count: 6, failed: 1, duration: 55, dlqSize: 1, dropped: 3 },
        old: { count: 2, failed: 0, duration: 10, dlqSize: 0, dropped: 0 },
        next: { count: 1, failed: 0, duration: 5, dlqSize: 4, dropped: 0 },
      },
    });
  });
});

describe('readCheckInAnswer', () => {
  it.each<[string, string, CheckInAnswer]>([
    [
      'a release and an interval',
      '{"release":17,"intervalMs":60000,"served":{}}',
      { release: 17, intervalMs: 60_000, served: {} },
    ],
    [
      'a release with no web part',
      '{"release":3,"served":{}}',
      { release: 3, served: {} },
    ],
    [
      'no release, an interval and one web part',
      '{"release":null,"intervalMs":60000,"served":{"dep_w1":2}}',
      { release: null, intervalMs: 60_000, served: { dep_w1: 2 } },
    ],
    [
      'extra fields',
      '{"release":3,"plan":"pro","next":{"at":1},"served":{}}',
      { release: 3, served: {} },
    ],
  ])('reads %s', (_name, text, answer) => {
    expect(readCheckInAnswer(encode(text))).toEqual(answer);
  });

  const NO_RELEASE = 'The check-in answer names no release sequence';
  const NO_SERVED = 'The check-in answer names no served web parts';
  const BAD_SERVED =
    'The check-in answer names a served web part that is not a deployment id with a sequence';

  it.each<[string, string, string]>([
    ['a string release', '{"release":"17","served":{}}', NO_RELEASE],
    ['a negative release', '{"release":-1,"served":{}}', NO_RELEASE],
    ['no served', '{"release":3}', NO_SERVED],
    ['a served list', '{"release":3,"served":[]}', NO_SERVED],
    ['a served null', '{"release":3,"served":null}', NO_SERVED],
    ['a served sequence 0', '{"release":3,"served":{"dep_w1":0}}', BAD_SERVED],
    [
      'a served sequence 1.5',
      '{"release":3,"served":{"dep_w1":1.5}}',
      BAD_SERVED,
    ],
    [
      'a served sequence "2"',
      '{"release":3,"served":{"dep_w1":"2"}}',
      BAD_SERVED,
    ],
    ['a served key a b', '{"release":3,"served":{"a b":2}}', BAD_SERVED],
    [
      'a body that is not JSON',
      '<html>busy</html>',
      'The check-in answer is not a JSON object',
    ],
  ])('refuses %s with its fact', (_name, text, fact) => {
    expect(() => readCheckInAnswer(encode(text))).toThrow(new Error(fact));
  });

  it('keeps a web part named __proto__ as an own entry, not a prototype', () => {
    const { served } = readCheckInAnswer(
      encode('{"release":3,"served":{"__proto__":2}}'),
    );

    expect(Object.getOwnPropertyNames(served)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(served)).toBe(Object.prototype);
  });
});
