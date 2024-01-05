import type { WalkerOS } from '.';

interface Parameter<T extends any[], R> {
  fn: (...args: T) => R;
  result?: R;
}

export type HookFn<T extends (...args: any[]) => any> = (
  params: Parameter<Parameters<T>, ReturnType<T>>,
  ...args: Parameters<T>
) => ReturnType<T>;

export type Names = 'Push' | 'DestinationInit' | 'DestinationPush';

export type Function = (...args: any[]) => any;
export type Functions = {
  [key: string]: Function;
};
