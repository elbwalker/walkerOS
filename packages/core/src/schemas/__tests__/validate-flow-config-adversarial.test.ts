// Adversarial reference checks for validateFlowConfig (plan
// 2026-09-24-validate-and-runtime-fixes: F21 item 26 prose rule, F12 N2
// per-flow reference context). Issues are located by line and column, the
// positions the editor shows.

import { validateFlowConfig } from '../validate-flow-config';
import type { ValidationIssue } from '../validate';

/** 1-based line and column of the first `needle` after `anchor`. */
function positionOf(
  text: string,
  anchor: string,
  needle: string,
): { line: number; column: number } {
  const start = text.indexOf(anchor);
  if (start === -1) throw new Error(`Anchor ${anchor} not in text`);
  const offset = text.indexOf(needle, start);
  if (offset === -1) throw new Error(`Needle ${needle} not after ${anchor}`);
  const before = text.slice(0, offset).split('\n');
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

function onLine(issues: ValidationIssue[], line: number): ValidationIssue[] {
  return issues.filter((issue) => issue.line === line);
}

describe('F21 (item 26): prose never resolves references', () => {
  const config = {
    version: 4,
    contract: {
      default: {
        description: 'Reads $store.missing at checkout',
        events: { order: { complete: { type: 'object' } } },
      },
    },
    flows: {
      a: {
        config: { platform: 'server' },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            description: 'Looks up $store.missing before sending',
            config: {
              mapping: {
                order: { complete: { data: { key: '$store.missing' } } },
              },
            },
          },
        },
      },
    },
  };
  const json = JSON.stringify(config, null, 2);
  const result = validateFlowConfig(json);

  // it.failing until Batch 2 Task 8 (item 26)
  it.failing('a $store ref inside a step description raises no warning', () => {
    const { line } = positionOf(
      json,
      '"description": "Looks up',
      '$store.missing',
    );
    expect(onLine(result.warnings, line)).toEqual([]);
  });

  // it.failing until Batch 2 Task 8 (item 26)
  it.failing(
    'a $store ref inside a contract description raises no warning',
    () => {
      const { line } = positionOf(
        json,
        '"description": "Reads',
        '$store.missing',
      );
      expect(onLine(result.warnings, line)).toEqual([]);
    },
  );

  it('GUARD: the same ref in a mapping value warns at its line and column', () => {
    const position = positionOf(json, '"key":', '$store.missing');
    expect(onLine(result.warnings, position.line)).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        line: position.line,
        column: position.column,
      }),
    );
  });
});

describe('F12 (N2): references resolve per flow, not across flows', () => {
  const config = {
    version: 4,
    flows: {
      a: {
        config: { platform: 'server' },
        variables: { onlyA: 'x' },
        stores: { cache: { package: '@walkeros/server-store-fs' } },
      },
      b: {
        config: { platform: 'server' },
        destinations: {
          d: {
            package: '@walkeros/server-destination-api',
            config: { settings: { v: '$var.onlyA', s: '$store.cache' } },
          },
        },
      },
    },
  };
  const json = JSON.stringify(config, null, 2);
  const result = validateFlowConfig(json);
  const issues = [...result.errors, ...result.warnings];

  // it.failing until Batch 2 Task 8 (N2)
  it.failing(
    'flow b using $var.onlyA from flow a is reported at its position',
    () => {
      const position = positionOf(json, '"v":', '$var.onlyA');
      expect(onLine(issues, position.line)).toContainEqual(
        expect.objectContaining({
          line: position.line,
          column: position.column,
          path: expect.stringMatching(/^flows\.b\./),
        }),
      );
    },
  );

  // it.failing until Batch 2 Task 8 (N2)
  it.failing(
    'flow b using $store.cache from flow a is reported at its position',
    () => {
      const position = positionOf(json, '"s":', '$store.cache');
      expect(onLine(issues, position.line)).toContainEqual(
        expect.objectContaining({
          line: position.line,
          column: position.column,
          path: expect.stringMatching(/^flows\.b\./),
        }),
      );
    },
  );

  it('GUARD: the merged IntelliSense context still lists every variable and store', () => {
    expect(result.context?.variables).toMatchObject({ onlyA: 'x' });
    expect(result.context?.stepNames?.stores).toEqual(['cache']);
  });
});
