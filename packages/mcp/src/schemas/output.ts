import { z } from 'zod';

// Shared primitives
const timestamp = z.string().describe('ISO 8601 timestamp');
const projectId = z.string().describe('Project ID (proj_...)');
const flowId = z.string().describe('Flow ID (cfg_...)');

// Error shape (for reference)
export const ErrorOutputShape = {
  error: z.string().describe('Error message'),
};

// CLI tool output shapes
export const ValidateOutputShape = {
  valid: z.boolean().describe('Whether validation passed'),
  type: z.enum(['event', 'flow', 'mapping']).describe('What was validated'),
  errors: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
        value: z.unknown().optional(),
        code: z.string().optional(),
      }),
    )
    .describe('Validation errors'),
  warnings: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
        suggestion: z.string().optional(),
      }),
    )
    .describe('Validation warnings'),
  details: z
    .record(z.string(), z.unknown())
    .describe('Additional validation details'),
};

export const BundleOutputShape = {
  success: z.boolean().describe('Whether bundling succeeded'),
  totalSize: z.number().optional().describe('Total bundle size in bytes'),
  buildTime: z.number().optional().describe('Build time in milliseconds'),
  packages: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
      }),
    )
    .optional()
    .describe('Per-package size breakdown'),
  treeshakingEffective: z
    .boolean()
    .optional()
    .describe('Whether tree-shaking was effective'),
  message: z.string().optional().describe('Status message'),
};

export const SimulateOutputShape = {
  success: z.boolean().describe('Whether simulation succeeded'),
  error: z.string().optional().describe('Error message if simulation failed'),
  collector: z
    .unknown()
    .optional()
    .describe('Collector state after simulation'),
  elbResult: z.unknown().optional().describe('Push result from the collector'),
  logs: z.array(z.unknown()).optional().describe('Log entries from simulation'),
  usage: z
    .record(z.string(), z.array(z.unknown()))
    .optional()
    .describe('API call usage per destination'),
  duration: z
    .number()
    .optional()
    .describe('Simulation duration in milliseconds'),
};

export const PushOutputShape = {
  success: z.boolean().describe('Whether push succeeded'),
  elbResult: z.unknown().optional().describe('Push result from the collector'),
  duration: z.number().describe('Push duration in milliseconds'),
  error: z.string().optional().describe('Error message if push failed'),
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
