// Export server-specific utilities
export * from './sendServer';
export * from './getHashServer';
export * from './batchOutcome';
export * from './retryBudget';
export * from './backoff';
export * from './channel';

// The service credential client: the credential reader, discovery, the RFC
// 10070 assertion, DPoP proofs and RFC 9421 signatures, all ES256 on WebCrypto.
export {
  SERVICE_CREDENTIAL_ENV,
  readServiceCredential,
} from './service-auth/credential';
export { discoverIssuer, metadataUrl } from './service-auth/discovery';
export {
  ASSERTION_LIFETIME_SECONDS,
  clientAssertion,
} from './service-auth/assertion';
export { dpopProof } from './service-auth/dpop';
export {
  SIGNATURE_ALG,
  SIGNATURE_LABEL,
  SIGNED_COMPONENTS,
  contentDigest,
  jwkThumbprint,
  signRequest,
  verifyRequestSignature,
} from './service-auth/signature';
export type { SignatureRefusal } from './service-auth/signature';
export {
  APP_SIGNATURE_TAG,
  appAnswerOf,
  createServiceAuth,
  sendWithServiceAuth,
} from './service-auth/client';
export type {
  ServiceAuth,
  ServiceAuthLogger,
  ServiceAuthOptions,
  ServiceToken,
} from './service-auth/client';

// Export server-specific types
export * from './types';
