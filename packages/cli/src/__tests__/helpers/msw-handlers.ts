import { http, HttpResponse } from 'msw';
import type { paths } from '../../types/api.gen.js';

// Extract response types from the spec. The project endpoints return three
// distinct shapes: the list returns the full record, get-by-id returns a
// narrower detail view, and create returns only the freshly written fields.
type ProjectsResponse =
  paths['/api/projects']['get']['responses']['200']['content']['application/json'];
type CreateProjectResponse =
  paths['/api/projects']['post']['responses']['201']['content']['application/json'];
type ProjectDetailResponse =
  paths['/api/projects/{projectId}']['get']['responses']['200']['content']['application/json'];
type UpdateProjectResponse =
  paths['/api/projects/{projectId}']['patch']['responses']['200']['content']['application/json'];
// The full project record, as carried by the list endpoint.
type Project = ProjectsResponse['projects'][number];
type FlowsResponse =
  paths['/api/projects/{projectId}/flows']['get']['responses']['200']['content']['application/json'];
type FlowResponse =
  paths['/api/projects/{projectId}/flows/{flowId}']['get']['responses']['200']['content']['application/json'];
type WhoamiResponse =
  paths['/api/auth/whoami']['get']['responses']['200']['content']['application/json'];

// If the API spec changes these shapes, TypeScript will error HERE.
// Full record returned by the list endpoint.
export const mockProject = {
  id: 'proj_test123',
  name: 'Test Project',
  role: 'owner' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  memberCount: 1,
  flowCount: 0,
  deploymentCount: 0,
  isDemo: false,
} satisfies Project;

// Narrower view returned by GET /api/projects/:projectId.
export const mockProjectDetail = {
  id: mockProject.id,
  name: mockProject.name,
  siteUrl: null,
  role: mockProject.role,
} satisfies ProjectDetailResponse;

// POST /api/projects returns only the freshly written fields.
export const mockCreatedProject = {
  id: mockProject.id,
  name: mockProject.name,
  createdAt: mockProject.createdAt,
} satisfies CreateProjectResponse;

export const mockFlow = {
  id: 'flow_test456',
  name: 'Test Flow',
  config: {
    version: 4 as const,
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
    const body: ProjectsResponse = {
      projects: [mockProject],
      total: 1,
      nextCursor: null,
    };
    return HttpResponse.json(body);
  }),
  http.post('*/api/projects', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json(
      {
        ...mockCreatedProject,
        name: body.name,
      } satisfies CreateProjectResponse,
      { status: 201 },
    );
  }),
  http.get('*/api/projects/:projectId', () => {
    return HttpResponse.json(mockProjectDetail satisfies ProjectDetailResponse);
  }),
  http.patch('*/api/projects/:projectId', async ({ request }) => {
    const body = (await request.json()) as { name?: string };
    return HttpResponse.json({
      id: mockProject.id,
      name: body.name ?? mockProject.name,
      updatedAt: mockProject.updatedAt,
    } satisfies UpdateProjectResponse);
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
      nextCursor: null,
    };
    return HttpResponse.json(body);
  }),
  http.get('*/api/projects/:projectId/flows/:flowId', () => {
    return HttpResponse.json(mockFlow);
  }),
  http.post('*/api/projects/:projectId/flows', async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({ ...mockFlow, name: body.name }, { status: 201 });
  }),
  http.patch('*/api/projects/:projectId/flows/:flowId', () => {
    return HttpResponse.json(mockFlow);
  }),
  http.delete('*/api/projects/:projectId/flows/:flowId', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/api/projects/:projectId/flows/:flowId/duplicate', () => {
    return HttpResponse.json(
      { ...mockFlow, id: 'flow_copy789' },
      { status: 201 },
    );
  }),
];
