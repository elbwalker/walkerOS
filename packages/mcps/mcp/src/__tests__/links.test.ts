import { links } from '../links.js';
import fixture from './fixtures/mcp-surface-parity.json';

const BASE = 'https://app.walkeros.io';
const FLOW = { baseUrl: BASE, projectId: 'proj_1', flowId: 'flw_1' };

describe('links.flow', () => {
  it('addresses the flow page absolutely', () => {
    expect(links.flow(FLOW)).toBe(
      'https://app.walkeros.io/projects/proj_1/flows/flw_1',
    );
  });

  it.each([['baseUrl'], ['projectId'], ['flowId']] as const)(
    'builds nothing when %s is empty',
    (field) => {
      expect(links.flow({ ...FLOW, [field]: '' })).toBeUndefined();
    },
  );

  it('takes the base URL as given, without renormalizing it', () => {
    // The door that answers `appBaseUrl()` owns the shape. A second opinion
    // here is what would let two doors disagree about it.
    expect(links.flow({ ...FLOW, baseUrl: 'http://localhost:3000' })).toBe(
      'http://localhost:3000/projects/proj_1/flows/flw_1',
    );
  });
});

describe('links.step', () => {
  it('addresses one step by its named flow and type.name', () => {
    expect(links.step({ ...FLOW, flow: 'web', step: 'destination.ga4' })).toBe(
      'https://app.walkeros.io/projects/proj_1/flows/flw_1?view=step&flow=web&step=destination.ga4',
    );
  });

  it.each([[undefined], [null], ['']])(
    'builds nothing for a step whose flow is %p',
    (flow) => {
      expect(
        links.step({ ...FLOW, step: 'destination.ga4', flow }),
      ).toBeUndefined();
    },
  );

  it('builds nothing when no step is named', () => {
    expect(links.step({ ...FLOW, flow: 'web', step: '' })).toBeUndefined();
  });

  it.each([['contract.checkout'], ['contract.'], ['contract']])(
    'answers %p with the contract view, which the app can actually open',
    (step) => {
      expect(links.step({ ...FLOW, step })).toBe(
        'https://app.walkeros.io/projects/proj_1/flows/flw_1?view=contract',
      );
    },
  );

  it('ignores a flow passed beside a contract step', () => {
    // Contract entries are top-level, so a flow beside one is a caller
    // mistake. Carrying it through would build the step address the app
    // refuses.
    expect(
      links.step({ ...FLOW, flow: 'web', step: 'contract.checkout' }),
    ).toBe('https://app.walkeros.io/projects/proj_1/flows/flw_1?view=contract');
  });

  it('escapes a flow name that would otherwise break the query string', () => {
    expect(
      links.step({ ...FLOW, flow: 'web&view=secrets', step: 'source.browser' }),
    ).toBe(
      'https://app.walkeros.io/projects/proj_1/flows/flw_1?view=step&flow=web%26view%3Dsecrets&step=source.browser',
    );
  });
});

describe('links.release', () => {
  it('addresses the release history the release is listed in', () => {
    expect(links.release(FLOW)).toBe(
      'https://app.walkeros.io/projects/proj_1/flows/flw_1?view=releases',
    );
  });

  it('builds nothing without a flow to hang the view on', () => {
    expect(links.release({ ...FLOW, flowId: '' })).toBeUndefined();
  });
});

describe('links.thread', () => {
  it('addresses the release history, where release threads are read', () => {
    expect(links.thread({ ...FLOW, anchorType: 'release' })).toBe(
      'https://app.walkeros.io/projects/proj_1/flows/flw_1?view=releases',
    );
  });

  it.each([['step'], ['entity_action'], ['contract'], ['tag']])(
    'builds nothing for a %s anchor, which has no screen yet',
    (anchorType) => {
      expect(links.thread({ ...FLOW, anchorType })).toBeUndefined();
    },
  );
});

