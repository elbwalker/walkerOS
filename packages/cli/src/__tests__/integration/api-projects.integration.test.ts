/**
 * Integration test: real API client → MSW → typed mock responses.
 * If the OpenAPI spec changes, the mock data in msw-handlers.ts will
 * fail to compile (satisfies), catching contract drift at build time.
 */

import '../helpers/setup-msw.js';

jest.mock('../../core/auth.js', () => ({
  getToken: jest.fn().mockReturnValue('test-token'),
  resolveBaseUrl: jest.fn().mockReturnValue('https://api.test.local'),
  requireProjectId: jest.fn().mockReturnValue('proj_test123'),
}));

import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../../commands/projects/index.js';
import { mockProject } from '../helpers/msw-handlers.js';

describe('projects (integration via MSW)', () => {
  it('listProjects returns typed project list', async () => {
    const result = await listProjects();
    expect(result).toEqual({ projects: [mockProject], total: 1 });
  });

  it('getProject returns a single project', async () => {
    const result = await getProject({ projectId: 'proj_test123' });
    expect(result).toEqual(mockProject);
  });

  it('createProject sends name and returns project', async () => {
    const result = await createProject({ name: 'New Project' });
    expect(result).toEqual({ ...mockProject, name: 'New Project' });
  });

  it('updateProject patches and returns updated project', async () => {
    const result = await updateProject({
      projectId: 'proj_test123',
      name: 'Renamed',
    });
    expect(result).toEqual({ ...mockProject, name: 'Renamed' });
  });

  it('deleteProject returns success', async () => {
    const result = await deleteProject({ projectId: 'proj_test123' });
    expect(result).toEqual({ success: true });
  });
});
