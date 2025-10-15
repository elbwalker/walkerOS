import type { WalkerOS } from '.';

export type SendDataValue = WalkerOS.Property | WalkerOS.Properties;
export type SendHeaders = { [key: string]: string };

export interface SendResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}
