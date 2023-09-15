export function throwError(message: unknown): never {
  throw new Error(String(message));
}

export function log(message: unknown, verbose = false): void {
  if (verbose) console.dir(message, { depth: 4 });
}
