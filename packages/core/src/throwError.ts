export function throwError(error: unknown): never {
  throw new Error(String(error));
}
