export function error(message: string): never {
  throw new Error(message);
}

export function log(message: string): void {
  console.dir(message, { depth: 4 });
}
