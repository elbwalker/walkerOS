import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  setDefaultProject,
  getDefaultProject,
  listAllFlows,
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
  listPreviews,
  getPreview,
  createPreview,
  deletePreview,
  deploy,
  listDeployments,
  getDeploymentBySlug,
  deleteDeployment,
  requestDeviceCode,
  pollForToken,
  whoami,
  resolveToken,
  deleteConfig,
  feedback,
  getFeedbackPreference,
  setFeedbackPreference,
} from '@walkeros/cli';
import type {
  DeviceCodeResult,
  PollResult,
  ListFlowsOptions,
  DeployOptions,
  ListDeploymentsOptions,
  ListPreviewsOptions,
  GetPreviewOptions,
  CreatePreviewOptions,
  DeletePreviewOptions,
  FeedbackOptions,
} from '@walkeros/cli';

import type { ToolClient } from './tool-client.js';

/**
 * Default ToolClient implementation backed by @walkeros/cli. Every method
 * delegates to the CLI's programmatic API, which in turn talks to the
 * walkerOS app over HTTPS via openapi-fetch. Token resolution and the
 * base URL come from the CLI's config file and environment
 * (WALKEROS_TOKEN, APP_URL), so no constructor args are required.
 */
export class HttpToolClient implements ToolClient {
  async listProjects(): Promise<unknown> {
    return listProjects();
  }
  async getProject(options: { projectId?: string }): Promise<unknown> {
    return getProject(options);
  }
  async createProject(options: { name: string }): Promise<unknown> {
    return createProject(options);
  }
  async updateProject(options: {
    projectId?: string;
    name: string;
  }): Promise<unknown> {
    return updateProject(options);
  }
  async deleteProject(options: { projectId?: string }): Promise<unknown> {
    return deleteProject(options);
  }
  setDefaultProject(projectId: string): void {
    setDefaultProject(projectId);
  }
  getDefaultProject(): string | null {
    return getDefaultProject();
  }

  async listAllFlows(options?: {
    sort?: string;
    order?: 'asc' | 'desc';
    includeDeleted?: boolean;
  }): Promise<unknown> {
    return listAllFlows(options as Parameters<typeof listAllFlows>[0]);
  }
  async listFlows(options: ListFlowsOptions): Promise<unknown> {
    return listFlows(options);
  }
  async getFlow(options: {
    flowId: string;
    projectId?: string;
    fields?: string[];
  }): Promise<unknown> {
    return getFlow(options);
  }
  async createFlow(options: {
    name: string;
    content: Record<string, unknown>;
    projectId?: string;
  }): Promise<unknown> {
    return createFlow(options);
  }
  async updateFlow(options: {
    flowId: string;
    projectId?: string;
    name?: string;
    content?: Record<string, unknown>;
    mergePatch?: boolean;
  }): Promise<unknown> {
    return updateFlow(options);
  }
  async deleteFlow(options: {
    flowId: string;
    projectId?: string;
  }): Promise<unknown> {
    return deleteFlow(options);
  }
  async duplicateFlow(options: {
    flowId: string;
    name?: string;
    projectId?: string;
  }): Promise<unknown> {
    return duplicateFlow(options);
  }

  async listPreviews(options: ListPreviewsOptions): Promise<unknown> {
    return listPreviews(options);
  }
  async getPreview(options: GetPreviewOptions): Promise<unknown> {
    return getPreview(options);
  }
  async createPreview(options: CreatePreviewOptions): Promise<unknown> {
    return createPreview(options);
  }
  async deletePreview(options: DeletePreviewOptions): Promise<unknown> {
    return deletePreview(options);
  }

  async deploy(options: DeployOptions): Promise<unknown> {
    return deploy(options);
  }
  async listDeployments(options: ListDeploymentsOptions): Promise<unknown> {
    return listDeployments(options);
  }
  async getDeploymentBySlug(options: {
    slug: string;
    projectId?: string;
  }): Promise<unknown> {
    return getDeploymentBySlug(options);
  }
  async deleteDeployment(options: {
    slug: string;
    projectId?: string;
  }): Promise<unknown> {
    return deleteDeployment(options);
  }

  async requestDeviceCode(): Promise<DeviceCodeResult> {
    return requestDeviceCode();
  }
  async pollForToken(
    deviceCode: string,
    options?: { timeoutMs?: number },
  ): Promise<PollResult> {
    return pollForToken(deviceCode, options);
  }
  async whoami(): Promise<unknown> {
    return whoami();
  }
  resolveToken(): { token: string; source: 'env' | 'config' } | null {
    return resolveToken();
  }
  deleteConfig(): boolean {
    return deleteConfig();
  }

  async submitFeedback(text: string, options?: FeedbackOptions): Promise<void> {
    await feedback(text, options);
  }
  getFeedbackPreference(): boolean | undefined {
    return getFeedbackPreference();
  }
  setFeedbackPreference(anonymous: boolean): void {
    setFeedbackPreference(anonymous);
  }
}
