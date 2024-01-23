export function onLog(message: unknown, verbose = false): void {
  if (verbose) console.dir(message, { depth: 4 });
}
