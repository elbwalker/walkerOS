import type { WalkerOS } from '@elbwalker/types';
import type { ParametersSession, State } from './types';
import { getUser, valueToNumber } from './';

export function getSessionParams(
  event: WalkerOS.Event,
  state: State,
  session?: WalkerOS.SessionData,
): ParametersSession {
  const params: ParametersSession = {
    sid: getSessionId(event.user),
  };

  // Engagement
  let isEngaged = state.isEngaged || false;

  if (!isEngaged && event.timing >= 10) isEngaged = true;
  if (!isEngaged && event.trigger == 'click') isEngaged = true;
  if (!isEngaged && session && (session.runs || 0) > 1) isEngaged = true;

  if (isEngaged) {
    state.isEngaged = isEngaged;
    params.seg = 1;
  }

  // Session status
  if (session) {
    const { isStart, isNew, count, storage } = session;

    if (isStart) {
      params._ss = 1; // session start

      if (isNew || !storage) {
        params._nsi = 1; // new to site
        params._fv = 1; // first visit
      }
    }

    params.sct = count || 1; // session count
  }

  return params;
}

function getSessionId(user: WalkerOS.User = {}): number {
  return valueToNumber(getUser(user) + user.session); // Combine user and session
}
