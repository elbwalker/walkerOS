import type { WalkerOS } from '@elbwalker/types';
import { getUser, valueToNumber } from '.';

export function getClientId(
  user: WalkerOS.User = {},
  session?: WalkerOS.SessionData,
): { cid: string } {
  const userId = getUser(user);
  const clientId = userId ? valueToNumber(userId) : '1234567890';

  const timestamp = session
    ? session.start
    : Math.floor(Date.now() / 86400000) * 86400 + 1; // Daily timestamp

  const cid = clientId + '.' + timestamp;

  return { cid };
}
