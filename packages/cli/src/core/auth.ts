import {
  resolveToken,
  resolveDeployToken,
  getDefaultProject,
} from '../lib/config-file.js';

export function getToken(): string | undefined {
  const result = resolveToken();
  return result?.token;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Resolve token for runtime operations (run command, heartbeat, polling).
 * Priority: WALKEROS_DEPLOY_TOKEN > WALKEROS_TOKEN > config file
 */
export function resolveRunToken(): string | null {
  return resolveDeployToken() ?? resolveToken()?.token ?? null;
}

export function requireProjectId(): string {
  const projectId = process.env.WALKEROS_PROJECT_ID || getDefaultProject();
  if (!projectId)
    throw new Error(
      'No project selected. Set WALKEROS_PROJECT_ID or configure a default project.',
    );
  return projectId;
}
