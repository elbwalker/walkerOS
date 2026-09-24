import fs from 'fs';
import path from 'path';
import { isObject } from '@walkeros/core';
import { validateFlow } from '../../../commands/validate/validators/flow.js';
import { flowComplete } from '../../../examples/index.js';
import { planSimulate } from '../../../commands/push/plan-simulate.js';
import { parseStep } from '../../../commands/push/overrides.js';
import {
  flowCompleteCli,
  flowCompleteCoverage,
  flowCompleteFeatures,
  resolvePointer,
  type ChapterId,
  type FeatureId,
} from '../../../examples/flow-complete.manifest.js';

const filePath = path.resolve(
  __dirname,
  '../../../../examples/flow-complete.json',
);
const raw = fs.readFileSync(filePath, 'utf8');
const file: unknown = JSON.parse(raw);

const CHAPTERS: ChapterId[] = [
  'tour',
  'web-entry',
  'server-entry',
  'step-envelope',
  'mapping',
  'consent-privacy',
  'gtm-fed',
  'references',
  'chains-routing',
  'contract',
  'quality',
  'state-stores',
  'delivery',
  'build-run',
  'operate',
];

function at(pointer: string): unknown {
  return resolvePointer(file, pointer);
}

function record(pointer: string): Record<string, unknown> {
  const value = at(pointer);
  if (!isObject(value)) throw new Error(`${pointer} is not an object`);
  return value;
}

type StepKind = 'sources' | 'transformers' | 'destinations' | 'stores';
const STEP_KINDS: StepKind[] = [
  'sources',
  'transformers',
  'destinations',
  'stores',
];

/** Every step of every flow as [pointer, step]. */
function steps(): [string, Record<string, unknown>][] {
  const result: [string, Record<string, unknown>][] = [];
  for (const [flowName, flow] of Object.entries(record('/flows'))) {
    if (!isObject(flow)) continue;
    for (const kind of STEP_KINDS) {
      const group = flow[kind];
      if (!isObject(group)) continue;
      for (const [name, step] of Object.entries(group))
        if (isObject(step))
          result.push([`/flows/${flowName}/${kind}/${name}`, step]);
    }
  }
  return result;
}

describe('flow-complete manifest', () => {
  it.each(flowCompleteFeatures.map((f) => [f.id, f.pointer] as const))(
    '%s points at %s',
    (_id, pointer) => {
      expect(at(pointer)).toBeDefined();
    },
  );

  it('decodes pointers per RFC 6901', () => {
    const doc = { 'a/b': { 'c~d': ['x', 'y'] } };
    expect(resolvePointer(doc, '')).toBe(doc);
    expect(resolvePointer(doc, '/a~1b/c~0d/1')).toBe('y');
    expect(resolvePointer(doc, '/a~1b/c~0d/01')).toBeUndefined();
    expect(resolvePointer(doc, '/missing')).toBeUndefined();
    expect(resolvePointer(doc, 'a')).toBeUndefined();
  });

  // Index-based pointers must keep pointing at what their id names.
  const byId = (id: FeatureId): unknown => {
    const feature = flowCompleteFeatures.find((f) => f.id === id);
    if (!feature) throw new Error(`no feature ${id}`);
    return at(feature.pointer);
  };

  it.each([
    ['op-eq', 'eq'],
    ['op-exists', 'exists'],
    ['op-prefix', 'prefix'],
    ['op-regex', 'regex'],
    ['op-suffix', 'suffix'],
    ['op-gt', 'gt'],
  ] satisfies [FeatureId, string][])('%s resolves to %s', (id, value) => {
    expect(byId(id)).toBe(value);
  });

  it.each([
    ['match-and', '/and'],
    ['match-or', '/or'],
    ['match-not', '/not'],
  ] satisfies [FeatureId, string][])('%s ends in %s', (id, suffix) => {
    const feature = flowCompleteFeatures.find((f) => f.id === id);
    expect(feature?.pointer.endsWith(suffix)).toBe(true);
  });

  it.each([
    ['event-filter-impression', 'event.trigger'],
    ['event-filter-bot', 'event.user.botScore'],
    ['event-filter-valid', 'event.source.valid'],
  ] satisfies [FeatureId, string][])('%s checks %s', (id, key) => {
    const clause = byId(id);
    expect(isObject(clause) && clause.key).toBe(key);
  });

  it('points route-next-match at the conditional next to enrich', () => {
    const route = byId('route-next-match');
    expect(isObject(route) && route.next).toBe('enrich');
  });

  it('has unique feature ids', () => {
    const ids = flowCompleteFeatures.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every chapter', () => {
    const used = new Set(flowCompleteFeatures.map((f) => f.chapter));
    expect(CHAPTERS.filter((chapter) => !used.has(chapter))).toEqual([]);
  });

  it('names only examples that exist', () => {
    const missing = flowCompleteFeatures
      .filter((f) => f.example)
      .filter((f) => {
        const example = f.example;
        if (!example) return false;
        return !steps().some(
          ([pointer, step]) =>
            pointer.endsWith(`/${example.step}`) &&
            isObject(step.examples) &&
            Object.hasOwn(step.examples, example.name),
        );
      })
      .map((f) => f.id);
    expect(missing).toEqual([]);
  });

  it('gives every exclusion a reason', () => {
    const reasons: string[] = [];
    for (const group of Object.values(flowCompleteCoverage))
      for (const value of Object.values(group))
        if (isObject(value) && 'excluded' in value)
          reasons.push(String(value.excluded));
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.filter((reason) => reason.trim().length < 10)).toEqual([]);
  });

  it('teaches only real commands', () => {
    for (const { command } of flowCompleteCli) {
      expect(command).toMatch(/^(walkeros|runneros) /);
      expect(command).not.toMatch(/^walkeros (simulate|run) /);
    }
  });

  // Every command line of the manifest, the CLI section and the feature
  // entries alike.
  const commands = [
    ...flowCompleteCli.map((entry) => entry.command),
    ...flowCompleteFeatures.flatMap((f) => f.cli ?? []),
  ];

  it.each(commands.filter((c) => c.includes('--simulate')))(
    'plans the simulate target of: %s',
    (command) => {
      const target = /--simulate (\S+)/.exec(command)?.[1];
      expect(target).toBeDefined();
      expect(planSimulate([target ?? '']).kind).not.toBe('none');
    },
  );

  it.each(commands.filter((c) => c.includes('--mock')))(
    'parses the mock of: %s',
    (command) => {
      const mock = /--mock ([^=\s]+)='([^']*)'/.exec(command);
      expect(mock).not.toBeNull();
      const step = parseStep(mock?.[1] ?? '');
      // Only chain mocks and destination mocks are accepted by --mock.
      expect(step.chainType !== undefined || step.type === 'destination').toBe(
        true,
      );
      expect(() => JSON.parse(mock?.[2] ?? '')).not.toThrow();
    },
  );
});

