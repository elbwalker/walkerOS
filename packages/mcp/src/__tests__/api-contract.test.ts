/**
 * Contract test: verifies that all API endpoints called by MCP tools
 * exist in the app's OpenAPI spec with the expected HTTP methods.
 *
 * Runs offline against a snapshot of /api/openapi.json.
 * To update the baseline:
 *   curl http://localhost:3000/api/openapi.json | python3 -m json.tool \
 *     > src/__tests__/fixtures/openapi-baseline.json
 */

import baseline from './fixtures/openapi-baseline.json';

interface OpenApiSpec {
  paths: Record<string, Record<string, unknown>>;
}

const spec = baseline as unknown as OpenApiSpec;

/** Every API endpoint the MCP tools call */
const MCP_ENDPOINTS = [
  { method: 'get', path: '/api/auth/whoami' },
  { method: 'get', path: '/api/projects' },
  { method: 'post', path: '/api/projects' },
  { method: 'get', path: '/api/projects/{projectId}' },
  { method: 'patch', path: '/api/projects/{projectId}' },
  { method: 'delete', path: '/api/projects/{projectId}' },
  { method: 'get', path: '/api/projects/{projectId}/flows' },
  { method: 'post', path: '/api/projects/{projectId}/flows' },
  { method: 'get', path: '/api/projects/{projectId}/flows/{flowId}' },
  { method: 'patch', path: '/api/projects/{projectId}/flows/{flowId}' },
  { method: 'delete', path: '/api/projects/{projectId}/flows/{flowId}' },
  {
    method: 'post',
    path: '/api/projects/{projectId}/flows/{flowId}/duplicate',
  },
  {
    method: 'get',
    path: '/api/projects/{projectId}/flows/{flowId}/versions',
  },
  {
    method: 'get',
    path: '/api/projects/{projectId}/flows/{flowId}/versions/{versionNumber}',
  },
  {
    method: 'post',
    path: '/api/projects/{projectId}/flows/{flowId}/versions/{versionNumber}/restore',
  },
  { method: 'post', path: '/api/bundle' },
] as const;

describe('API contract', () => {
  it('baseline spec has paths', () => {
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
  });

  for (const ep of MCP_ENDPOINTS) {
    it(`${ep.method.toUpperCase()} ${ep.path}`, () => {
      const pathEntry = spec.paths[ep.path];
      expect(pathEntry).toBeDefined();
      expect(pathEntry[ep.method]).toBeDefined();
    });
  }
});
