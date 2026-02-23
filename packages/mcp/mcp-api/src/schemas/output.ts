import { z } from 'zod';

// Shared primitives
const timestamp = z.string().describe('ISO 8601 timestamp');
const projectId = z.string().describe('Project ID (proj_...)');
const flowId = z.string().describe('Flow ID (cfg_...)');

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
const projectFields = {
  id: projectId,
  name: z.string().describe('Project name'),
  role: z.enum(['owner', 'member']).describe('Your role in this project'),
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const ProjectOutputShape = { ...projectFields };

export const ListProjectsOutputShape = {
  projects: z.array(z.object(projectFields)).describe('List of projects'),
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
const deploymentStatus = z
  .enum(['bundling', 'deploying', 'active', 'failed', 'deleted', 'published'])
  .describe('Deployment status');
const deploymentType = z.enum(['web', 'server']).describe('Deployment type');

// Deploy flow output shape
export const DeployFlowOutputShape = {
  deploymentId: z.string().describe('Deployment ID'),
  type: deploymentType,
  status: deploymentStatus,
  publicUrl: z
    .string()
    .nullable()
    .optional()
    .describe('Public URL for web deployments'),
  scriptTag: z
    .string()
    .nullable()
    .optional()
    .describe('HTML script tag for web deployments'),
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
const deploymentFields = {
  id: z.string().describe('Deployment ID'),
  slug: z.string().describe('Deployment slug'),
  flowId: flowId,
  type: deploymentType,
  status: deploymentStatus,
  publicUrl: z
    .string()
    .nullable()
    .optional()
    .describe('Public URL for web deployments'),
  scriptTag: z
    .string()
    .nullable()
    .optional()
    .describe('HTML script tag for web deployments'),
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
export const CreateDeploymentOutputShape = {
  id: z.string().describe('Deployment ID'),
  slug: z.string().describe('Deployment slug'),
  type: deploymentType,
  status: deploymentStatus,
  deployToken: z
    .string()
    .optional()
    .describe('One-time deploy token for bundle upload'),
};
