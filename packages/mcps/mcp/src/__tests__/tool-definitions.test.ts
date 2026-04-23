import { TOOL_DEFINITIONS } from '../tool-definitions.js';

describe('TOOL_DEFINITIONS', () => {
  it('lists all 13 tools by name', () => {
    const names = TOOL_DEFINITIONS.map((d) => d.name).sort();
    expect(names).toEqual(
      [
        'auth',
        'deploy_manage',
        'feedback',
        'flow_bundle',
        'flow_examples',
        'flow_load',
        'flow_manage',
        'flow_push',
        'flow_simulate',
        'flow_validate',
        'package_get',
        'package_search',
        'project_manage',
      ].sort(),
    );
  });

  it('each entry has title, description, inputSchema, annotations', () => {
    for (const def of TOOL_DEFINITIONS) {
      expect(typeof def.name).toBe('string');
      expect(typeof def.title).toBe('string');
      expect(typeof def.description).toBe('string');
      expect(def.inputSchema).toBeDefined();
      expect(def.annotations).toBeDefined();
    }
  });
});
