async function sha256(message: string): Promise<string | undefined> {
  const crypto: Crypto | undefined =
    typeof window !== 'undefined' && window.crypto
      ? window.crypto
      : typeof global !== 'undefined' && global.crypto
      ? global.crypto
      : undefined;

  // Crypto API not available
  if (!crypto || !crypto.subtle || !TextEncoder) return;

  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

export async function getHash(str: string, length?: number): Promise<string> {
  return ((await sha256(str)) || '').slice(0, length);
}
