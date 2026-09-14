/**
 * Addresses of walkerOS app screens, built in one place so every tool hands a
 * person the same link for the same screen.
 *
 * WHY THIS EXISTS. A tool that names a release, a step, or a deployment in
 * prose leaves the person to go find it. A link ends that: the answer and the
 * screen it is about arrive together. Building the address in each tool would
 * instead give as many spellings of `/projects/.../flows/...` as there are
 * emission points, and the first one to drift would send someone to a 404 that
 * no test here could see.
 *
 * THE BASE URL IS CONSUMED RAW. `client.appBaseUrl()` is already normalized by
 * the door that answers it (the CLI-backed door wraps `resolveAppUrl()` in
 * `normalizeBaseUrl`; the hosted door returns the same expression it publishes
 * as its OAuth issuer, which cannot carry a trailing slash). Normalizing again
 * here would put a second opinion about the shape in the system, which is
 * exactly what one normalization point per door exists to prevent.
 *
 * ONE DEFINITION, BOTH DOORS. Nothing here branches on which door is calling.
 * The base URL is the only thing that differs between them, and it arrives as
 * an argument.
 *
 * EVERY LINK IS ABSOLUTE. These land in a chat transcript, where a path
 * relative to nothing is useless.
 *
 * AN UNBUILDABLE LINK IS `undefined`, NEVER A GUESS. Every builder returns
 * `undefined` when it cannot name a screen that exists, and callers spread the
 * field conditionally so the result simply carries no link. A link that lands
 * on a 404, or on the app's "can't open that" notice, is worse than no link:
 * it costs the person a click and teaches them the tool's links are unreliable.
 *
 * THE URL SHAPES ARE THE APP'S, NOT OURS. They mirror what the app routes
 * today: `/projects/{projectId}/flows/{flowId}` and
 * `/projects/{projectId}/deployments/{deploymentId}`, with a view on the flow
 * page addressed by the `view` query param whose value names a SUBJECT
 * (`variables`, `secrets`, `contract`, `history`, `releases`, `knowledge`,
 * `step`). A step is `?view=step&flow=<named flow>&step=<type.name>`, the same
 * vocabulary `hub_manage` already takes as its `flow` and `step` params.
 */

/** A flow page: the address every flow-scoped view hangs off. */
export interface FlowLinkTarget {
  /** From `client.appBaseUrl()`. Consumed as given. */
  baseUrl: string;
  projectId: string;
  flowId: string;
}

/**
 * One step inside a flow. `flow` is the named flow within the config ("web",
 * "server"); `step` is `"type.name"`, e.g. `"destination.ga4"`.
 */
export interface StepLinkTarget extends FlowLinkTarget {
  step: string;
  /**
   * Null and undefined both mean "the caller did not name one", which is the
   * shape `hub_manage`'s step history answers with when it was not filtered by
   * flow.
   */
  flow?: string | null;
}

/** One discussion thread, addressed by what it hangs on. */
export interface ThreadLinkTarget extends FlowLinkTarget {
  anchorType: string;
}

/**
 * One deployment.
 *
 * Pass the `dep_...` id, not the slug. The detail route resolves either, but
 * the page's live-status stream matches on the id alone, so a slug link opens a
 * page whose status stream fails while the deployment is still deploying. This
 * builder does not inspect the value: naming the id is the caller's job.
 */
export interface DeploymentLinkTarget {
  baseUrl: string;
  projectId: string;
  deploymentId: string;
}

/**
 * Contract entries are top-level and carry no named flow, so they are not
 * `?view=step` addresses.
 */
const CONTRACT_PREFIX = 'contract.';

/** Every address component has to be a non-empty string, or there is no link. */
function addressable(...parts: string[]): boolean {
  return parts.every((part) => part !== '');
}

function flowPage(target: FlowLinkTarget): string | undefined {
  const { baseUrl, projectId, flowId } = target;
  if (!addressable(baseUrl, projectId, flowId)) return undefined;
  return `${baseUrl}/projects/${encodeURIComponent(projectId)}/flows/${encodeURIComponent(flowId)}`;
}

/**
 * A view on the flow page. `view` leads because it is the primary key: the
 * other params only mean anything beside it.
 */
function flowView(
  target: FlowLinkTarget,
  view: string,
  params: Record<string, string> = {},
): string | undefined {
  const page = flowPage(target);
  if (page === undefined) return undefined;
  const query = new URLSearchParams({ view, ...params });
  return `${page}?${query.toString()}`;
}

export const links = {
  /** The flow page itself. `undefined` when any part of the address is empty. */
  flow(target: FlowLinkTarget): string | undefined {
    return flowPage(target);
  },

  /**
   * The screen showing one step.
   *
   * A `contract` step, in any of its spellings, is answered with the CONTRACT
   * view rather than a step address. `?view=step&step=contract.checkout` is a
   * legitimate address in the vocabulary this tool speaks, but the app has
   * deliberately deferred opening ONE contract entry and refuses that link with
   * a notice. `?view=contract` opens the contract editor the entry lives in,
   * which is the nearest screen that actually exists. A `flow` alongside a
   * contract step is a caller mistake (contract entries are top-level) and is
   * ignored rather than turned into a refused link.
   *
   * Otherwise a step needs its named flow: `type.name` alone is not unique in a
   * config holding both a web and a server flow, and the app resolves an
   * address without one to nothing and says so on screen. So an unnamed flow
   * yields `undefined` here. Callers that want the link can re-ask with `flow`.
   *
   * What this cannot check is whether the step is still IN that flow. The
   * address is resolved against the live config when the page opens, and a step
   * since renamed or removed gets a notice there rather than a broken screen.
   */
  step(target: StepLinkTarget): string | undefined {
    const { step, flow } = target;
    if (step === '') return undefined;
    if (step === 'contract' || step.startsWith(CONTRACT_PREFIX))
      return flowView(target, 'contract');
    if (typeof flow !== 'string' || flow === '') return undefined;
    return flowView(target, 'step', { flow, step });
  },

  /**
   * The release history of a flow.
   *
   * The app has no address for ONE release: `?view=releases` declares no params
   * and opens the list the release is a row of. That is the screen a person
   * asking about a release wants to be on, so this takes the flow and nothing
   * else rather than pretending to a precision the app does not have.
   */
  release(target: FlowLinkTarget): string | undefined {
    return flowView(target, 'releases');
  },

  /**
   * The screen a thread is read on.
   *
   * Only a release anchor can be addressed from the wire shape this tool
   * holds. The app renders release-anchored discussions inside the release
   * history, beside the release they hang on. Step and entity-action anchors
   * have no surface at all yet. A TAG anchor does have one, the knowledge list
   * on `?view=knowledge`, but only when the thread was captured in Tag Mode
   * and carries a frame: `HubThreadWire` has no `frameId`, so nothing here can
   * tell such a thread from one written over MCP against a null frame, and a
   * knowledge link would open a list the thread may be absent from. So
   * everything but a release anchor gets no link rather than a possibly empty
   * one.
   */
  thread(target: ThreadLinkTarget): string | undefined {
    if (target.anchorType !== 'release') return undefined;
    return flowView(target, 'releases');
  },

  /** One deployment's detail page. */
  deployment(target: DeploymentLinkTarget): string | undefined {
    const { baseUrl, projectId, deploymentId } = target;
    if (!addressable(baseUrl, projectId, deploymentId)) return undefined;
    return `${baseUrl}/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}`;
  },
};
