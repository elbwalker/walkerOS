// Define a generic type for functions with specific parameters and return type
export type AnyFunction<P extends unknown[] = never[], R = unknown> = (
  ...args: P
) => R;

// Define a generic type for a dictionary of functions
export type Functions = {
  [key: string]: AnyFunction;
};

// Define a parameter interface to wrap the function and its result
interface Parameter<P extends unknown[], R> {
  fn: (...args: P) => R;
  result?: R;
}

// Define the HookFn type using generics for better type safety
export type HookFn<T extends AnyFunction> = (
  params: Parameter<Parameters<T>, ReturnType<T>>,
  ...args: Parameters<T>
) => ReturnType<T>;
