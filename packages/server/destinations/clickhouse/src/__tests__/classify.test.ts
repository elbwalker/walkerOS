import { ClickHouseError } from '../__mocks__/@clickhouse/client';
import { adviceFor, classify, errorCode } from '../classify';

/** A rejection as the server produces it: the class, carrying a string code. */
function serverError(code: string, message = 'clickhouse insert failed') {
  return new ClickHouseError({ message, code });
}

describe('classify', () => {
  // Every condition that ends on its own within seconds. TIMEOUT_EXCEEDED and
  // QUERY_WAS_CANCELLED are the two that may have landed anyway, and the
  // deduplication token is what makes retrying them safe.
  it.each([
    ['159', 'TIMEOUT_EXCEEDED'],
    ['202', 'TOO_MANY_SIMULTANEOUS_QUERIES'],
    ['203', 'NO_FREE_CONNECTION'],
    ['209', 'SOCKET_TIMEOUT'],
    ['210', 'NETWORK_ERROR'],
    ['242', 'TABLE_IS_READ_ONLY'],
    ['394', 'QUERY_WAS_CANCELLED'],
    ['439', 'CANNOT_SCHEDULE_TASK'],
    ['745', 'SERVER_OVERLOADED'],
    ['999', 'KEEPER_EXCEPTION'],
    ['1017', 'ASYNC_INSERT_FLUSH_TIMEOUT'],
  ])('retries %s %s', (code) => {
    expect(classify(serverError(code))).toBe('retryable');
  });

  // Everything a second attempt cannot change: the batch is wrong, the table is
  // wrong, or the server needs the operator to change something first.
  it.each([
    ['6', 'CANNOT_PARSE_TEXT'],
    ['16', 'NO_SUCH_COLUMN_IN_TABLE'],
    ['26', 'CANNOT_PARSE_QUOTED_STRING'],
    ['27', 'CANNOT_PARSE_INPUT_ASSERTION_FAILED'],
    ['38', 'CANNOT_PARSE_DATE'],
    ['41', 'CANNOT_PARSE_DATETIME'],
    ['53', 'TYPE_MISMATCH'],
    ['60', 'UNKNOWN_TABLE'],
    ['72', 'CANNOT_PARSE_NUMBER'],
    ['81', 'UNKNOWN_DATABASE'],
    ['117', 'INCORRECT_DATA'],
    ['164', 'READONLY'],
    ['241', 'MEMORY_LIMIT_EXCEEDED'],
    ['252', 'TOO_MANY_PARTS'],
    ['516', 'AUTHENTICATION_FAILED'],
    ['565', 'TOO_MANY_PARTITIONS_FOR_SINGLE_INSERT_BLOCK'],
  ])('gives up on %s %s', (code) => {
    expect(classify(serverError(code))).toBe('terminal');
  });

  // Nothing answered, so nothing was rejected. The token makes the retry free.
  it('retries an error carrying no clickhouse code', () => {
    expect(classify(new Error('unparsed server response'))).toBe('retryable');
  });

  it.each([undefined, null, 'unparsed server response', 500])(
    'retries a %s rejection',
    (reason) => {
      expect(classify(reason)).toBe('retryable');
    },
  );

  // The failure class the retry exists for, and the one a code check that read
  // any `code` property would send straight to the dead letter queue instead. A
  // socket-level rejection never gets a code from the server: it arrives with
  // its Node errno still on it, and the client hands an error it could not
  // parse back untouched.
  it.each([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'ERR_STREAM_PREMATURE_CLOSE',
  ])('retries a socket failure carrying errno %s', (errno) => {
    const error = Object.assign(new Error('socket hang up'), { code: errno });

    expect(classify(error)).toBe('retryable');
  });

  // Retrying a batch the server did reject costs one attempt. Dropping one that
  // would have landed costs the batch, and the collector never retries what it
  // dead-letters, so an unreadable code errs towards the retry.
  //
  // The number is a terminal code on purpose: a classifier that stringified it
  // would answer 'terminal' here, so reading 'retryable' is what proves a
  // number is not read as a ClickHouse code at all.
  it('treats a numeric code as no code at all', () => {
    expect(classify({ code: 16 })).toBe('retryable');
  });

  // ClickHouse maps a few dozen codes to their own status and sends everything
  // else as a plain 500, so a status tells a saturated queue and an unknown
  // column apart no better than a coin does. The status here is deliberately a
  // 4xx: a classifier that read the status would call it terminal, so this
  // fails if one is ever introduced.
  it('reads no classification out of a bare http status', () => {
    expect(classify({ status: 400 })).toBe('retryable');
  });

  it('ignores a retryable-looking status beside a terminal code', () => {
    const error = Object.assign(serverError('16'), { status: 503 });

    expect(classify(error)).toBe('terminal');
  });
});

// The advice travels in the failure's message (deliver.ts); the collector logs
// it once per cause, and the package writes no line of its own.
describe('operator guidance', () => {
  it('names the batch size as the fix for too many parts', () => {
    expect(adviceFor('252')).toContain('config.batch.size');
    expect(adviceFor('252')).toContain(
      'Raising parts_to_throw_insert is not the fix',
    );
  });

  it('points an unknown table at the table DDL in the docs', () => {
    expect(adviceFor('60')).toContain('table DDL');
    expect(adviceFor('60')).toContain(
      'https://www.walkeros.io/docs/destinations/server/clickhouse#create-the-table',
    );
  });

  it.each([
    ['a retryable code', '159'],
    ['a terminal code that explains itself', '53'],
    ['no code', undefined],
  ])('gives no advice for %s', (_label, code) => {
    expect(adviceFor(code)).toBeUndefined();
  });
});

describe('errorCode', () => {
  it('reads the code off the class the server produces', () => {
    expect(errorCode(serverError('252'))).toBe('252');
  });

  // A bundled or duplicated copy of the client is a different class object, so
  // an `instanceof` check would miss a perfectly good code.
  it('reads a code off any shape carrying one', () => {
    expect(errorCode({ code: '159' })).toBe('159');
  });

  it.each([
    ['a codeless error', new Error('unparsed server response')],
    [
      'a node errno',
      Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
    ],
    ['a bare http status', { status: 500 }],
    ['a numeric code', { code: 159 }],
    ['a code with digits in it', { code: 'ERR_HTTP2_STREAM_ERROR_404' }],
    ['an empty code', { code: '' }],
    ['nothing at all', undefined],
    ['a null rejection', null],
    ['a string rejection', 'socket hang up'],
  ])('reads no code off %s', (_shape, error) => {
    expect(errorCode(error)).toBeUndefined();
  });
});
