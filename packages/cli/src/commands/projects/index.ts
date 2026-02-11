import { apiRequest, requireProjectId } from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

export async function listProjects(): Promise<unknown> {
  return apiRequest('/api/projects');
}

export async function getProject(
  options: { projectId?: string } = {},
): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  return apiRequest(`/api/projects/${id}`);
}

export async function createProject(options: {
  name: string;
}): Promise<unknown> {
  return apiRequest('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name: options.name }),
  });
}

export async function updateProject(options: {
  projectId?: string;
  name: string;
}): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  return apiRequest(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: options.name }),
  });
}

export async function deleteProject(
  options: { projectId?: string } = {},
): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  return apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
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
