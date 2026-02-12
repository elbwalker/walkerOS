const mockWhoami = jest.fn();

jest.mock('@walkeros/cli', () => ({
  whoami: mockWhoami,
}));

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

describe('auth tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    const { registerAuthTools } = await import('../../tools/auth.js');
    registerAuthTools(server as any);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('whoami', () => {
    it('should register with correct metadata', () => {
      const tool = server.getTool('whoami');
      expect(tool).toBeDefined();
      expect((tool.config as any).title).toBe('Who Am I');
      expect((tool.config as any).annotations.readOnlyHint).toBe(true);
    });

    it('should return user identity on success', async () => {
      const mockResponse = {
        userId: 'user_abc',
        email: 'dev@test.com',
        projectId: null,
      };
      mockWhoami.mockResolvedValue(mockResponse);

      const tool = server.getTool('whoami');
      const result = await tool.handler({});

      expect(mockWhoami).toHaveBeenCalled();
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });

    it('should return error when token is missing', async () => {
      mockWhoami.mockRejectedValue(new Error('WALKEROS_TOKEN not set'));

      const tool = server.getTool('whoami');
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toContain(
        'WALKEROS_TOKEN',
      );
    });
  });
});
