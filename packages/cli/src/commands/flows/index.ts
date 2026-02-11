import { apiRequest, requireProjectId } from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { writeResult } from '../../core/output.js';
import type { GlobalOptions } from '../../types/global.js';

// === Programmatic API ===

export interface ListFlowsOptions {
  projectId?: string;
  sort?: 'name' | 'updated_at' | 'created_at';
  order?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export async function listFlows(
  options: ListFlowsOptions = {},
): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  const params = new URLSearchParams();
  if (options.sort) params.set('sort', options.sort);
  if (options.order) params.set('order', options.order);
  if (options.includeDeleted) params.set('include_deleted', 'true');
  const qs = params.toString();
  return apiRequest(`/api/projects/${id}/flows${qs ? `?${qs}` : ''}`);
}

export async function getFlow(options: {
  flowId: string;
  projectId?: string;
}): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  return apiRequest(`/api/projects/${id}/flows/${options.flowId}`);
}

export async function createFlow(options: {
  name: string;
  content: Record<string, unknown>;
  projectId?: string;
}): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  return apiRequest(`/api/projects/${id}/flows`, {
    method: 'POST',
    body: JSON.stringify({ name: options.name, content: options.content }),
  });
}

export async function updateFlow(options: {
  flowId: string;
  name?: string;
  content?: Record<string, unknown>;
  projectId?: string;
}): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  const body: Record<string, unknown> = {};
  if (options.name !== undefined) body.name = options.name;
  if (options.content !== undefined) body.content = options.content;
  return apiRequest(`/api/projects/${id}/flows/${options.flowId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteFlow(options: {
  flowId: string;
  projectId?: string;
}): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  return apiRequest(`/api/projects/${id}/flows/${options.flowId}`, {
    method: 'DELETE',
  });
}

export async function duplicateFlow(options: {
  flowId: string;
  name?: string;
  projectId?: string;
}): Promise<unknown> {
  const id = options.projectId ?? requireProjectId();
  const body = options.name ? { name: options.name } : {};
  return apiRequest(`/api/projects/${id}/flows/${options.flowId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
    : JSON.parse(await readStdin());
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

// Simple stdin reader for piped content
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      reject(new Error('Content required: use --content or pipe via stdin'));
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}
