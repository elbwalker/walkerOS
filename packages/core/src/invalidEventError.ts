/**
 * Inbound event rejected as invalid input (e.g. missing or malformed name)
 * after the pre-collector transformer chain had its chance to enrich it.
 * A client/producer fault, not a pipeline failure: the collector resolves
 * it as `{ ok: false, invalid: true }` instead of an error-logged crash,
 * and HTTP sources map it to a 400-class response.
 */
export class InvalidEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEventError';

    // Preserve the prototype chain so `instanceof` still holds where the
    // class is downleveled to ES5 and `Reflect.construct` is unavailable.
    Object.setPrototypeOf(this, InvalidEventError.prototype);
  }
}
