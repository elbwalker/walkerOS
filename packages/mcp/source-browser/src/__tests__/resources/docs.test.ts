function createMockServer() {
  const resources: Record<
    string,
    { uri: string; metadata: any; handler: Function }
  > = {};
  const tools: Record<string, { config: unknown; handler: Function }> = {};
  return {
    resource(name: string, uri: string, metadata: any, handler: Function) {
      resources[name] = { uri, metadata, handler };
    },
    getResource(name: string) {
      return resources[name];
    },
    registerTool(name: string, config: unknown, handler: Function) {
      tools[name] = { config, handler };
    },
    getTool(name: string) {
      return tools[name];
    },
  };
}

describe('doc resources', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerDocResources } = await import('../../resources/docs.js');
    registerDocResources(server as any);
  });

  it('registers html-attributes resource', () => {
    const res = server.getResource('tagging-html-attributes');
    expect(res).toBeDefined();
    expect(res.uri).toBe('walkeros://docs/tagging/html-attributes');
    expect(res.metadata.mimeType).toBe('text/markdown');
  });

  it('registers tagger resource', () => {
    const res = server.getResource('tagging-tagger-api');
    expect(res).toBeDefined();
    expect(res.uri).toBe('walkeros://docs/tagging/tagger');
  });

  it('html-attributes content includes key sections', async () => {
    const res = server.getResource('tagging-html-attributes');
    const result = await res.handler();
    const text = result.contents[0].text;
    expect(text).toContain('Entity');
    expect(text).toContain('Triggers');
    expect(text).toContain('data-elb');
  });

  it('tagger content includes API methods', async () => {
    const res = server.getResource('tagging-tagger-api');
    const result = await res.handler();
    const text = result.contents[0].text;
    expect(text).toContain('createTagger');
    expect(text).toContain('.entity(');
    expect(text).toContain('.get()');
  });
});
