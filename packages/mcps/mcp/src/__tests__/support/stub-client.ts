import type { ToolClient } from '../../tool-client.js';

export function stubClient(overrides: Partial<ToolClient> = {}): ToolClient {
  const notImpl = async () => {
    throw new Error('not implemented');
  };
  const base: ToolClient = {
    listProjects: notImpl,
    getProject: notImpl,
    createProject: notImpl,
    updateProject: notImpl,
    deleteProject: notImpl,
    setDefaultProject: () => {},
    getDefaultProject: () => null,
    listAllFlows: notImpl,
    listFlows: notImpl,
    getFlow: notImpl,
    createFlow: notImpl,
    updateFlow: notImpl,
    deleteFlow: notImpl,
    duplicateFlow: notImpl,
    listPreviews: notImpl,
    getPreview: notImpl,
    createPreview: notImpl,
    deletePreview: notImpl,
    deploy: notImpl,
    listDeployments: notImpl,
    getDeploymentBySlug: notImpl,
    deleteDeployment: notImpl,
    requestDeviceCode: notImpl,
    pollForToken: notImpl,
    whoami: notImpl,
    resolveToken: () => null,
    deleteConfig: () => false,
    submitFeedback: notImpl,
    getFeedbackPreference: () => undefined,
    setFeedbackPreference: () => {},
  };
  return { ...base, ...overrides };
}
