import type { ToolClient } from './tool-client.js';
import type { ToolSpec } from './tool-spec.js';

import { createAuthToolSpec } from './tools/auth.js';
import { createProjectManageToolSpec } from './tools/project-manage.js';
import { createFlowManageToolSpec } from './tools/flow-manage.js';
import { createDeployManageToolSpec } from './tools/deploy-manage.js';
import { createFeedbackToolSpec } from './tools/feedback.js';

import { createFlowValidateToolSpec } from './tools/validate.js';
import { createFlowBundleToolSpec } from './tools/bundle.js';
import { createFlowSimulateToolSpec } from './tools/simulate.js';
import { createFlowPushToolSpec } from './tools/push.js';
import { createFlowExamplesToolSpec } from './tools/examples.js';
import { createFlowLoadToolSpec } from './tools/flow-load.js';
import {
  createPackageSearchToolSpec,
  createPackageGetToolSpec,
} from './tools/package.js';

export {
  createWalkerOSMcpServer,
  type CreateServerOptions,
  type Logger,
} from './server.js';
export type { ToolClient } from './tool-client.js';
export { HttpToolClient } from './http-tool-client.js';
export {
  createStreamableHttpHandler,
  type CreateStreamableHttpHandlerOptions,
} from './http.js';
export {
  TOOL_DEFINITIONS,
  type ToolDefinition,
  type ToolAnnotations,
} from './tool-definitions.js';

export type { ToolSpec } from './tool-spec.js';

/**
 * Handler-bearing spec for every tool `createWalkerOSMcpServer` registers.
 *
 * Consumers that need to drive the tools WITHOUT an `McpServer` (e.g., the
 * walkerOS app's chat route wrapping them as Vercel AI SDK tools) should call
 * `createToolHandlers(client)` and iterate the returned record. Handlers are
 * closed over `client`, so the caller can bind a single `ToolClient` (such as
 * the zero-hop `ServiceToolClient`) once per session.
 */
export function createToolHandlers(
  client: ToolClient,
): Record<string, ToolSpec> {
  const specs: ToolSpec[] = [
    createAuthToolSpec(client),
    createProjectManageToolSpec(client),
    createFlowManageToolSpec(client),
    createDeployManageToolSpec(client),
    createFeedbackToolSpec(client),
    createFlowValidateToolSpec(),
    createFlowBundleToolSpec(),
    createFlowSimulateToolSpec(),
    createFlowPushToolSpec(),
    createFlowExamplesToolSpec(),
    createFlowLoadToolSpec(),
    createPackageSearchToolSpec(),
    createPackageGetToolSpec(),
  ];
  return Object.fromEntries(specs.map((s) => [s.name, s]));
}

export type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
