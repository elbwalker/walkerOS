async function sha256(message: string): Promise<string | undefined> {
  const crypto: Crypto | undefined =
    window && window.crypto ? window.crypto : global.crypto;

  if (!crypto || !crypto.subtle || !TextEncoder) return; // Web Crypto API not available

  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

export async function getHash(
  ...params: (string | number | boolean)[]
): Promise<string | undefined> {
  // Convert all parameters to strings and join them
  const concatenatedString = params.map((param) => param.toString()).join('');
  return await sha256(concatenatedString);
}
