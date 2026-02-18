import { createApiClient } from '../../core/api-client.js';
import { requireProjectId } from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

export async function listProjects() {
  const client = createApiClient();
  const { data, error } = await client.GET('/api/projects');
  if (error) throw new Error(error.error?.message || 'Failed to list projects');
  return data;
}

export async function getProject(options: { projectId?: string } = {}) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const { data, error } = await client.GET('/api/projects/{projectId}', {
    params: { path: { projectId: id } },
  });
  if (error) throw new Error(error.error?.message || 'Failed to get project');
  return data;
}

export async function createProject(options: { name: string }) {
  const client = createApiClient();
  const { data, error } = await client.POST('/api/projects', {
    body: { name: options.name },
  });
  if (error)
    throw new Error(error.error?.message || 'Failed to create project');
  return data;
}

export async function updateProject(options: {
  projectId?: string;
  name: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const { data, error } = await client.PATCH('/api/projects/{projectId}', {
    params: { path: { projectId: id } },
    body: { name: options.name },
  });
  if (error)
    throw new Error(error.error?.message || 'Failed to update project');
  return data;
}

export async function deleteProject(options: { projectId?: string } = {}) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const { data, error } = await client.DELETE('/api/projects/{projectId}', {
    params: { path: { projectId: id } },
  });
  if (error)
    throw new Error(error.error?.message || 'Failed to delete project');
  return data ?? { success: true };
}

// === CLI Command Handlers ===

interface ProjectsCommandOptions extends GlobalOptions {
  json?: boolean;
  output?: string;
  project?: string;
  name?: string;
}

async function handleResult(
  fn: () => Promise<unknown>,
  options: ProjectsCommandOptions,
): Promise<void> {
  const logger = createCommandLogger(options);
  try {
    const result = await fn();
    await writeResult(JSON.stringify(result, null, 2), options);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export async function listProjectsCommand(
  options: ProjectsCommandOptions,
): Promise<void> {
  await handleResult(() => listProjects(), options);
}

export async function getProjectCommand(
  projectId: string | undefined,
  options: ProjectsCommandOptions,
): Promise<void> {
  await handleResult(
    () => getProject({ projectId: projectId ?? options.project }),
    options,
  );
}

export async function createProjectCommand(
  name: string,
  options: ProjectsCommandOptions,
): Promise<void> {
  await handleResult(() => createProject({ name }), options);
}

export async function updateProjectCommand(
  projectId: string | undefined,
  options: ProjectsCommandOptions,
): Promise<void> {
  const name = options.name;
  if (!name) {
    throw new Error('Missing required option: --name <name>');
  }
  await handleResult(
    () =>
      updateProject({
        projectId: projectId ?? options.project,
        name,
      }),
    options,
  );
}

export async function deleteProjectCommand(
  projectId: string | undefined,
  options: ProjectsCommandOptions,
): Promise<void> {
  await handleResult(
    () => deleteProject({ projectId: projectId ?? options.project }),
    options,
  );
}
