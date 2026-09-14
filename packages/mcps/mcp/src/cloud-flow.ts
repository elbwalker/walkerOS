import { isObject, type WalkerOS } from '@walkeros/core';

/**
 * Saved flow references, shared by every place that recognises or reads one.
 *
 * `flow_` and `cfg_` are the reserved cloud flow/config id namespaces. The
 * pattern is anchored and limited to id characters, so a path that merely
 * starts with a prefix (`flow_../x`) is never mistaken for an id.
 */
export const CLOUD_ID_PATTERN = /^(flow|cfg)_[A-Za-z0-9_-]+$/;

export function isCloudId(input: string): boolean {
  return CLOUD_ID_PATTERN.test(input);
}

/**
 * The config of a flow record returned by the tool client, or `{}` when the
 * record carries none. The client seam returns an opaque shape, so this is the
 * one narrowing every reader shares.
 */
export function flowConfigOf(flow: unknown): WalkerOS.AnyObject {
  return isObject(flow) && isObject(flow.config) ? flow.config : {};
}
