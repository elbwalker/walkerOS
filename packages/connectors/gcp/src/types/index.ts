import type { Request } from '@elbwalker/types';

export interface HttpFunction {
  anonymizeIp?: boolean;
  mapping?: Record<string, keyof Request.Context | false>;
}
