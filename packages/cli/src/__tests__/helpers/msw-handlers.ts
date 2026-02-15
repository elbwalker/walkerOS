import { http, HttpResponse } from 'msw';
import type { paths } from '../../types/api.gen.js';

// Extract response types from the spec
type ProjectsResponse =
  paths['/api/projects']['get']['responses']['200']['content']['application/json'];
type ProjectResponse =
  paths['/api/projects/{projectId}']['get']['responses']['200']['content']['application/json'];
type FlowsResponse =
  paths['/api/projects/{projectId}/flows']['get']['responses']['200']['content']['application/json'];
type FlowResponse =
  paths['/api/projects/{projectId}/flows/{flowId}']['get']['responses']['200']['content']['application/json'];
type WhoamiResponse =
  paths['/api/auth/whoami']['get']['responses']['200']['content']['application/json'];

// If the API spec changes these shapes, TypeScript will error HERE
export const mockProject = {
  id: 'proj_test123',
  name: 'Test Project',
  role: 'owner' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} satisfies ProjectResponse;

export const mockFlow = {
  id: 'flow_test456',
  name: 'Test Flow',
  content: {
    version: 1 as const,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
} satisfies FlowResponse;

export const mockWhoami = {
  userId: 'user_test789',
  email: 'test@example.com',
  projectId: null,
} satisfies WhoamiResponse;

export const handlers = [
  // Auth
  http.get('*/api/auth/whoami', () => {
    return HttpResponse.json(mockWhoami satisfies WhoamiResponse);
  }),

  // Projects
  http.get('*/api/projects', () => {
    const body: ProjectsResponse = { projects: [mockProject], total: 1 };
    return HttpResponse.json(body);
  }),
  http.post('*/api/projects', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json(
      { ...mockProject, name: body.name } satisfies ProjectResponse,
      { status: 201 },
    );
  }),
  http.get('*/api/projects/:projectId', () => {
    return HttpResponse.json(mockProject satisfies ProjectResponse);
  }),
  http.patch('*/api/projects/:projectId', async ({ request }) => {
    const body = (await request.json()) as { name?: string };
    return HttpResponse.json({
      ...mockProject,
      ...(body.name && { name: body.name }),
    } satisfies ProjectResponse);
  }),
  http.delete('*/api/projects/:projectId', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Flows
  http.get('*/api/projects/:projectId/flows', () => {
    const body: FlowsResponse = {
      flows: [
        {
          id: mockFlow.id,
          name: mockFlow.name,
          createdAt: mockFlow.createdAt,
          updatedAt: mockFlow.updatedAt,
          deletedAt: null,
        },
      ],
      total: 1,
    };
    return HttpResponse.json(body);
  }),
  http.get('*/api/projects/:projectId/flows/:flowId', () => {
    return HttpResponse.json(mockFlow satisfies FlowResponse);
  }),
  http.post('*/api/projects/:projectId/flows', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json(
      { ...mockFlow, name: body.name } satisfies FlowResponse,
      { status: 201 },
    );
  }),
  http.patch('*/api/projects/:projectId/flows/:flowId', () => {
    return HttpResponse.json(mockFlow satisfies FlowResponse);
  }),
  http.delete('*/api/projects/:projectId/flows/:flowId', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/api/projects/:projectId/flows/:flowId/duplicate', () => {
    return HttpResponse.json(
      { ...mockFlow, id: 'flow_copy789' } satisfies FlowResponse,
      { status: 201 },
    );
  }),
];
