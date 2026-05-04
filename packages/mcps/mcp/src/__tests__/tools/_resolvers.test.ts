import {
  resolveDeploymentSlug,
  type DeploymentSummaryForResolver,
  type ListDeploymentsForResolver,
} from '../../tools/_resolvers.js';

function makeSummary(
  overrides: Partial<DeploymentSummaryForResolver> = {},
): DeploymentSummaryForResolver {
  return {
    slug: 'dep_one',
    type: 'web',
    status: 'active',
    updatedAt: '2026-04-22T00:00:00.000Z',
    ...overrides,
  };
}

/** Helper: fake list function returning a pre-baked set of matches. */
function fakeList(
  matches: DeploymentSummaryForResolver[],
): ListDeploymentsForResolver {
  return async () => matches;
}

describe('resolveDeploymentSlug', () => {
  const baseArgs = { projectId: 'proj_abc', flowId: 'flow_abc' };

  it('throws NOT_FOUND when no deployments match the flow', async () => {
    await expect(
      resolveDeploymentSlug({ ...baseArgs, list: fakeList([]) }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('flow_abc'),
    });
  });

  it('returns the single slug when one match and no slug provided', async () => {
    const slug = await resolveDeploymentSlug({
      ...baseArgs,
      list: fakeList([makeSummary({ slug: 'abc123456789' })]),
    });
    expect(slug).toBe('abc123456789');
  });

  it('returns the matching slug when slug provided and it matches', async () => {
    const slug = await resolveDeploymentSlug({
      ...baseArgs,
      slug: 'abc123456789',
      list: fakeList([
        makeSummary({ slug: 'abc123456789' }),
        makeSummary({ slug: 'def987654321' }),
      ]),
    });
    expect(slug).toBe('abc123456789');
  });

  it('throws NOT_FOUND when slug is provided but does not match any', async () => {
    await expect(
      resolveDeploymentSlug({
        ...baseArgs,
        slug: 'missing-slug',
        list: fakeList([makeSummary({ slug: 'abc123456789' })]),
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('missing-slug'),
    });
  });

  it('treats empty-string slug as explicit non-match, not as missing', async () => {
    await expect(
      resolveDeploymentSlug({
        ...baseArgs,
        slug: '',
        list: fakeList([makeSummary({ slug: 'abc123456789' })]),
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws MULTIPLE_DEPLOYMENTS with details when >=2 matches and no slug', async () => {
    const matches = [
      makeSummary({
        slug: 'abc123456789',
        updatedAt: '2026-04-20T00:00:00.000Z',
      }),
      makeSummary({
        slug: 'def987654321',
        updatedAt: '2026-04-21T00:00:00.000Z',
      }),
    ];
    await expect(
      resolveDeploymentSlug({ ...baseArgs, list: fakeList(matches) }),
    ).rejects.toMatchObject({
      code: 'MULTIPLE_DEPLOYMENTS',
      details: [
        {
          slug: 'abc123456789',
          type: 'web',
          status: 'active',
          updatedAt: '2026-04-20T00:00:00.000Z',
        },
        {
          slug: 'def987654321',
          type: 'web',
          status: 'active',
          updatedAt: '2026-04-21T00:00:00.000Z',
        },
      ],
    });
  });

  it('passes projectId and flowId through to the injected list function', async () => {
    const calls: Array<{ projectId: string; flowId: string }> = [];
    const spy: ListDeploymentsForResolver = async (q) => {
      calls.push(q);
      return [makeSummary({ slug: 'abc123456789' })];
    };
    await resolveDeploymentSlug({
      projectId: 'proj_xyz',
      flowId: 'flow_xyz',
      list: spy,
    });
    expect(calls).toEqual([{ projectId: 'proj_xyz', flowId: 'flow_xyz' }]);
  });
});
