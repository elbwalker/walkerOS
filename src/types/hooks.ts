import type { IElbwalker, WebDestination } from '.';

export namespace Hooks {
  export interface Parameter<T extends any[], R> {
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
    preDestinationInit?: PreDestinationInit;
    postDestinationInit?: PostDestinationInit;
    preDestinationPush?: PreDestinationPush;
    postDestinationPush?: PostDestinationPush;
  };

  export type PrePush = HookFn<IElbwalker.Elb>;
  export type PostPush = HookFn<IElbwalker.Elb>;
  export type PreDestinationInit = HookFn<
    NonNullable<WebDestination.Function['init']>
  >;
  export type PostDestinationInit = HookFn<
    NonNullable<WebDestination.Function['init']>
  >;
  export type PreDestinationPush = HookFn<WebDestination.Function['push']>;
  export type PostDestinationPush = HookFn<WebDestination.Function['push']>;
}
