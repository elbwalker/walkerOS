# @walkeros/server-destination-matomo

## 4.10.0

### Patch Changes

- b8c96ce: New Matomo server destination for the HTTP Tracking API: page views,
  events, goals, site search and ecommerce from walker.js events, with the
  visitor ID derived from the device ID. It sends the visitor's IP, user agent
  and user ID only when you set them, needs a token for the IP and for events
  older than a day, and can pick the site ID and tracker URL per event, so one
  step serves several sites. A request Matomo refuses fails the push instead of
  counting as delivered.
- Updated dependencies [61030f8]
- Updated dependencies [527c632]
- Updated dependencies [0af174a]
- Updated dependencies [61030f8]
- Updated dependencies [61030f8]
- Updated dependencies [777c48d]
- Updated dependencies [4938120]
- Updated dependencies [777c48d]
- Updated dependencies [6d59900]
- Updated dependencies [6d59900]
- Updated dependencies [e3744e4]
- Updated dependencies [28df061]
- Updated dependencies [527c632]
- Updated dependencies [ffd9795]
- Updated dependencies [425c9b0]
- Updated dependencies [777c48d]
- Updated dependencies [f1745d7]
  - @walkeros/core@4.10.0
  - @walkeros/server-core@4.10.0
