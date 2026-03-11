import { GenerateTaggingOutputShape } from '../../schemas/output.js';

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

describe('generate_tagging tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerGenerateTool } = await import('../../tools/generate.js');
    registerGenerateTool(server as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('registers with correct metadata', () => {
    const tool = server.getTool('generate_tagging');
    expect(tool).toBeDefined();
    expect((tool.config as any).title).toBe('Generate Tagging');
    expect((tool.config as any).annotations.readOnlyHint).toBe(true);
    expect(Object.keys((tool.config as any).outputSchema)).toEqual(
      Object.keys(GenerateTaggingOutputShape),
    );
  });

  it('generates entity + data attributes', async () => {
    const tool = server.getTool('generate_tagging');
    const result = await tool.handler({
      entity: 'product',
      data: { id: '123', name: 'Widget' },
    });
    expect(result.structuredContent.attributes['data-elb']).toBe('product');
    expect(result.structuredContent.attributes['data-elb-product']).toContain(
      'id:123',
    );
    expect(result.structuredContent.attributes['data-elb-product']).toContain(
      'name:Widget',
    );
    expect(result.structuredContent.html).toContain('data-elb="product"');
  });

  it('generates action attributes', async () => {
    const tool = server.getTool('generate_tagging');
    const result = await tool.handler({
      action: { click: 'select', load: 'view' },
    });
    expect(result.structuredContent.attributes['data-elbaction']).toContain(
      'click:select',
    );
  });

  it('generates actions attributes', async () => {
    const tool = server.getTool('generate_tagging');
    const result = await tool.handler({
      actions: { load: 'view' },
    });
    expect(result.structuredContent.attributes['data-elbactions']).toBe(
      'load:view',
    );
  });

  it('generates context + globals', async () => {
    const tool = server.getTool('generate_tagging');
    const result = await tool.handler({
      context: { test: 'engagement' },
      globals: { lang: 'en' },
    });
    expect(result.structuredContent.attributes['data-elbcontext']).toBe(
      'test:engagement',
    );
    expect(result.structuredContent.attributes['data-elbglobals']).toBe(
      'lang:en',
    );
  });

  it('generates link attributes', async () => {
    const tool = server.getTool('generate_tagging');
    const result = await tool.handler({
      link: { details: 'parent' },
    });
    expect(result.structuredContent.attributes['data-elblink']).toBe(
      'details:parent',
    );
  });

  it('handles custom prefix', async () => {
    const tool = server.getTool('generate_tagging');
    const result = await tool.handler({
      entity: 'item',
      prefix: 'data-track',
    });
    expect(result.structuredContent.attributes['data-track']).toBe('item');
  });

  it('returns error when no parameters provided', async () => {
    const tool = server.getTool('generate_tagging');
    const result = await tool.handler({});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toContain(
      'at least one parameter',
    );
  });
});
