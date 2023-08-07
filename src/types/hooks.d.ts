import { IElbwalker, WebDestination } from '.';

export namespace Hooks {
  interface Parameter<T extends any[], R> {
    fn: (...args: T) => R;
    result?: R;
  }

  type HookFn<T extends (...args: any[]) => any> = (
    params: Parameter<Parameters<T>, ReturnType<T>>,
    ...args: Parameters<T>
  ) => ReturnType<T>;

  type Names = 'Push' | 'DestinationInit' | 'DestinationPush';

  type Functions = {
    prePush?: PrePush;
    postPush?: PostPush;
    preDestinationInit?: PreDestinationInit;
    postDestinationInit?: PostDestinationInit;
    preDestinationPush?: PreDestinationPush;
    postDestinationPush?: PostDestinationPush;
  };

  type PrePush = HookFn<IElbwalker.Elb>;
  type PostPush = HookFn<IElbwalker.Elb>;
  type PreDestinationInit = HookFn<
    NonNullable<WebDestination.Function['init']>
  >;
  type PostDestinationInit = HookFn<
    NonNullable<WebDestination.Function['init']>
  >;
  type PreDestinationPush = HookFn<WebDestination.Function['push']>;
  type PostDestinationPush = HookFn<WebDestination.Function['push']>;
}
