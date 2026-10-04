/**
 * An error with the structured fields a refused call carries: the CLI's
 * `ApiError` has a `code` and, when a response came back, its HTTP `status`;
 * the hosted door's errors have a `code` alone. Built here rather than loaded
 * from `@walkeros/cli`, which a test that mocks `@walkeros/core` cannot load.
 */
export class CodedError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
