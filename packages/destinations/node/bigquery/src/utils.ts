export function error(message: string): never {
  throw new Error(message);
}

export function log(message: unknown): void {
  console.dir(message, { depth: 4 });
}
