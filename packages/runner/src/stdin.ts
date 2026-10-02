export function isStdinPiped(): boolean {
  return !process.stdin.isTTY;
}

/**
 * Read all of stdin. Returns an empty string when nothing was piped (a
 * detached container's stdin is /dev/null, which is not a TTY either), so the
 * caller decides what an empty stdin means.
 */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}
