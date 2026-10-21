import type { Destination } from '@walkeros/core';
import { StepError, toFailureReason } from '@walkeros/core';

/**
 * The outcome of a batch from its failed entries: nothing failed resolves,
 * some failed is a partial outcome, and when nothing landed the batch throws
 * one representative error, so the collector counts a whole-batch failure.
 * That error is the send error when the send itself failed, else the first
 * retryable entry error, else the first (an entry failed without an error
 * is an unknown transport failure).
 */
export function batchOutcome(
  total: number,
  failed: Destination.BatchFailure[],
  sendError?: unknown,
): void | Destination.BatchOutcome {
  if (!failed.length) return;
  if (failed.length < total) return { failed };
  if (sendError !== undefined) throw sendError;
  const retryable = failed.find(
    ({ error }) => toFailureReason(error).retryable,
  );
  const { error } = retryable ?? failed[0];
  throw (
    error ??
    new StepError('No entry of the batch landed', { code: 'transport' })
  );
}
