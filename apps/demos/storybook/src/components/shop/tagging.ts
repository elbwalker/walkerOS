import type { WalkerOS } from '@walkeros/core';
import { tagger } from '../../utils/tagger';

/**
 * The attributes that tag `data` as properties of `entity`, for the element
 * holding the values. Spread them onto any shop atom.
 */
export const propertyProps = (entity: string, data: WalkerOS.Properties) =>
  tagger(entity).data(data).get();
