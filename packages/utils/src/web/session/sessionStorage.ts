import { getId, getMarketingParameters } from '../../';
import sessionStart from './sessionStart';
import type { SessionStorage } from '.';

export default function sessionStorage(
  config: SessionStorage = {},
  utils: {
    getId: typeof getId;
    getMarketingParameters: typeof getMarketingParameters;
  },
) {
  // @TODO storage handling
  config.isNew = true; // Dummy

  return sessionStart(config, utils);
}
