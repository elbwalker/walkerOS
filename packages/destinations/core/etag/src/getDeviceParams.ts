import type { WalkerOS } from '@elbwalker/types';
import type { ParametersDevice } from './types';

export function getDeviceParams(user: WalkerOS.User = {}): ParametersDevice {
  const params: ParametersDevice = {};

  if (user.screenSize) params.sr = user.screenSize; // Screen resolution

  return params;
}
