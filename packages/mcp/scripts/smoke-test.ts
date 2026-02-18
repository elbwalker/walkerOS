/**
 * Smoke test for MCP API tools against a running walkerOS app.
 *
 * Tests the API endpoints the MCP package calls (auth, projects, flows,
 * bundle), using the same HTTP methods and paths. Self-cleaning: creates
 * and deletes its own data.
 *
 * Prerequisites:
 *   - App running locally: cd app && npm run dev:app
 *   - Database seeded: npm run db:seed (creates dev token)
 *
 * Usage:
 *   WALKEROS_TOKEN='sk-walkeros-0000...0' \
 *   WALKEROS_APP_URL=http://localhost:3000 \
 *   WALKEROS_PROJECT_ID=proj_dev \
 *   npx tsx packages/mcp/scripts/smoke-test.ts
 */

const TOKEN = process.env.WALKEROS_TOKEN;
const BASE_URL = process.env.WALKEROS_APP_URL || 'http://localhost:3000';
const PROJECT_ID = process.env.WALKEROS_PROJECT_ID;

if (!TOKEN) {
  console.error('WALKEROS_TOKEN is required');
  process.exit(1);
}
if (!PROJECT_ID) {
  console.error('WALKEROS_PROJECT_ID is required');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

let passed = 0;
let failed = 0;

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err instanceof Error ? err.message : err}`);
  }
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

// --- Test sequence ---

console.log(`\nSmoke test against ${BASE_URL}\n`);

// 1. Auth
await test('whoami', async () => {
  const res = await api('GET', '/api/auth/whoami');
  assert(res.ok, `Expected 200, got ${res.status}`);
  const data = (await res.json()) as { userId: string; email: string };
  assert(typeof data.userId === 'string', 'Missing userId');
  assert(typeof data.email === 'string', 'Missing email');
});

// 2. List projects
await test('list-projects', async () => {
  const res = await api('GET', '/api/projects');
  assert(res.ok, `Expected 200, got ${res.status}`);
  const data = (await res.json()) as { projects: unknown[]; total: number };
  assert(Array.isArray(data.projects), 'Missing projects array');
  assert(typeof data.total === 'number', 'Missing total');
});

// 3. Get project
await test('get-project', async () => {
  const res = await api('GET', `/api/projects/${PROJECT_ID}`);
  assert(res.ok, `Expected 200, got ${res.status}`);
  const data = (await res.json()) as { id: string };
  assert(data.id === PROJECT_ID, `Expected id=${PROJECT_ID}`);
});

// 4. Create project (we'll clean it up at the end)
let smokeProjectId = '';
await test('create-project', async () => {
  const res = await api('POST', '/api/projects', { name: 'MCP Smoke Test' });
  assert(res.status === 201, `Expected 201, got ${res.status}`);
  const data = (await res.json()) as { id: string; name: string };
  assert(typeof data.id === 'string', 'Missing id');
  assert(data.name === 'MCP Smoke Test', 'Wrong name');
  smokeProjectId = data.id;
});

// 5. Update project
await test('update-project', async () => {
  assert(!!smokeProjectId, 'No project to update');
  const res = await api('PATCH', `/api/projects/${smokeProjectId}`, {
    name: 'MCP Smoke Renamed',
  });
  assert(res.ok, `Expected 200, got ${res.status}`);
  const data = (await res.json()) as { name: string };
  assert(data.name === 'MCP Smoke Renamed', 'Name not updated');
});

// 6. Create flow
let smokeFlowId = '';
const flowContent = {
  version: 1,
  flows: {
    default: {
      web: { destinations: [] },
    },
  },
};

await test('create-flow', async () => {
  assert(!!smokeProjectId, 'No project for flow');
  const res = await api('POST', `/api/projects/${smokeProjectId}/flows`, {
    name: 'Smoke Flow',
    content: flowContent,
  });
  assert(res.status === 201, `Expected 201, got ${res.status}`);
  const data = (await res.json()) as { id: string };
  assert(typeof data.id === 'string', 'Missing flow id');
  smokeFlowId = data.id;
});

// 7. List flows
await test('list-flows', async () => {
  assert(!!smokeProjectId, 'No project');
  const res = await api('GET', `/api/projects/${smokeProjectId}/flows`);
  assert(res.ok, `Expected 200, got ${res.status}`);
  const data = (await res.json()) as { flows: unknown[]; total: number };
  assert(Array.isArray(data.flows), 'Missing flows array');
  assert(data.total >= 1, 'Expected at least 1 flow');
});

// 8. Get flow
await test('get-flow', async () => {
  assert(!!smokeFlowId, 'No flow');
  const res = await api(
    'GET',
    `/api/projects/${smokeProjectId}/flows/${smokeFlowId}`,
  );
  assert(res.ok, `Expected 200, got ${res.status}`);
  const data = (await res.json()) as { id: string; content: unknown };
  assert(data.id === smokeFlowId, 'Wrong flow id');
  assert(typeof data.content === 'object', 'Missing content');
});

// 9. Update flow
await test('update-flow', async () => {
  assert(!!smokeFlowId, 'No flow');
  const res = await api(
    'PATCH',
    `/api/projects/${smokeProjectId}/flows/${smokeFlowId}`,
    { content: { ...flowContent, variables: { env: 'updated' } } },
  );
  assert(res.ok, `Expected 200, got ${res.status}`);
});

// 10. Duplicate flow
let dupFlowId = '';
await test('duplicate-flow', async () => {
  assert(!!smokeFlowId, 'No flow');
  const res = await api(
    'POST',
    `/api/projects/${smokeProjectId}/flows/${smokeFlowId}/duplicate`,
    {},
  );
  assert(res.status === 201, `Expected 201, got ${res.status}`);
  const data = (await res.json()) as { id: string };
  assert(typeof data.id === 'string', 'Missing duplicate id');
  dupFlowId = data.id;
});

// 11. Delete duplicate flow
await test('delete-flow', async () => {
  assert(!!dupFlowId, 'No duplicate flow');
  const res = await api(
    'DELETE',
    `/api/projects/${smokeProjectId}/flows/${dupFlowId}`,
  );
  assert(res.status === 204, `Expected 204, got ${res.status}`);
});

// 12. Delete smoke project (cleans up all associated data)
await test('delete-project', async () => {
  assert(!!smokeProjectId, 'No project');
  const res = await api('DELETE', `/api/projects/${smokeProjectId}`);
  assert(res.status === 204, `Expected 204, got ${res.status}`);
});

// 13. Bundle remote
await test('bundle-remote', async () => {
  const res = await api('POST', '/api/bundle', {
    flow: {
      version: 1,
      flows: {
        default: {
          web: { destinations: [] },
        },
      },
    },
  });
  assert(res.ok, `Expected 200, got ${res.status}`);
  const contentType = res.headers.get('content-type');
  assert(
    contentType?.includes('javascript') === true,
    `Expected javascript content-type, got ${contentType}`,
  );
});

// --- Summary ---
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
