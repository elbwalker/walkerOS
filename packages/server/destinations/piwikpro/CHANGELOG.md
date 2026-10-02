# @walkeros/server-destination-piwikpro

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
