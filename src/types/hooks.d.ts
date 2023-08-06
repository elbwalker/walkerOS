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

  interface Functions {
    [key: string]: HookFn<any>;
  }

  type Value = Values<Functions>;
  type Values<T> = T[keyof T];

  type PrePush = HookFn<IElbwalker.Elb>;
  type PostPush = HookFn<IElbwalker.Elb>;
  // type PreDestinationInit = HookFn<WebDestination.Function['init']>;
  // type PostDestinationInit = HookFn<WebDestination.Function['init']>;
  type PreDestinationPush = HookFn<WebDestination.Function['push']>;
  type PostDestinationPush = HookFn<WebDestination.Function['push']>;
}
