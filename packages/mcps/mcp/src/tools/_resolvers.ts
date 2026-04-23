/**
 * Internal helpers shared by deploy_manage actions. Not re-exported from the
 * tools barrel; leading underscore marks this as tool-module internal.
 *
 * All collaborators are passed in as arguments so unit tests can inject fakes
 * without relying on jest.mock. This keeps resolver tests local to the
 * resolver signature and avoids shared-mock drift.
 */

/**
 * The subset of a deployment summary the resolver needs to decide 0 / 1 / many
 * and to surface a useful MULTIPLE_DEPLOYMENTS error. Kept structurally
 * compatible with the CLI's DeploymentSummaryForFlow.
 */
export interface DeploymentSummaryForResolver {
  slug: string;
  type: string;
  status: string;
  updatedAt: string;
}

/**
 * Dependency injected list function. Must return only non-deleted deployments
 * for the given project + flow. The production wiring calls
 * `listDeployments({ projectId, flowId })` from `@walkeros/cli`, which hits
 * the app API; the API excludes soft-deleted rows.
 */
export type ListDeploymentsForResolver = (q: {
  projectId: string;
  flowId: string;
}) => Promise<DeploymentSummaryForResolver[]>;

/**
 * Error thrown when a flow has 0 matching deployments, or when a caller passed
 * a slug that does not match any active deployment of the flow. The MCP layer
 * translates this into an mcpError with `code: 'NOT_FOUND'`.
 */
export class DeploymentNotFoundError extends Error {
  readonly code = 'NOT_FOUND';
  constructor(message: string) {
    super(message);
    this.name = 'DeploymentNotFoundError';
  }
}

/**
 * Error thrown when a flow has >= 2 active deployments and the caller did not
 * pass a slug. Carries a `details[]` list so the MCP layer can surface the
 * options to the user.
 */
export class MultipleDeploymentsError extends Error {
  readonly code = 'MULTIPLE_DEPLOYMENTS';
  readonly details: DeploymentSummaryForResolver[];
  constructor(message: string, details: DeploymentSummaryForResolver[]) {
    super(message);
    this.name = 'MultipleDeploymentsError';
    this.details = details;
  }
}

/**
 * Resolve a concrete deployment slug for a (projectId, flowId, slug?) tuple.
 *
 * Behavior:
 * - 0 matches: throws DeploymentNotFoundError.
 * - 1 match, no slug: returns the single slug.
 * - slug provided and matches: returns the slug.
 * - slug provided and does not match: throws DeploymentNotFoundError.
 * - >= 2 matches, no slug: throws MultipleDeploymentsError with details[].
 */
export async function resolveDeploymentSlug(args: {
  projectId: string;
  flowId: string;
  slug?: string;
  list: ListDeploymentsForResolver;
}): Promise<string> {
  const matches = await args.list({
    projectId: args.projectId,
    flowId: args.flowId,
  });

  if (matches.length === 0) {
    throw new DeploymentNotFoundError(
      `No deployments found for flow ${args.flowId}`,
    );
  }

  if (args.slug) {
    const hit = matches.find((m) => m.slug === args.slug);
    if (!hit) {
      throw new DeploymentNotFoundError(
        `No deployment with slug ${args.slug} in flow ${args.flowId}`,
      );
    }
    return hit.slug;
  }

  if (matches.length === 1) {
    return matches[0].slug;
  }

  throw new MultipleDeploymentsError(
    `Flow ${args.flowId} has ${matches.length} active deployments; pass slug to disambiguate`,
    matches.map((m) => ({
      slug: m.slug,
      type: m.type,
      status: m.status,
      updatedAt: m.updatedAt,
    })),
  );
}
