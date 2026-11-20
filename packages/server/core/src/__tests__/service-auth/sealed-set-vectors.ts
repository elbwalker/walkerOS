/**
 * RFC 7518 Appendix C, "Example ECDH-ES Key Agreement Computation", byte for
 * byte: the Concat KDF's inputs and the key it derives from the example's Z.
 */

/** Appendix C: Z, the ECDH-ES shared secret of Alice's ephemeral key and Bob's key. */
export const C_Z = new Uint8Array([
  158, 86, 217, 29, 129, 113, 53, 211, 114, 131, 66, 131, 191, 132, 38, 156,
  251, 49, 110, 163, 218, 128, 106, 72, 246, 218, 167, 121, 140, 254, 144, 196,
]);

/** Appendix C: the AlgorithmID, the `enc` value. */
export const C_ALGORITHM = 'A128GCM';

/** Appendix C: PartyUInfo and PartyVInfo, the decoded `apu` and `apv`. */
export const C_PARTY_U_INFO = 'Alice';
export const C_PARTY_V_INFO = 'Bob';

/** Appendix C: SuppPubInfo, the key length in bits. */
export const C_KEY_BITS = 128;

/** Appendix C: the derived key, base64url. */
export const C_DERIVED_KEY = 'VqqN6vgjbSBcIijNcacQGg';
