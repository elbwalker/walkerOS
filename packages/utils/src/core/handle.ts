import type { WalkerOS } from '@elbwalker/types';
import type { Destination } from '@elbwalker/types';
import type { Elb } from '@elbwalker/types';
import { Const } from './constants';
import { addDestination } from './destination';
import { assign } from './assign';
import { isObject } from './is';
import { setConsent } from './consent';

export async function commonHandleCommand(
  instance: WalkerOS.Instance,
  action: string,
  data?: unknown,
  options?: unknown,
): Promise<Elb.PushResult | undefined> {
  let result: Elb.PushResult | undefined;

  switch (action) {
    case Const.Commands.Consent:
      if (isObject(data)) {
        result = await setConsent(instance, data as WalkerOS.Consent);
      }
      break;

    case Const.Commands.Custom:
      if (isObject(data)) {
        instance.custom = assign(instance.custom, data as WalkerOS.Properties);
      }
      break;

    case Const.Commands.Destination:
      if (isObject(data) && typeof data.push === 'function') {
        result = await addDestination(
          instance,
          data as Destination.DestinationInit,
          options as Destination.Config,
        );
      }
      break;

    case Const.Commands.Globals:
      if (isObject(data)) {
        instance.globals = assign(
          instance.globals,
          data as WalkerOS.Properties,
        );
      }
      break;

    case Const.Commands.User:
      if (isObject(data)) {
        assign(instance.user, data as WalkerOS.User, { shallow: false });
      }
      break;
  }

  return result;
}
