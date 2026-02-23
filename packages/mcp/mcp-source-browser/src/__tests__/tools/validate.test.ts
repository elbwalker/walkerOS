import { ValidateTaggingOutputShape } from '../../schemas/output.js';

function createMockServer() {
  const tools: Record<string, { config: unknown; handler: Function }> = {};
  return {
    registerTool(name: string, config: unknown, handler: Function) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
}

describe('validate_tagging tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerValidateTool } = await import('../../tools/validate.js');
    registerValidateTool(server as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('registers with correct metadata', () => {
    const tool = server.getTool('validate_tagging');
    expect(tool).toBeDefined();
    expect((tool.config as any).annotations.readOnlyHint).toBe(true);
    expect(Object.keys((tool.config as any).outputSchema)).toEqual(
      Object.keys(ValidateTaggingOutputShape),
    );
  });

  it('returns valid for correct tagging', async () => {
    const tool = server.getTool('validate_tagging');
    const result = await tool.handler({
      html: `<div data-elb="product" data-elb-product="id:123" data-elbaction="click:select"></div>`,
    });
    expect(result.structuredContent.valid).toBe(true);
    expect(result.structuredContent.errors).toHaveLength(0);
  });

  it('detects empty entity names (error)', async () => {
    const tool = server.getTool('validate_tagging');
    const result = await tool.handler({
      html: `<div data-elb="" data-elbaction="click"></div>`,
    });
    expect(result.structuredContent.valid).toBe(false);
    expect(result.structuredContent.errors[0].check).toBe('empty_entity');
  });

  it('detects orphan actions (warning)', async () => {
    const tool = server.getTool('validate_tagging');
    const result = await tool.handler({
      html: `<div data-elbaction="click:submit"></div>`,
    });
    const orphans = result.structuredContent.warnings.filter(
      (w: any) => w.check === 'orphan_action',
    );
    expect(orphans.length).toBeGreaterThan(0);
  });

  it('detects entities without actions (info)', async () => {
    const tool = server.getTool('validate_tagging');
    const result = await tool.handler({
      html: `<div data-elb="product" data-elb-product="id:1"></div>`,
    });
    const infos = result.structuredContent.info.filter(
      (i: any) => i.check === 'entity_without_action',
    );
    expect(infos.length).toBeGreaterThan(0);
  });

  it('detects orphan properties (warning)', async () => {
    const tool = server.getTool('validate_tagging');
    const result = await tool.handler({
      html: `<div data-elb-product="id:123" data-elbaction="click"></div>`,
    });
    const orphans = result.structuredContent.warnings.filter(
      (w: any) => w.check === 'orphan_property',
    );
    expect(orphans.length).toBeGreaterThan(0);
  });

  it('detects unknown triggers (warning)', async () => {
    const tool = server.getTool('validate_tagging');
    const result = await tool.handler({
      html: `<div data-elb="product" data-elbaction="swipe:dismiss"></div>`,
    });
    const unknowns = result.structuredContent.warnings.filter(
      (w: any) => w.check === 'unknown_trigger',
    );
    expect(unknowns.length).toBeGreaterThan(0);
    expect(unknowns[0].message).toContain('swipe');
  });

  it('returns error for empty html', async () => {
    const tool = server.getTool('validate_tagging');
    const result = await tool.handler({ html: '  ' });
    expect(result.isError).toBe(true);
  });
});
