export function isStdinPiped(): boolean {
  return !process.stdin.isTTY;
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const content = Buffer.concat(chunks).toString('utf-8');
  if (!content.trim()) {
    throw new Error('No input received on stdin');
  }
  return content;
}