describe('links.deployment', () => {
  it('addresses the deployment page', () => {
    expect(
      links.deployment({
        baseUrl: BASE,
        projectId: 'proj_1',
        deploymentId: 'dep_1',
      }),
    ).toBe('https://app.walkeros.io/projects/proj_1/deployments/dep_1');
  });

  it('does not inspect the id it is given', () => {
    // Naming the `dep_...` id is the caller's job: the detail route resolves a
    // slug too, but the page's live-status stream matches on the id alone.
    // This builder concatenates, it does not judge.
    expect(
      links.deployment({
        baseUrl: BASE,
        projectId: 'proj_1',
        deploymentId: 'k7m2x9p4q1w8',
      }),
    ).toBe('https://app.walkeros.io/projects/proj_1/deployments/k7m2x9p4q1w8');
  });

  it.each([['baseUrl'], ['projectId'], ['deploymentId']] as const)(
    'builds nothing when %s is empty',
    (field) => {
      const target = {
        baseUrl: BASE,
        projectId: 'proj_1',
        deploymentId: 'dep_1',
      };
      expect(links.deployment({ ...target, [field]: '' })).toBeUndefined();
    },
  );
});

/**
 * The `links` section of the shared surface fixture, against the builders above.
 *
 * WHY, when the builders are already pinned by literal strings here. The app
 * commits a byte-identical copy of that fixture and walks it against its real
 * routes and its url-state registry. Nothing in THIS repo read it, so a rename
 * carried through `links.ts` and the literals above left the fixture stale and
 * every walkerOS suite green. The drift did still surface, but only in the
 * other repo, only after a rebuild, on a different trigger. This puts detection
 * in the repo where the edit happens.
 *
 * It checks the shape both ways: every link the builders reach lands on a
 * pinned route, carrying a pinned view with exactly its pinned params; and
 * every pinned route and view is reached by some builder. So the fixture can
 * neither describe a link nobody emits nor miss one that is emitted.
 *
 * What it cannot see is the app. Whether those routes and view keys exist there
 * is the app copy's job, and the two copies are still compared by hand.
 */

const PINNED = fixture.links;

/** The params each pinned view is allowed to carry, by view key. */
const PINNED_VIEWS: Record<string, readonly string[]> = PINNED.views;

/** One call per address the builders can reach. */
const BUILT: ReadonlyArray<readonly [string, string | undefined]> = [
  ['flow', links.flow(FLOW)],
  ['step', links.step({ ...FLOW, flow: 'web', step: 'destination.ga4' })],
  [
    'step (contract spelling)',
    links.step({ ...FLOW, step: 'contract.checkout' }),
  ],
  ['release', links.release(FLOW)],
  ['thread', links.thread({ ...FLOW, anchorType: 'release' })],
  [
    'deployment',
    links.deployment({
      baseUrl: BASE,
      projectId: 'proj_1',
      deploymentId: 'dep_1',
    }),
  ],
];

function builtUrls(): URL[] {
  return BUILT.map(([name, url]) => {
    if (url === undefined) throw new Error(`Builder built no link: ${name}`);
    return new URL(url);
  });
}

/**
 * A pinned template against a built path, segment by segment. A `{param}`
 * matches any one non-empty segment: the template names its params as the
 * BUILDER names them, so matching is by shape and position, never by name.
 */
function matchesTemplate(template: string, pathname: string): boolean {
  const want = template.split('/').filter(Boolean);
  const got = pathname.split('/').filter(Boolean);
  return (
    want.length === got.length &&
    want.every((segment, index) => {
      const other = got[index] ?? '';
      return segment.startsWith('{') ? other !== '' : segment === other;
    })
  );
}

describe('the shared surface fixture', () => {
  it('describes every link the builders build', () => {
    for (const url of builtUrls()) {
      const template = Object.values(PINNED.routes).find((candidate) =>
        matchesTemplate(candidate, url.pathname),
      );
      expect(template).toBeDefined();

      const view = url.searchParams.get(PINNED.viewParamKey);
      const params = [...url.searchParams.keys()].filter(
        (key) => key !== PINNED.viewParamKey,
      );
      if (view === null) {
        expect(params).toEqual([]);
        continue;
      }
      const declared = PINNED_VIEWS[view];
      expect(declared).toBeDefined();
      expect(params.sort()).toEqual([...(declared ?? [])].sort());
    }
  });

  it('describes nothing the builders never build', () => {
    const urls = builtUrls();
    for (const template of Object.values(PINNED.routes)) {
      expect(urls.some((url) => matchesTemplate(template, url.pathname))).toBe(
        true,
      );
    }
    const reached = urls
      .map((url) => url.searchParams.get(PINNED.viewParamKey))
      .filter((view): view is string => view !== null);
    expect([...new Set(reached)].sort()).toEqual(
      Object.keys(PINNED_VIEWS).sort(),
    );
  });
});
