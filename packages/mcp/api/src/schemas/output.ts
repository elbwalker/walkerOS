import { z } from 'zod';

/**
 * MCP output schemas — must match what the walkerOS API actually returns.
 *
 * Source of truth: app route handlers in app/src/app/api/.
 * The OpenAPI spec (cli/openapi/spec.json) and generated types (api.gen.d.ts)
 * may be stale. When in doubt, check the actual route handler.
 *
 * NOTE: Different endpoints for the same resource may return different field
 * subsets (e.g., POST /projects returns {id, name, createdAt} while
 * GET /projects/{id} returns {id, name, role}). Fields that are absent from
 * some endpoints are marked optional here.
 */

// Shared primitives
const timestamp = z.string().describe('ISO 8601 timestamp');
const projectId = z.string().describe('Project ID (proj_...)');
const flowId = z.string().describe('Flow ID (flow_... or cfg_...)');

// Error shape (for reference)
export const ErrorOutputShape = {
  error: z.string().describe('Error message'),
};

// Auth output shapes
export const WhoamiOutputShape = {
  userId: z.string().describe('User ID'),
  email: z.string().describe('User email address'),
  projectId: z
    .string()
    .nullable()
    .describe('Project ID if token is project-scoped'),
};

// Project output shapes
//
// The API returns different fields per endpoint:
//   POST   /projects          → {id, name, createdAt}
//   GET    /projects          → {id, name, role, createdAt, updatedAt} (list)
//   GET    /projects/{id}     → {id, name, role}
//   PATCH  /projects/{id}     → {id, name, updatedAt}
//   DELETE /projects/{id}     → 204 No Content
//
// Fields that may be absent are optional.
const projectRole = z
  .enum(['owner', 'admin', 'member', 'deployer', 'viewer'])
  .describe('Your role in this project');

const projectFields = {
  id: projectId,
  name: z.string().describe('Project name'),
  role: projectRole.optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
};

export const ProjectOutputShape = { ...projectFields };

// List projects always returns full Project objects with all fields
const listProjectFields = {
  id: projectId,
  name: z.string().describe('Project name'),
  role: projectRole,
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const ListProjectsOutputShape = {
  projects: z.array(z.object(listProjectFields)).describe('List of projects'),
  total: z.number().describe('Total number of projects'),
};

// Flow output shapes
const flowFields = {
  id: flowId,
  name: z.string().describe('Flow name'),
  content: z
    .record(z.string(), z.unknown())
    .describe('Flow.Setup JSON content'),
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: z
    .string()
    .nullable()
    .optional()
    .describe('Deletion timestamp if soft-deleted'),
};

export const FlowOutputShape = { ...flowFields };

export const FlowWriteOutputShape = {
  id: flowId,
  name: z.string().describe('Flow name'),
  createdAt: timestamp,
  updatedAt: timestamp,
};

const flowSummaryFields = {
  id: flowId,
  name: z.string().describe('Flow name'),
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: z
    .string()
    .nullable()
    .describe('Deletion timestamp if soft-deleted'),
};

export const ListFlowsOutputShape = {
  flows: z
    .array(z.object(flowSummaryFields))
    .describe('List of flow summaries'),
  total: z.number().describe('Total number of flows'),
};

// Delete output shape (shared)
export const DeleteOutputShape = {
  success: z.literal(true).describe('Deletion succeeded'),
};

// Bundle Remote output shape
export const BundleRemoteOutputShape = {
  success: z.boolean().describe('Whether bundling succeeded'),
  bundle: z.string().describe('Compiled JavaScript bundle'),
  size: z.number().describe('Bundle size in bytes'),
  stats: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Bundle statistics from server'),
};

// Deployment shared primitives
//
// The app's deployment model has evolved. Current statuses:
//   idle, deploying, published, active, stopped, failed
const deploymentStatus = z
  .string()
  .describe(
    'Deployment status (idle, deploying, published, active, stopped, failed)',
  );
const deploymentType = z.enum(['web', 'server']).describe('Deployment type');
const deploymentOrigin = z
  .enum(['cloud', 'self-hosted'])
  .optional()
  .describe('Deployment origin');

// Deploy flow output shape
//
// POST /flows/{flowId}/deploy returns:
//   {deploymentId, slug, target, type, status, configId?}
// When wait=true, the SSE stream result is merged in, adding:
//   {status, substatus?, containerUrl?, publicUrl?, errorMessage?, type?}
export const DeployFlowOutputShape = {
  deploymentId: z.string().describe('Deployment ID'),
  type: deploymentType,
  status: deploymentStatus,
  slug: z.string().optional().describe('Deployment slug'),
  target: z
    .string()
    .nullable()
    .optional()
    .describe('Target URL for the deployment'),
  configId: z
    .string()
    .optional()
    .describe('Config ID if deploying a specific named config'),
  publicUrl: z
    .string()
    .nullable()
    .optional()
    .describe('Public URL for web deployments'),
  containerUrl: z
    .string()
    .nullable()
    .optional()
    .describe('Container URL for server deployments'),
  errorMessage: z
    .string()
    .nullable()
    .optional()
    .describe('Error message if deployment failed'),
};

// Deployment output shape
//
// The app returns different shapes for different deployment endpoints:
//   GET /flows/{flowId}/deploy → formatDeployment() shape
//   GET /deployments/{slug}    → deploymentDetailResponse shape
//
// Common fields across both: id, slug, type, status, target, createdAt, updatedAt
// Some fields appear only in specific responses.
const deploymentFields = {
  id: z.string().describe('Deployment ID'),
  slug: z.string().describe('Deployment slug'),
  type: deploymentType,
  status: deploymentStatus,
  target: z
    .string()
    .nullable()
    .optional()
    .describe('Target URL for the deployment'),
  label: z.string().nullable().optional().describe('Human-readable label'),
  origin: deploymentOrigin,
  url: z
    .string()
    .nullable()
    .optional()
    .describe('Live URL when deployment is active/published'),
  flowId: z
    .string()
    .optional()
    .describe('Flow ID (present in legacy deploy responses)'),
  containerUrl: z
    .string()
    .nullable()
    .optional()
    .describe('Container URL for server deployments'),
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const DeploymentOutputShape = { ...deploymentFields };

export const ListDeploymentsOutputShape = {
  deployments: z
    .array(z.object(deploymentFields))
    .describe('List of deployments'),
  total: z.number().describe('Total number of deployments'),
};

// Create deployment output shape
//
// POST /projects/{pid}/deployments returns:
//   {id, type, slug, target, label, origin, status, currentVersionNumber, url, createdAt, updatedAt}
export const CreateDeploymentOutputShape = {
  id: z.string().describe('Deployment ID'),
  slug: z.string().describe('Deployment slug'),
  type: deploymentType,
  status: deploymentStatus,
  target: z
    .string()
    .nullable()
    .optional()
    .describe('Target URL for the deployment'),
  label: z.string().nullable().optional().describe('Human-readable label'),
  origin: deploymentOrigin,
  url: z
    .string()
    .nullable()
    .optional()
    .describe('Live URL when deployment is active/published'),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
};
