import type { WalkerOS } from '@elbwalker/types';
import type { ParametersDocument } from './types';

export function getDocumentParams(
  event: WalkerOS.Event,
  pageTitle?: string,
): ParametersDocument {
  const { source } = event;
  const params: ParametersDocument = {};

  if (source) {
    params.dl = source.id; // location
    params.dr = source.previous_id; // referrer
  }

  if (pageTitle) params.dt = pageTitle; // title

  return params;
}
