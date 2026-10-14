import { SERVER_INSTRUCTIONS } from '../instructions.js';

describe('local server instructions', () => {
  it('name the hosted server and where to use it', () => {
    expect(SERVER_INSTRUCTIONS).toContain('https://app.walkeros.io/api/mcp');
    expect(SERVER_INSTRUCTIONS).toContain('## Two walkerOS MCP servers');
  });

  it.each([
    'auth(',
    'project_manage',
    'deploy_manage',
    'secret_manage',
    'observe_session',
    'observe_journeys',
    'hub_manage',
    'frame_manage',
    'diagnostics',
  ])('teach no tool this server lacks: %s', (name) => {
    expect(SERVER_INSTRUCTIONS).not.toContain(name);
  });

  it('hold no em dash', () => {
    expect(SERVER_INSTRUCTIONS).not.toContain(String.fromCharCode(0x2014));
  });
});
