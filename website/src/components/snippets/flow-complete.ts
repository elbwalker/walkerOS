import type { ChapterId } from '@walkeros/cli/examples';

/**
 * Shared by the flow-snippets remark plugin (website/src/remark/flow-snippets.ts)
 * and the docs drift gate (apps/scripts/validate-docs.ts). No runtime import
 * from @walkeros/cli here, so both load this module without a cli build.
 */

export const GUIDE_URL =
  'https://github.com/elbwalker/walkerOS/blob/main/packages/cli/examples/flow-complete.md';

/**
 * Chapter titles as the guide headings read (`## <id>: <title>`). The drift
 * gate fails when a title no longer matches its heading.
 */
export const GUIDE_CHAPTERS: Record<ChapterId, string> = {
  tour: 'One file, one event',
  'web-entry': 'Start where the shop already is',
  'server-entry': 'A first-party endpoint, and a GA4 migration path',
  'step-envelope': 'One step shape',
  mapping: 'Vendor mapping',
  'consent-privacy': 'Consent and personal data',
  'gtm-fed': 'GTM stays, fed by walkerOS',
  references: 'Values from outside the file',
  'chains-routing': 'Chains and routes',
  contract: 'The contract and the validate step',
  quality: 'Duplicates, bots and a cookieless id',
  'state-stores': 'State, stores and first-party walker.js',
  delivery: 'Reliable delivery and the warehouse',
  'build-run': 'Build and run',
  operate: 'Observe, CI and deploy',
};

export function guideHeading(chapter: ChapterId): string {
  return `${chapter}: ${GUIDE_CHAPTERS[chapter]}`;
}

/** GitHub heading anchor: lower case, punctuation dropped, spaces to hyphens. */
export function guideChapterUrl(chapter: ChapterId): string {
  const anchor = guideHeading(chapter)
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, '')
    .replace(/ /g, '-');
  return `${GUIDE_URL}#${anchor}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const STEP_KINDS = ['sources', 'transformers', 'destinations', 'stores'];

/**
 * Finds the step example a feature names. A step name can repeat across flows
 * (pubsub is a server destination and a warehouse source), so the step that
 * holds the feature's pointer wins, then any step in the pointer's flow, then
 * the first step with that example.
 */
export function findStepExample(
  file: unknown,
  pointer: string,
  example: { step: string; name: string },
): Record<string, unknown> | undefined {
  if (!isRecord(file) || !isRecord(file.flows)) return undefined;
  const candidates: { path: string; value: Record<string, unknown> }[] = [];
  for (const [flowName, flow] of Object.entries(file.flows)) {
    if (!isRecord(flow)) continue;
    for (const kind of STEP_KINDS) {
      const steps = flow[kind];
      if (!isRecord(steps)) continue;
      const step = steps[example.step];
      if (!isRecord(step) || !isRecord(step.examples)) continue;
      const value = step.examples[example.name];
      if (isRecord(value))
        candidates.push({
          path: `/flows/${flowName}/${kind}/${example.step}`,
          value,
        });
    }
  }
  const flowPrefix = pointer.split('/').slice(0, 3).join('/') + '/';
  const best =
    candidates.find(
      (c) => pointer === c.path || pointer.startsWith(`${c.path}/`),
    ) ??
    candidates.find((c) => c.path.startsWith(flowPrefix)) ??
    candidates[0];
  return best?.value;
}
