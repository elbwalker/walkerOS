// Export server-specific utilities
export * from './sendServer';
export * from './getHashServer';
export * from './hashUserData';
export * from './batchOutcome';
export * from './retryBudget';
export * from './backoff';
export * from './channel';

// The service credential client: the credential reader, the opener of what
// the app seals to the credential (ECDH-ES, A256GCM), discovery, the RFC 10070
// assertion, DPoP proofs and RFC 9421 signatures, all on WebCrypto.
export {
  SERVICE_CREDENTIAL_ENV,
  readServiceCredential,
} from './service-auth/credential';
export { openSealedSecretSet } from './service-auth/sealed-set';
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
// The data plane's doors: the signer a runner hands its steps, and the check
// a door runs on each signed request.
export {
  SIGNATURE_TAGS,
  assertDoorTarget,
  createDoorAuthorize,
  signDoorRequest,
} from './service-auth/door-sign';
export type { DoorTag } from './service-auth/door-sign';
export { createDoorCheck } from './service-auth/door-check';
export type {
  DoorCheck,
  DoorCheckOptions,
  DoorDecision,
  DoorRefusal,
  DoorRequest,
} from './service-auth/door-check';

// Export server-specific types
export * from './types';
