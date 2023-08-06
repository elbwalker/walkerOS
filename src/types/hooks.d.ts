export namespace Hooks {
  interface Parameter<T extends any[], R> {
    fn: (...args: T) => R;
    result?: R;
  }

  type HookFn<T extends (...args: any[]) => any> = (
    params: Parameter<Parameters<T>, ReturnType<T>>,
    ...args: Parameters<T>
  ) => ReturnType<T>;

  interface Functions {
    [key: string]: HookFn<any>;
  }

  type Value = Values<Functions>;
  type Values<T> = T[keyof T];
}
