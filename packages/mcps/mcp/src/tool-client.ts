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

/**
 * Transport-agnostic client for network-reach MCP tools. The stdio build
 * plugs in HttpToolClient (talks to the walkerOS app over HTTPS via the
 * CLI's programmatic API). In-process hosts (e.g. the app itself) can plug
 * in a direct client that calls database helpers without HTTP overhead.
 */
export interface ToolClient {
  // Projects
  listProjects(): Promise<unknown>;
  getProject(options: { projectId?: string }): Promise<unknown>;
  createProject(options: { name: string }): Promise<unknown>;
  updateProject(options: {
    projectId?: string;
    name: string;
  }): Promise<unknown>;
  deleteProject(options: { projectId?: string }): Promise<unknown>;
  setDefaultProject(projectId: string): void;
  getDefaultProject(): string | null;

  // Flows
  listAllFlows(options?: {
    sort?: string;
    order?: 'asc' | 'desc';
    includeDeleted?: boolean;
  }): Promise<unknown>;
  listFlows(options: ListFlowsOptions): Promise<unknown>;
  getFlow(options: {
    flowId: string;
    projectId?: string;
    fields?: string[];
  }): Promise<unknown>;
  createFlow(options: {
    name: string;
    content: Record<string, unknown>;
    projectId?: string;
  }): Promise<unknown>;
  updateFlow(options: {
    flowId: string;
    projectId?: string;
    name?: string;
    content?: Record<string, unknown>;
    mergePatch?: boolean;
  }): Promise<unknown>;
  deleteFlow(options: { flowId: string; projectId?: string }): Promise<unknown>;
  duplicateFlow(options: {
    flowId: string;
    name?: string;
    projectId?: string;
  }): Promise<unknown>;

  // Previews
  listPreviews(options: ListPreviewsOptions): Promise<unknown>;
  getPreview(options: GetPreviewOptions): Promise<unknown>;
  createPreview(options: CreatePreviewOptions): Promise<unknown>;
  deletePreview(options: DeletePreviewOptions): Promise<unknown>;

  // Deployments
  deploy(options: DeployOptions): Promise<unknown>;
  listDeployments(options: ListDeploymentsOptions): Promise<unknown>;
  getDeploymentBySlug(options: {
    slug: string;
    projectId?: string;
  }): Promise<unknown>;
  deleteDeployment(options: {
    slug: string;
    projectId?: string;
  }): Promise<unknown>;

  // Auth
  requestDeviceCode(): Promise<DeviceCodeResult>;
  pollForToken(
    deviceCode: string,
    options?: { timeoutMs?: number },
  ): Promise<PollResult>;
  whoami(): Promise<unknown>;
  resolveToken(): { token: string; source: 'env' | 'config' } | null;
  deleteConfig(): boolean;

  // Feedback
  submitFeedback(text: string, options?: FeedbackOptions): Promise<void>;
  getFeedbackPreference(): boolean | undefined;
  setFeedbackPreference(anonymous: boolean): void;
}
