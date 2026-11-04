# @walkeros/server-destination-piwikpro

## 4.9.0

### Patch Changes

- 5313635: The sample events from `getEvent` now use the standard event names:
  `checkout start` replaces `checkout view`, an order carries `tax` and `total`,
  a promotion names its placement `slot`, and product events carry `currency`.
  Order `value` is now the merchandise value: the `order complete` sample goes
  from 555 to 462, and the gross amount charged is `total` (467.22). The
  destination examples read `data.tax`, `data.slot` and the search keys
  `data.term` and `data.results`, and gross fields such as Matomo `grandTotal`
  read `data.total` first, then `data.value`. The CLI ships default event
  contracts for common site types in `examples/contracts/`.
- 34fd225: The ecommerce methods send the `currencyCode` of their options
  argument as the Tracking API `cur` parameter, so a web mapping with a currency
  works unchanged on the server. Before, the currency was dropped and Piwik PRO
  booked the order in the app's default currency. The examples now also show the
  client IP and user agent.
- 5313635: The package publishes a minimal example: the account URL and the app
  ID. The docs page renders the install line, the integrated code and the flow
  from it, and the package test runs the same settings.
- 5313635: The `pageUrl` setting description and the batch hint now match the
  behaviour: an event without a page URL, or one the rule cannot turn into a
  hit, fails the push with `missing-input`. They no longer claim that such
  events are skipped. In a batch, the other events are still sent.
- 1306d8a: Package descriptions and hints now match what the destinations do.
  The API custom headers example names `settings.headers`. Piwik PRO's ingest
  hint warns that behind a proxy `ip` is the proxy's address, and its examples
  use one app ID placeholder. Segment lists the calls it sends, and HubSpot
  updates contacts rather than upserting them.
- Updated dependencies [a67546d]
- Updated dependencies [1306d8a]
- Updated dependencies [34fd225]
- Updated dependencies [5313635]
- Updated dependencies [1306d8a]
- Updated dependencies [fa46337]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [5313635]
- Updated dependencies [34fd225]
- Updated dependencies [fa46337]
- Updated dependencies [1306d8a]
- Updated dependencies [5313635]
  - @walkeros/core@4.9.0
  - @walkeros/server-core@4.9.0

## 4.8.2

### Patch Changes

- 2374f54: Events that no rule maps, unknown methods, invalid arguments and a
  missing page URL fail with `missing-input`; use an `ignore: true` rule to keep
  an event out without a failure. Piwik PRO's own 429 warning is replaced by the
  collector's line with the status.
- 2374f54: A failed request is reported as a failed push (dead-letter queue, one
  ERROR line with the status) instead of counting as delivered or being logged
  at debug. Events a destination cannot send, such as a missing user identifier,
  fail with `missing-input`. Rules with `silent: true` send no event of their
  own.
- Updated dependencies [2374f54]
- Updated dependencies [7e5fc27]
- Updated dependencies [2374f54]
- Updated dependencies [964590a]
- Updated dependencies [4100ede]
- Updated dependencies [2374f54]
- Updated dependencies [2374f54]
- Updated dependencies [15eb7b2]
- Updated dependencies [33a2779]
- Updated dependencies [33a2779]
- Updated dependencies [2374f54]
  - @walkeros/core@4.8.2
  - @walkeros/server-core@4.8.2

## 4.8.1

### Patch Changes

- Updated dependencies [1062e99]
  - @walkeros/core@4.8.1
  - @walkeros/server-core@4.8.1

## 4.8.0

### Patch Changes

- 5593d7b: The `identified` description and hint now explain why its consent
  states stay out of `config.consent`: a destination needs only one granted
  state there, so a repeated state lets events through on its own, and as the
  only state it holds events back, so no anonymous hit is sent.
- 5593d7b: The ecommerce step examples now test for a product entity without a
  package helper. The published condition, shown in the docs and returned by
  `package_get`, referenced a minified import and threw when copied into a flow;
  it now runs on its own.
- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
  - @walkeros/core@4.8.0
  - @walkeros/server-core@4.8.0

## 4.7.2

### Patch Changes

- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2
  - @walkeros/server-core@4.7.2

## 4.7.1

### Patch Changes

- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
  - @walkeros/core@4.7.1
  - @walkeros/server-core@4.7.1

## 4.7.0

### Minor Changes

- 8a32978: New Piwik PRO server destination. A web destination mapping that uses
  the 13 portable methods produces the same hits on the server. Browser-only
  commands such as `setUserId` are skipped. Events go to the Piwik PRO Tracking
  API as one bulk request per push or batch. The `identified` setting chooses
  identified or anonymous tracking, always or based on consent.

### Patch Changes

- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [64b06de]
- Updated dependencies [4b4937f]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [e860006]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [4f89234]
  - @walkeros/core@4.7.0
  - @walkeros/server-core@4.7.0
