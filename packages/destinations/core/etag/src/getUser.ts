import type { WalkerOS } from '@elbwalker/types';

export function getUser(user: WalkerOS.User = {}) {
  return String(user.device || user.session || user.hash);
}
