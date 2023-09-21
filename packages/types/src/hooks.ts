import type { Elbwalker } from '.';

interface Parameter<T extends any[], R> {
  fn: (...args: T) => R;
  result?: R;
}

export type HookFn<T extends (...args: any[]) => any> = (
  params: Parameter<Parameters<T>, ReturnType<T>>,
  ...args: Parameters<T>
) => ReturnType<T>;

export type Names = 'Push' | 'DestinationInit' | 'DestinationPush';

export type Functions = {
  prePush?: PrePush;
  postPush?: PostPush;
};

export type PrePush = HookFn<Elbwalker.Elb>;
export type PostPush = HookFn<Elbwalker.Elb>;
