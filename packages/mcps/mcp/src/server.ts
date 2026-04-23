import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ToolClient } from './tool-client.js';
import { registerFlowValidateTool } from './tools/validate.js';
import { registerFlowBundleTool } from './tools/bundle.js';
import { registerFlowSimulateTool } from './tools/simulate.js';
import { registerFlowPushTool } from './tools/push.js';
import { registerFlowExamplesTool } from './tools/examples.js';
import {
  registerPackageSearchTool,
  registerGetPackageSchemaTool,
} from './tools/package.js';
import { registerFlowLoadTool } from './tools/flow-load.js';
import { registerFeedbackTool } from './tools/feedback.js';
import { registerAuthTool } from './tools/auth.js';
import { registerProjectManageTool } from './tools/project-manage.js';
import { registerFlowManageTool } from './tools/flow-manage.js';
import { registerDeployTool } from './tools/deploy-manage.js';
import { registerPackageSchemaResources } from './resources/package-schemas.js';
import { registerReferenceResources } from './resources/references.js';
import { registerAddStepPrompt } from './prompts/add-step.js';
import { registerSetupMappingPrompt } from './prompts/setup-mapping.js';
import { registerManageContractPrompt } from './prompts/manage-contract.js';
import { registerUseDefinitionsPrompt } from './prompts/use-definitions.js';
import { SERVER_INSTRUCTIONS } from './instructions.js';

export interface Logger {
  debug?(message: string, meta?: Record<string, unknown>): void;
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

export interface CreateServerOptions {
  client: ToolClient;
  logger?: Logger;
  version?: string;
  catalogBaseUrl?: string;
}

export function createWalkerOSMcpServer(opts: CreateServerOptions): McpServer {
  const server = new McpServer(
    {
      name: 'walkeros-flow',
      version: opts.version ?? '0.0.0',
    },
    { instructions: SERVER_INSTRUCTIONS },
  );

  registerAuthTool(server, opts.client);
  registerProjectManageTool(server, opts.client);
  registerFlowManageTool(server, opts.client);
  registerDeployTool(server, opts.client);
  registerFeedbackTool(server, opts.client);

  registerFlowValidateTool(server);
  registerFlowBundleTool(server);
  registerFlowSimulateTool(server);
  registerFlowPushTool(server);
  registerFlowExamplesTool(server);
  registerFlowLoadTool(server);

  registerPackageSearchTool(server);
  registerGetPackageSchemaTool(server);

  registerPackageSchemaResources(server);
  registerReferenceResources(server);
  registerAddStepPrompt(server);
  registerSetupMappingPrompt(server);
  registerManageContractPrompt(server);
  registerUseDefinitionsPrompt(server);

  return server;
}
