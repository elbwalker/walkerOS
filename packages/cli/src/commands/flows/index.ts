import { createApiClient } from '../../core/api-client.js';
import { requireProjectId } from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
import { isStdinPiped, readStdin } from '../../core/stdin.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

export interface ListFlowsOptions {
  projectId?: string;
  sort?: 'name' | 'updated_at' | 'created_at';
  order?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export async function listFlows(options: ListFlowsOptions = {}) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const { data, error } = await client.GET('/api/projects/{projectId}/flows', {
    params: {
      path: { projectId: id },
      query: {
        sort: options.sort,
        order: options.order,
        include_deleted: options.includeDeleted ? 'true' : undefined,
      },
    },
  });
  if (error) throw new Error(error.error?.message || 'Failed to list flows');
  return data;
}

export async function getFlow(options: { flowId: string; projectId?: string }) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const { data, error } = await client.GET(
    '/api/projects/{projectId}/flows/{flowId}',
    {
      params: { path: { projectId: id, flowId: options.flowId } },
    },
  );
  if (error) throw new Error(error.error?.message || 'Failed to get flow');
  return data;
}

export async function createFlow(options: {
  name: string;
  content: Record<string, unknown>;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const { data, error } = await client.POST('/api/projects/{projectId}/flows', {
    params: { path: { projectId: id } },
    // Content is user-provided JSON; server validates the full schema
    body: { name: options.name, content: options.content } as never,
  });
  if (error) throw new Error(error.error?.message || 'Failed to create flow');
  return data;
}

export async function updateFlow(options: {
  flowId: string;
  name?: string;
  content?: Record<string, unknown>;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const body: Record<string, unknown> = {};
  if (options.name !== undefined) body.name = options.name;
  if (options.content !== undefined) body.content = options.content;
  const { data, error } = await client.PATCH(
    '/api/projects/{projectId}/flows/{flowId}',
    {
      params: { path: { projectId: id, flowId: options.flowId } },
      // Dynamically constructed body; server validates the full schema
      body: body as never,
    },
  );
  if (error) throw new Error(error.error?.message || 'Failed to update flow');
  return data;
}

export async function deleteFlow(options: {
  flowId: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const { data, error } = await client.DELETE(
    '/api/projects/{projectId}/flows/{flowId}',
    {
      params: { path: { projectId: id, flowId: options.flowId } },
    },
  );
  if (error) throw new Error(error.error?.message || 'Failed to delete flow');
  return data ?? { success: true };
}

export async function duplicateFlow(options: {
  flowId: string;
  name?: string;
  projectId?: string;
}) {
  const id = options.projectId ?? requireProjectId();
  const client = createApiClient();
  const { data, error } = await client.POST(
    '/api/projects/{projectId}/flows/{flowId}/duplicate',
    {
      params: { path: { projectId: id, flowId: options.flowId } },
      body: { name: options.name },
    },
  );
  if (error)
    throw new Error(error.error?.message || 'Failed to duplicate flow');
  return data;
}

// === CLI Command Handlers ===

interface FlowsCommandOptions extends GlobalOptions {
  json?: boolean;
  output?: string;
  project?: string;
}

async function handleResult(
  fn: () => Promise<unknown>,
  options: FlowsCommandOptions,
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

export async function listFlowsCommand(
  options: FlowsCommandOptions & {
    sort?: string;
    order?: string;
    includeDeleted?: boolean;
  },
): Promise<void> {
  await handleResult(
    () =>
      listFlows({
        projectId: options.project,
        sort: options.sort as ListFlowsOptions['sort'],
        order: options.order as ListFlowsOptions['order'],
        includeDeleted: options.includeDeleted,
      }),
    options,
  );
}

export async function getFlowCommand(
  flowId: string,
  options: FlowsCommandOptions,
): Promise<void> {
  await handleResult(
    () => getFlow({ flowId, projectId: options.project }),
    options,
  );
}

export async function createFlowCommand(
  name: string,
  options: FlowsCommandOptions & { content?: string },
): Promise<void> {
  const content = options.content
    ? JSON.parse(options.content)
    : JSON.parse(await readFlowStdin());
  await handleResult(
    () => createFlow({ name, content, projectId: options.project }),
    options,
  );
}

export async function updateFlowCommand(
  flowId: string,
  options: FlowsCommandOptions & { name?: string; content?: string },
): Promise<void> {
  const content = options.content ? JSON.parse(options.content) : undefined;
  await handleResult(
    () =>
      updateFlow({
        flowId,
        name: options.name,
        content,
        projectId: options.project,
      }),
    options,
  );
}

export async function deleteFlowCommand(
  flowId: string,
  options: FlowsCommandOptions,
): Promise<void> {
  await handleResult(
    () => deleteFlow({ flowId, projectId: options.project }),
    options,
  );
}

export async function duplicateFlowCommand(
  flowId: string,
  options: FlowsCommandOptions & { name?: string },
): Promise<void> {
  await handleResult(
    () =>
      duplicateFlow({ flowId, name: options.name, projectId: options.project }),
    options,
  );
}

async function readFlowStdin(): Promise<string> {
  if (!isStdinPiped()) {
    throw new Error('Content required: use --content or pipe via stdin');
  }
  return readStdin();
}
