import vm from 'vm';
import type { Flow, Transformer } from '@walkeros/core';
import { buildSplitConfigObject, detectNamedImports } from '../bundler';

/**
 * Evaluate the generated config skeleton against its data payload, the way
 * the bundled `wireConfig(__data)` does, and return the config object the
 * collector's `startFlow` receives.
 */
function emit(flow: Flow): Record<string, unknown> {
  const { storesDeclaration, codeConfigObject, dataPayloadObj } =
    buildSplitConfigObject(flow, detectNamedImports(flow));
  const config: unknown = vm.runInNewContext(
    `(() => {\n${storesDeclaration}\nreturn ${codeConfigObject};\n})()`,
    { __data: dataPayloadObj, stepImpl: () => ({}) },
  );
  return JSON.parse(JSON.stringify(config));
}

const next: Transformer.Route = [
  { match: { key: 'event.name', operator: 'eq', value: 'x' }, stop: true },
  { many: ['bot', 'enrich'] },
];

describe('collector.next emission', () => {
  it('lands at the top level of the startFlow config (data path)', () => {
    const config = emit({
      config: { platform: 'server' },
      collector: { next },
    });
    expect(config.next).toEqual(next);
    expect(config).not.toHaveProperty('collector');
  });

  it('lands at the top level of the startFlow config (inline-code path)', () => {
    const config = emit({
      config: { platform: 'server' },
      collector: { next, globalsStatic: { flag: '$code:1 + 1' } },
    });
    expect(config.next).toEqual(next);
    expect(config.globalsStatic).toEqual({ flag: 2 });
  });
});
