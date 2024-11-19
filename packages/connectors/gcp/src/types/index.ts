import type { Request } from '@elbwalker/types';

export interface HttpFunction {
  anonymizeIp?: boolean;
  hash?: string | false;
  mapping?: Record<string, keyof Request.Context | false>;
}
