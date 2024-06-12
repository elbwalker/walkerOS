export function onLog(message: unknown, verbose = false): void {
  // eslint-disable-next-line no-console
  if (verbose) console.dir(message, { depth: 4 });
}
