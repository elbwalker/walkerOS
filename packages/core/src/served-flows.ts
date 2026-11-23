import type { Flow } from './types/flow';

/** A bare file name: no separator, no leading dot. */
export const BARE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * What a server build writes at the root of its output folder, and all an
 * archive output packs besides the served files: a served file inside one
 * of them would overwrite the server build or be lost from the archive.
 */
export const SERVER_OUTPUT_ENTRIES = [
  'flow.mjs',
  'node_modules',
  'package.json',
] as const;

/** One web flow a server flow serves, and the path of its file in the server's output folder. */
export interface ServedFlow {
  flow: string;
  path: string;
}

export type ServedFlowCode =
  | 'SERVED_FLOWS_NOT_SERVER'
  | 'SERVED_FLOW_NOT_WEB'
  | 'SERVED_PATH_INVALID'
  | 'SERVED_PATH_CONFLICT';

export interface ServedFlowIssue {
  /** The flow file path the issue is about. */
  path: string;
  message: string;
  code: ServedFlowCode;
  value?: unknown;
}

/** A relative path of bare file names joined by "/". */
export function isServedPath(value: string): boolean {
  return value.split('/').every((part) => BARE_FILE_NAME_PATTERN.test(part));
}

/**
 * The same path, or one a folder of the other, compared without case: on a
 * case-insensitive file system (macOS and Windows by default) `A/walker.js`
 * replaces `a/walker.js`.
 */
export function servedPathsOverlap(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return (
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`)
  );
}

/**
 * The path's first part is `name`, compared without case, since on a
 * case-insensitive file system `Flow.mjs` is `flow.mjs`; a longer name such
 * as `flow.mjs.d` is another part.
 */
export function firstPathPartIs(path: string, name: string): boolean {
  return path.split('/')[0].toLowerCase() === name.toLowerCase();
}

/**
 * `flows.<server>.config.bundle.flows`, and `.<flow>` for one entry: where a
 * listing issue is reported.
 */
export function servedFlowPath(server: string, flow?: string): string {
  const at = `flows.${server}.config.bundle.flows`;
  return flow === undefined ? at : `${at}.${flow}`;
}

// Own keys only: a key such as "toString" is no flow of the file.
function ownFlow(json: Flow.Json, name: string): Flow | undefined {
  return Object.prototype.hasOwnProperty.call(json.flows, name)
    ? json.flows[name]
    : undefined;
}

function platformFact(name: string, platform: string | undefined): string {
  return platform
    ? `Flow "${name}" has platform "${platform}"`
    : `Flow "${name}" has no platform`;
}

/**
 * The web flows `flowName` serves, as written and in key order, with every
 * issue the file shows; use `served` only when `issues` is empty.
 *
 * Reads `flows[flowName].config.bundle.flows` as written: a reference in a
 * key or a value is not resolved, so it fails the checks.
 */
export function getServedFlows(
  json: Flow.Json,
  flowName: string,
): { served: ServedFlow[]; issues: ServedFlowIssue[] } {
  const config = ownFlow(json, flowName)?.config;
  const listing = config?.bundle?.flows;
  if (!listing) return { served: [], issues: [] };

  const issues: ServedFlowIssue[] = [];
  if (config.platform !== 'server')
    issues.push({
      path: servedFlowPath(flowName),
      code: 'SERVED_FLOWS_NOT_SERVER',
      message: `${platformFact(flowName, config.platform)}: only a server flow serves web flows`,
    });

  const served = Object.keys(listing).map(
    (flow): ServedFlow => ({ flow, path: listing[flow] }),
  );
  const placed: ServedFlow[] = [];
  for (const entry of served) {
    const path = servedFlowPath(flowName, entry.flow);

    const target = ownFlow(json, entry.flow);
    const platform = target?.config?.platform;
    if (!target)
      issues.push({
        path,
        code: 'SERVED_FLOW_NOT_WEB',
        message: `"${entry.flow}" is no flow of this file`,
      });
    else if (platform !== 'web')
      issues.push({
        path,
        code: 'SERVED_FLOW_NOT_WEB',
        message: `${platformFact(entry.flow, platform)}: a served flow is a web flow`,
      });

    if (!isServedPath(entry.path)) {
      issues.push({
        path,
        code: 'SERVED_PATH_INVALID',
        message: `"${entry.path}" is not a relative path of bare file names joined by "/"`,
        value: entry.path,
      });
      continue;
    }

    const other = placed.find((earlier) =>
      servedPathsOverlap(earlier.path, entry.path),
    );
    if (other)
      issues.push({
        path,
        code: 'SERVED_PATH_CONFLICT',
        message:
          other.path.toLowerCase() === entry.path.toLowerCase()
            ? `"${entry.path}" is also the path of "${other.flow}"`
            : `"${entry.path}" overlaps "${other.path}", the path of "${other.flow}"`,
        value: entry.path,
      });
    placed.push(entry);
  }

  return { served, issues };
}
