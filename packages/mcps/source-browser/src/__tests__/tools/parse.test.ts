import { ParseTaggingOutputShape } from '../../schemas/output.js';

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

describe('parse_tagging tool', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerParseTool } = await import('../../tools/parse.js');
    registerParseTool(server as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('registers with correct metadata', () => {
    const tool = server.getTool('parse_tagging');
    expect(tool).toBeDefined();
    expect((tool.config as any).title).toBe('Parse Tagging');
    expect((tool.config as any).annotations.readOnlyHint).toBe(true);
    expect(Object.keys((tool.config as any).outputSchema)).toEqual(
      Object.keys(ParseTaggingOutputShape),
    );
  });

  it('parses simple entity + action + data', async () => {
    const tool = server.getTool('parse_tagging');
    const result = await tool.handler({
      html: `<div data-elb="product" data-elb-product="name:Widget" data-elbaction="load:view"></div>`,
    });
    expect(result.structuredContent.events).toHaveLength(1);
    expect(result.structuredContent.events[0].entity).toBe('product');
    expect(result.structuredContent.events[0].action).toBe('view');
    expect(result.structuredContent.events[0].data.name).toBe('Widget');
  });

  it('parses globals', async () => {
    const tool = server.getTool('parse_tagging');
    const result = await tool.handler({
      html: `<div data-elbglobals="lang:en"></div>`,
    });
    expect(result.structuredContent.globals).toEqual({ lang: 'en' });
  });

  it('parses context', async () => {
    const tool = server.getTool('parse_tagging');
    const result = await tool.handler({
      html: `
        <div data-elbcontext="test:engagement">
          <div data-elb="promo" data-elbaction="load:view"></div>
        </div>`,
    });
    expect(result.structuredContent.events[0].context).toBeDefined();
  });

  it('returns empty results for HTML without data-elb', async () => {
    const tool = server.getTool('parse_tagging');
    const result = await tool.handler({
      html: `<div class="normal">Hello</div>`,
    });
    expect(result.structuredContent.events).toHaveLength(0);
  });

  it('returns error for empty html', async () => {
    const tool = server.getTool('parse_tagging');
    const result = await tool.handler({ html: '' });
    expect(result.isError).toBe(true);
  });

  it('summary includes counts', async () => {
    const tool = server.getTool('parse_tagging');
    const result = await tool.handler({
      html: `<div data-elb="product" data-elb-product="id:1" data-elbaction="load:view"></div>`,
    });
    expect(result.structuredContent.summary).toContain('1 event');
  });
});
