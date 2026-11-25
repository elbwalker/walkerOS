# @walkeros/server-core

## 4.10.0

### Minor Changes

- 425c9b0: Runners, scripts and CI now connect to the walkerOS app with one
  credential in `WALKEROS_CREDENTIAL`: pair a runner on its flow part's
  Self-hosted tab, or create an automation under Account, and the auth host
  shows it once. The credential itself is never sent: it buys short-lived tokens
  bound to its key, and a runner signs its requests when the auth server cannot
  be reached, so it keeps serving. `walkeros auth token` prints a 1-hour bearer
  token of an automation for `curl`.

  Migration: `WALKEROS_TOKEN` and `WALKEROS_DEPLOY_TOKEN` are gone, and so are
  `runneros start`'s `--flow-id` and `--project` and its `WALKEROS_APP_URL`,
  `WALKEROS_PROJECT_ID`, `WALKEROS_FLOW_ID` and `WALKEROS_DEPLOYMENT_ID`, the
  CLI's `resolveAccessToken` and the runner's `resolveRunToken` and
  `resolveAppUrl`; set `WALKEROS_CREDENTIAL` from a pairing or an automation.

### Patch Changes

- 4938120: A refused service credential's line now says only what is known. When
  the auth server refuses the credential, the line names its end (replaced,
  revoked or ended) and, for a self-hosted runner, that it is paired again on
  its Self-hosted tab, and an earlier refusal never hides that line. When the
  app refuses a token the auth server had just issued, the line names the
  resource the credential's tokens are for and no end. The note on how far this
  clock is off shows only past what the refusing check allows.
- 6d59900: `runneros remote` takes releases from the walkerOS app with the
  runner's credential, keeps their secret values sealed in its cache and signs
  its flow's ingest writes through the supervisor. `runneros start` no longer
  reads `WALKEROS_FLOW_RELEASE` or `WALKEROS_FLOW_NAME`, since a remote release
  checks its artifact's sha256 before any code runs.
- 28df061: The Meta, Bing, Pinterest, Snapchat, X, LinkedIn and Criteo server
  destinations leave out an empty value under a key they hash, so an X event
  whose only primary identifier is a blank email or phone, or a LinkedIn event
  whose only one is a blank email, now fails with `missing-input`. Snapchat
  hashes a list item by item, and a list under a key that takes one value (Bing
  `em` and `ph`, Snapchat `external_id`, X `email` and `phone`, LinkedIn and
  Criteo `email`) is left out with an ERROR line. `doNotHash` takes values that
  are already SHA-256 digests and sends them as mapped, validation refuses a key
  the destination does not hash, and Criteo no longer detects digests: use
  `doNotHash: ['email']` for a SHA-256 digest (sent without the `md5` and
  `sha256_md5` keys) and map the raw email instead of an MD5 digest.
- 527c632: Server-core gains the channel a runner uses to talk to the app: a
  conditional GET with ETag, a JSON POST, capped streams that follow one
  redirect without credentials, and a check-in loop with full-jitter back-off
  and Retry-After. `ChannelError` names the failure and its hop.
- f1745d7: A paired runner now signs its writes to walkerOS hosted ingest with
  its own credential key, so a flow needs no ingest token: the usage report
  signs each report when it names no token, and the ClickHouse destination signs
  each insert when its settings set `signed: true`. Any other endpoint or
  ClickHouse keeps its token or credentials as before and is never signed for.
- Updated dependencies [61030f8]
- Updated dependencies [527c632]
- Updated dependencies [0af174a]
- Updated dependencies [61030f8]
- Updated dependencies [61030f8]
- Updated dependencies [777c48d]
- Updated dependencies [777c48d]
- Updated dependencies [6d59900]
- Updated dependencies [6d59900]
- Updated dependencies [e3744e4]
- Updated dependencies [28df061]
- Updated dependencies [ffd9795]
- Updated dependencies [425c9b0]
- Updated dependencies [777c48d]
- Updated dependencies [f1745d7]
  - @walkeros/core@4.10.0

## 4.9.0

### Patch Changes

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

## 4.8.2

### Patch Changes

- 2374f54: `sendServer` now throws a `StepError` instead of resolving
  `{ ok: false }`: `transport` with the status and body, `timeout`, or `config`
  for an invalid URL. It runs on the global `fetch`, and `GET` and `HEAD`
  requests send no body.
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
  - @walkeros/core@4.8.2

## 4.8.1

### Patch Changes

- Updated dependencies [1062e99]
  - @walkeros/core@4.8.1

## 4.8.0

### Patch Changes

- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
  - @walkeros/core@4.8.0

## 4.7.2

### Patch Changes

- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2

## 4.7.1

### Patch Changes

- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
  - @walkeros/core@4.7.1

## 4.7.0

### Minor Changes

- 74821ed: `anonymizeIP` now handles IPv6 (first 48 bits) and IPv4-mapped
  addresses; `getHashServer` takes an optional HMAC `key`. The fingerprint
  transformer works with just `{ salt }`: it hashes the anonymized IP, reduced
  user agent and site, rotated daily. Hashes change once on upgrade;
  `rotate: "none"` keeps them stable. A missing salt warns.

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