describe('flow-complete.json', () => {
  it('loads as a Flow.Json', () => {
    expect(flowComplete.version).toBe(4);
    expect(Object.keys(flowComplete.flows)).toEqual([
      'web',
      'server',
      'warehouse',
    ]);
  });

  it('is path-free', () => {
    for (const flow of Object.values(flowComplete.flows))
      for (const pkg of Object.values(flow.config?.bundle?.packages ?? {}))
        expect(pkg.path).toBeUndefined();
  });

  it('pins every package version', () => {
    for (const flow of Object.values(flowComplete.flows))
      for (const pkg of Object.values(flow.config?.bundle?.packages ?? {}))
        expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
  });

  it('marks exactly one example public per step', () => {
    for (const [pointer, step] of steps()) {
      if (!isObject(step.examples)) continue;
      const pub = Object.values(step.examples).filter(
        (example) => isObject(example) && example.public === true,
      );
      expect([pointer, pub.length]).toEqual([pointer, 1]);
    }
  });

  it('uses $secret only for the GCP service account', () => {
    const secrets = raw.match(/\$secret\.[A-Z0-9_]+/g) ?? [];
    expect(new Set(secrets)).toEqual(new Set(['$secret.GCP_SA']));
    expect(JSON.stringify(flowComplete.flows.web)).not.toContain('$secret.');
  });

  it('holds no em dash', () => {
    expect(raw).not.toContain(String.fromCharCode(0x2014));
  });

  it('decodes GA4 hits from another property than the web GA4 (no double counting)', () => {
    const measurementId = String(
      at('/flows/web/destinations/ga4/config/settings/ga4/measurementId'),
    );
    const mainId = measurementId.split(':').pop();
    expect(mainId).toBe('G-MAINSITE');

    const examples = record('/flows/server/transformers/ga4Decode/examples');
    const tids = Object.values(examples).map((example) => {
      if (!isObject(example) || !isObject(example.in)) return undefined;
      return new URL(String(example.in.url)).searchParams.get('tid');
    });
    expect(tids.length).toBeGreaterThan(0);
    for (const tid of tids) {
      expect(tid).toBe('G-SUBSITE');
      expect(tid).not.toBe(mainId);
    }
  });

  it('pairs the server contract with a validate example that breaks it', () => {
    expect(record('/contract/server').extend).toBe('default');
    const example = record(
      '/flows/server/transformers/validate/examples/missingHash',
    );
    expect(example.public).not.toBe(true);
    expect(JSON.stringify(example.out)).toContain('"valid":false');
  });

  /**
   * Strict validation of the file is clean. The contract binds only through
   * the validate step, whose missingHash example shows the failure its
   * settings produce (mode pass, source.valid false), and every link check
   * reads the events a step `out` passes on.
   */
  it('validates strict with 0 errors and 0 warnings', () => {
    const result = validateFlow(file, { strict: true });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.valid).toBe(true);
  });
});
