import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Auth
import { registerAuthTools } from './tools/auth.js';
// Project
import { registerProjectTools } from './tools/projects.js';
// Flow
import { registerFlowTools } from './tools/flows.js';
// Deployment
import { registerDeploymentTools } from './tools/deployments.js';
// CLI
import { registerValidateTool } from './tools/validate.js';
import { registerBundleTool } from './tools/bundle.js';
import { registerSimulateTool } from './tools/simulate.js';
import { registerPushTool } from './tools/push.js';
// Package
import {
  registerPackageSearchTool,
  registerGetPackageSchemaTool,
} from './tools/package.js';
// Resources
import { registerPackageSchemaResources } from './resources/package-schemas.js';
import { registerFlowResources } from './resources/flows.js';

declare const __VERSION__: string;

const server = new McpServer({
  name: 'walkeros',
  version: __VERSION__,
});

// Auth (whoami)
registerAuthTools(server);

// Project (project_*)
registerProjectTools(server);

// Flow (flow_*)
registerFlowTools(server);

// Deployment (deployment_*, deploy_flow)
registerDeploymentTools(server);

// CLI (validate, bundle, simulate, push)
registerValidateTool(server);
registerBundleTool(server);
registerSimulateTool(server);
registerPushTool(server);

// Package (package_search, package_get)
registerPackageSearchTool(server);
registerGetPackageSchemaTool(server);

// Resources
registerPackageSchemaResources(server);
registerFlowResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('walkerOS MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
