import type { Store } from '@walkeros/core';

export interface SheetsStoreSettings {
  /** Spreadsheet ID, the path segment between /d/ and /edit in the URL. */
  id: string;

  /** Sheet (tab) name within the spreadsheet. Default: 'Sheet1'. */
  sheet?: string;

  /** Column letter for keys (the lookup column). Default: 'A'. */
  key?: string;

  /** Column letter for values (JSON-serialized blob). Default: 'B'. */
  value?: string;

  /** Number of header rows to skip when reading the key column. Default: 1. */
  headerRows?: number;

  /**
   * Service account credentials for non-GCP environments. JSON string or
   * parsed object. Omit for ADC via the GCP metadata server (Cloud Run, GKE).
   */
  credentials?: string | ServiceAccountCredentials;
}

export interface ServiceAccountCredentials {
  /** Service account email (from SA JSON `client_email` field). */
  client_email: string;

  /** RSA private key in PEM format (from SA JSON `private_key` field). */
  private_key: string;
}

/**
 * Provisioning options for `walkeros setup store.<id>`.
 * Triggered only by the explicit CLI command. Idempotent.
 *
 * `id` lives in `Settings`, not here (no duplication). Phase 1 omits
 * `shareWith` (Drive API integration); that ships in a later phase if requested.
 */
export interface Setup {
  /**
   * Header values to write into row 1 of the configured sheet on setup.
   * Idempotent: re-running with the same headers is a no-op overwrite.
   * Optional: when omitted, setup verifies the spreadsheet exists and exits.
   */
  headers?: string[];
}

export type Types = Store.Types<
  SheetsStoreSettings,
  Store.BaseEnv,
  SheetsStoreSettings,
  Setup
>;
