/**
 * The spec entry loads in the app server. Throwing module factories stand in
 * for the CLI main entry, the bundler, the package manager and the MCP SDK:
 * an entry that reaches any of them, at import or during a run, fails here.
 */
jest.mock('@walkeros/cli', () => {
  throw new Error('the CLI main entry was loaded');
});
jest.mock('esbuild', () => {
  throw new Error('esbuild was loaded');
});
jest.mock('pacote', () => {
  throw new Error('pacote was loaded');
});
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  throw new Error('the MCP SDK was loaded');
});

import './support/version.js';
import { isErrorResult } from './support/tool-result.js';

const FLOW = {
  version: 4,
  flows: {
    default: { config: { platform: 'web' }, sources: {}, destinations: {} },
  },
};

describe('@walkeros/mcp/specs', () => {
  it('builds the five shared tools over a load-only runtime and validates with them', async () => {
    const { createLocalToolSpecs } = await import('../specs.js');
    const specs = createLocalToolSpecs({
      load: async (input: string): Promise<unknown> => JSON.parse(input),
    });
    expect(Object.keys(specs).sort()).toEqual([
      'flow_examples',
      'flow_load',
      'flow_validate',
      'package_get',
      'package_search',
    ]);
    const result = await specs.flow_validate.handler({
      type: 'flow',
      input: JSON.stringify(FLOW),
      offline: true,
    });
    expect(isErrorResult(result)).toBe(false);
  });

  it('carries the knowledge resources and the prompts as plain specs', async () => {
    const { KNOWLEDGE_RESOURCES, PROMPTS } = await import('../specs.js');
    expect(
      KNOWLEDGE_RESOURCES.map((spec) =>
        spec.kind === 'static' ? spec.uri : spec.uriTemplate,
      ),
    ).toEqual([
      'walkeros://reference/flow-schema',
      'walkeros://reference/event-model',
      'walkeros://reference/mapping',
      'walkeros://reference/consent',
      'walkeros://reference/variables',
      'walkeros://reference/contract',
      'walkeros://reference/examples',
      'walkeros://reference/packages',
      'walkeros://schema/{packageName}',
    ]);
    expect(PROMPTS.map((prompt) => prompt.name)).toEqual([
      'add-step',
      'setup-mapping',
      'manage-contract',
    ]);

    const flowSchema = KNOWLEDGE_RESOURCES.find(
      (spec) => spec.kind === 'static' && spec.name === 'flow-schema',
    );
    if (flowSchema?.kind !== 'static') throw new Error('flow-schema missing');
    const content = await flowSchema.read();
    expect(content.mimeType).toBe('application/json');
    expect(typeof JSON.parse(content.text)).toBe('object');

    const setupMapping = PROMPTS.find(
      (prompt) => prompt.name === 'setup-mapping',
    );
    if (!setupMapping) throw new Error('setup-mapping missing');
    const { messages } = await setupMapping.handler({ stepName: 'gtag' });
    expect(messages[0].content.text).toContain('"gtag"');
  });

  it('the guard is live: the main entry trips it', async () => {
    await expect(import('../index.js')).rejects.toThrow(/was loaded/);
  });
});
