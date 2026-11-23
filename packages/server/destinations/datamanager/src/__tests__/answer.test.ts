import { fieldWarningsOf, refusalMessage } from '../answer';

// Bodies in the shape of Google's understand-errors page.
const BAD_REQUEST = 'type.googleapis.com/google.rpc.BadRequest';
const ERROR_INFO = 'type.googleapis.com/google.rpc.ErrorInfo';

const googleError = (code: number, status: string, details: unknown[]) => ({
  error: {
    code,
    message: 'Request contains an invalid argument.',
    status,
    details,
  },
});

const badRequest = (...fieldViolations: unknown[]) =>
  googleError(400, 'INVALID_ARGUMENT', [
    { '@type': BAD_REQUEST, fieldViolations },
  ]);

const hexViolation = (field: string) => ({
  field,
  description: 'The HEX encoded value is malformed.',
  reason: 'INVALID_HEX_ENCODING',
});

const invalidAccountId = badRequest({
  field: 'destinations[0].login_account.account_id',
  description: 'String is not a valid number.',
  reason: 'INVALID_NUMBER_FORMAT',
});

describe('answer', () => {
  it.each([
    [
      'field violation',
      400,
      invalidAccountId,
      'Data Manager API error (400 INVALID_ARGUMENT): INVALID_NUMBER_FORMAT at destinations[0].login_account.account_id',
    ],
    [
      'two violations',
      400,
      badRequest(
        hexViolation('events.events[0].user_data.user_identifiers[1]'),
        hexViolation('events.events[1].user_data.user_identifiers[2]'),
      ),
      'Data Manager API error (400 INVALID_ARGUMENT): INVALID_HEX_ENCODING at events.events[0].user_data.user_identifiers[1], INVALID_HEX_ENCODING at events.events[1].user_data.user_identifiers[2]',
    ],
    [
      'daily quota',
      429,
      googleError(429, 'RESOURCE_EXHAUSTED', [
        {
          '@type': ERROR_INFO,
          reason: 'RATE_LIMIT_EXCEEDED',
          metadata: { quota_limit: 'IngestionMutateRequestsPerDayPerProject' },
        },
      ]),
      'Data Manager API error (429 RESOURCE_EXHAUSTED): RATE_LIMIT_EXCEEDED, IngestionMutateRequestsPerDayPerProject',
    ],
    [
      'error info only',
      403,
      googleError(403, 'PERMISSION_DENIED', [
        { '@type': ERROR_INFO, reason: 'SERVICE_DISABLED' },
      ]),
      'Data Manager API error (403 PERMISSION_DENIED): SERVICE_DISABLED',
    ],
    [
      'description left out',
      400,
      invalidAccountId,
      expect.not.stringContaining('String is not a valid number.'),
    ],
    [
      'unsafe parts left out',
      400,
      badRequest({ field: 'user <x@y.z>', reason: 'bad reason' }),
      'Data Manager API error (400 INVALID_ARGUMENT)',
    ],
    [
      'not the Google error shape',
      502,
      'Bad Gateway',
      'Data Manager API error (502)',
    ],
  ])('refusalMessage: %s', (_, status, body, expected) => {
    expect(refusalMessage(status, body)).toEqual(expected);
  });

  it.each([
    [
      'a documented warning',
      {
        requestId: 'r',
        fieldWarnings: [
          {
            field: 'events.events[0].cart_data.items[0].merchant_product_id',
            reason: 'WARNING_REASON_CART_DATA_ITEM_MERCHANT_PRODUCT_ID_MISSING',
            description: 'The merchant product ID is missing in the cart item.',
          },
        ],
      },
      [
        'WARNING_REASON_CART_DATA_ITEM_MERCHANT_PRODUCT_ID_MISSING at events.events[0].cart_data.items[0].merchant_product_id',
      ],
    ],
    [
      'safe and unsafe warnings',
      {
        fieldWarnings: [
          {
            field: 'events.events[0].client_id',
            reason: 'WARNING_REASON_INVALID_CLIENT_ID',
            description: 'The client ID is invalid.',
          },
          { reason: 'WARNING_REASON_INVALID_CLIENT_ID' },
          { field: 'user <x@y.z>', reason: 'bad reason' },
        ],
      },
      [
        'WARNING_REASON_INVALID_CLIENT_ID at events.events[0].client_id',
        '2 more field warnings',
      ],
    ],
    ['no warnings', { requestId: 'r' }, []],
  ])('fieldWarningsOf: %s', (_, data, expected) => {
    expect(fieldWarningsOf(data)).toEqual(expected);
  });
});
