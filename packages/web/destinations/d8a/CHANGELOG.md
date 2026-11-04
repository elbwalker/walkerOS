# @walkeros/web-destination-d8a

## 4.9.0

### Patch Changes

- 29d2218: The gtag and d8a destinations now set `analytics_storage` from
  `analytics` consent instead of `functional` by default, matching what the
  Cookiebot, CookieFirst and CookiePro sources report. With the Usercentrics
  source, map your measurement category to `analytics` in its `categoryMap`. If
  your consent commands report measurement consent as `functional`, map it
  yourself, like
  `como: { functional: 'analytics_storage', marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'] }`.
  When several consent keys map to one parameter, the parameter is granted only
  if all of them are granted in the current consent state; before, the key that
  came last won.
- 5313635: The sample events from `getEvent` now use the standard event names:
  `checkout start` replaces `checkout view`, an order carries `tax` and `total`,
  a promotion names its placement `slot`, and product events carry `currency`.
  Order `value` is now the merchandise value: the `order complete` sample goes
  from 555 to 462, and the gross amount charged is `total` (467.22). The
  destination examples read `data.tax`, `data.slot` and the search keys
  `data.term` and `data.results`, and gross fields such as Matomo `grandTotal`
  read `data.total` first, then `data.value`. The CLI ships default event
  contracts for common site types in `examples/contracts/`.
- 9316f2a: The purchase example's item condition works as published, so the
  example no longer throws when a tool evaluates it from the package metadata.
  The `send_page_view` description says d8a sends a page view when the tracker
  starts unless it is set to false.
- 1306d8a: Step examples carry event timestamps in milliseconds, as the walkerOS
  event model defines them, instead of seconds that read as a date in
  January 1970. Where an example's output repeats the timestamp, such as
  `event_timestamp` in the gtag include example or the event a transformer
  example returns, the output shows the same value.
- 5313635: The package publishes a minimal example: the property ID and the
  collector URL is all d8a needs to deliver. The docs page renders the install
  line, the integrated code and the flow from it, and the package test runs the
  same settings, so the setup a reader copies is the one that was tested.
- Updated dependencies [a67546d]
- Updated dependencies [29d2218]
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
- Updated dependencies [5313635]
  - @walkeros/core@4.9.0
  - @walkeros/web-core@4.9.0

## 4.8.2

### Patch Changes

- 7e5fc27: Settings accept SDK options that the schema does not list and pass
  them through to the SDK, so a newer SDK option no longer fails validation.
  Amplitude events from a setup with plugins no longer carry the
  `amplitude-ts-unified` library prefix.
- 2374f54: A failed vendor call, a missing required setting (`config`) and an
  event that cannot be sent (`missing-input`) are reported as failed pushes,
  with the dead-letter queue and one ERROR line, instead of counting as
  delivered. Rules with `silent: true` send no event. Settings schemas reject
  unknown keys.
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
- Updated dependencies [b1d65e2]
- Updated dependencies [964590a]
- Updated dependencies [2374f54]
  - @walkeros/core@4.8.2
  - @walkeros/web-core@4.8.2

## 4.8.1

### Patch Changes

- Updated dependencies [1062e99]
  - @walkeros/core@4.8.1
  - @walkeros/web-core@4.8.1

## 4.8.0

### Patch Changes

- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
  - @walkeros/core@4.8.0
  - @walkeros/web-core@4.8.0

## 4.7.2

### Patch Changes

- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2
  - @walkeros/web-core@4.7.2

## 4.7.1

### Patch Changes

- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
  - @walkeros/web-core@4.7.1
  - @walkeros/core@4.7.1

## 4.7.0

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
  - @walkeros/web-core@4.7.0

## 4.6.1

### Patch Changes

- @walkeros/core@4.6.1
- @walkeros/web-core@4.6.1

## 4.6.0

### Patch Changes

- @walkeros/core@4.6.0
- @walkeros/web-core@4.6.0

## 4.5.0

### Patch Changes

- Updated dependencies [63845bb]
- Updated dependencies [79cdcb0]
- Updated dependencies [756b571]
  - @walkeros/core@4.5.0
  - @walkeros/web-core@4.5.0

## 4.4.0

### Patch Changes

- Updated dependencies [6c89afb]
- Updated dependencies [393b942]
- Updated dependencies [034b1de]
- Updated dependencies [d00e2bd]
  - @walkeros/core@4.4.0
  - @walkeros/web-core@4.4.0

## 4.3.2

### Patch Changes

- @walkeros/core@4.3.2
- @walkeros/web-core@4.3.2

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [74eacdd]
  - @walkeros/core@4.3.1
  - @walkeros/web-core@4.3.1

## 4.3.0

### Patch Changes

- Updated dependencies [83ea3c6]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
- Updated dependencies [d28a8ea]
- Updated dependencies [ebd193f]
  - @walkeros/web-core@4.3.0
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
  - @walkeros/core@4.2.1
  - @walkeros/web-core@4.2.1

## 4.2.0

### Patch Changes

- Updated dependencies [76d32c1]
- Updated dependencies [908d6f0]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [d65bbde]
- Updated dependencies [e8f6909]
- Updated dependencies [c27d3c1]
- Updated dependencies [654ba38]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/core@4.2.0
  - @walkeros/web-core@4.2.0

## 4.1.2

### Patch Changes

- @walkeros/core@4.1.2
- @walkeros/web-core@4.1.2

## 4.1.1

### Patch Changes

- 052dc25: Add the d8a.tech web destination for a GA4-compatible and
  warehouse-native analytics platform.
- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
- Updated dependencies [edd3836]
  - @walkeros/core@4.1.1
  - @walkeros/web-core@4.1.1