## 4.6.1

### Patch Changes

- @walkeros/core@4.6.1

## 4.6.0

### Patch Changes

- @walkeros/core@4.6.0

## 4.5.0

### Patch Changes

- Updated dependencies [63845bb]
- Updated dependencies [79cdcb0]
- Updated dependencies [756b571]
  - @walkeros/core@4.5.0

## 4.4.0

### Patch Changes

- Updated dependencies [6c89afb]
- Updated dependencies [393b942]
- Updated dependencies [034b1de]
- Updated dependencies [d00e2bd]
  - @walkeros/core@4.4.0

## 4.3.2

### Patch Changes

- @walkeros/core@4.3.2

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
  - @walkeros/core@4.3.1

## 4.3.0

### Patch Changes

- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
  - @walkeros/core@4.2.1

## 4.2.0

### Patch Changes

- 2d64ed2: `getHashServer` now accepts an `algorithm` option (`sha256` default,
  or `md5`), so destinations can request either digest from the shared util
  instead of calling Node crypto directly. Criteo's email hashing composes this
  util for its md5, sha256, and sha256_md5 forms. No behavior change for
  existing SHA-256 callers.
- Updated dependencies [76d32c1]
- Updated dependencies [908d6f0]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
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

## 4.1.2

### Patch Changes

- @walkeros/core@4.1.2

## 4.1.1

### Patch Changes

- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
  - @walkeros/core@4.1.1

## 4.1.0

### Patch Changes

- Updated dependencies [e155ff8]
- Updated dependencies [e800974]
- Updated dependencies [e155ff8]
- Updated dependencies [1a8f2d7]
- Updated dependencies [1a8f2d7]
- Updated dependencies [b276173]
- Updated dependencies [dd9f5ad]
- Updated dependencies [c60ef35]
- Updated dependencies [adeebea]
- Updated dependencies [13aaeaa]
- Updated dependencies [e800974]
- Updated dependencies [adeebea]
- Updated dependencies [e800974]
- Updated dependencies [e800974]
- Updated dependencies [058f7ed]
- Updated dependencies [28a8ac2]
- Updated dependencies [fd6076e]
  - @walkeros/core@4.1.0

## 4.0.2

### Patch Changes

- Updated dependencies [a6a0ea7]
  - @walkeros/core@4.0.2

## 4.0.1

### Patch Changes

- Updated dependencies [381dfe7]
- Updated dependencies [1524275]
- Updated dependencies [03d7055]
  - @walkeros/core@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies [93ea9c4]
- Updated dependencies [465775c]
- Updated dependencies [942a7fe]
- Updated dependencies [cfc7469]
- Updated dependencies [8e06b1f]
- Updated dependencies [3d50dd6]
- Updated dependencies [1ef33d9]
  - @walkeros/core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/core@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [12adf24]
- Updated dependencies [75aa26b]
  - @walkeros/core@3.4.1

## 3.4.0

### Patch Changes

- Updated dependencies [74940cc]
- Updated dependencies [525f5d9]
  - @walkeros/core@3.4.0

## 3.3.1

### Patch Changes

- @walkeros/core@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
  - @walkeros/core@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/core@3.1.1

## 3.1.0

### Patch Changes

- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/core@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/core@3.0.1

## 3.0.0

### Patch Changes

- 499e27a: Add sideEffects declarations to all packages for bundler tree-shaking
  support.
- Updated dependencies [2b259b6]
- Updated dependencies [2614014]
- Updated dependencies [6ae0ee3]
- Updated dependencies [37299a9]
- Updated dependencies [499e27a]
- Updated dependencies [0e5eede]
- Updated dependencies [d11f574]
- Updated dependencies [d11f574]
- Updated dependencies [1fe337a]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [499e27a]
- Updated dependencies [c83d909]
- Updated dependencies [b6c8fa8]
  - @walkeros/core@3.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1

## 2.1.0

### Patch Changes

- Updated dependencies [7fc4cee]
- Updated dependencies [7fc4cee]
- Updated dependencies [cb2da05]
- Updated dependencies [2bbe8c8]
- Updated dependencies [3eb6416]
- Updated dependencies [02a7958]
- Updated dependencies [97df0b2]
- Updated dependencies [97df0b2]
- Updated dependencies [026c412]
- Updated dependencies [7d38d9d]
  - @walkeros/core@2.1.0

## 2.0.1

## 2.0.0

### Patch Changes

- Updated dependencies [7b2d750]
  - @walkeros/core@1.4.0

## 1.0.5

### Patch Changes

- Updated dependencies [a4cc1ea]
  - @walkeros/core@1.3.0

## 1.0.4

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/core@1.2.2

## 1.0.3

### Patch Changes

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1

## 1.0.2

### Patch Changes

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
  - @walkeros/core@1.2.0

## 1.0.1

### Patch Changes

- Updated dependencies [b65b773]
- Updated dependencies [20eca6e]
  - @walkeros/core@1.1.0

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/core@1.0.0
