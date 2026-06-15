<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-cmp-usercentrics

Integrates Usercentrics consent management with walkerOS using the official
Usercentrics events and consent getters, mapping category or service consent
state to walkerOS consent groups.

[Documentation](https://www.walkeros.io/docs/sources/web/cmps/usercentrics)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-cmp-usercentrics)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/cmps/usercentrics)

## Installation

```bash
npm install @walkeros/web-source-cmp-usercentrics
```

## Quick start

```ts
import { startFlow } from '@walkeros/collector';
import { sourceUsercentrics } from '@walkeros/web-source-cmp-usercentrics';

await startFlow({
  sources: {
    consent: {
      code: sourceUsercentrics,
    },
  },
});
```

## How it works

The source uses Usercentrics' official integration surface, no custom data-layer
event is required:

1. Already initialized: if the CMP has loaded before the source, consent is read
   statically through the official getters (V2 `UC_UI.getServicesBaseInfo()`, V3
   `__ucCmp.getConsentDetails()`).
2. CMP loads after the source: the source listens for `UC_UI_INITIALIZED` and
   reads the current consent state once the CMP signals it is ready.
3. User decisions: the source listens for `UC_UI_CMP_EVENT` (consent actions
   `ACCEPT_ALL`, `DENY_ALL`, and `SAVE`) and republishes the updated state.

Consent is then mapped via `categoryMap` and published with
`elb('walker consent', state)`.

## Timing considerations

A returning visitor's prior choice is applied on page load, either from the
static getter read (CMP already initialized) or on `UC_UI_INITIALIZED` (CMP
loads later). First-visit defaults are suppressed under the default
`explicitOnly: true`: only a state the user has actively decided is published
(V3 `consent.type === EXPLICIT`; V2 an `EXPLICIT` entry in the service consent
history). Set `explicitOnly: false` to publish any consent snapshot, including
implicit first-visit defaults.

## Settings

`explicitOnly` (default `true`) is the cross-version gate for "the user has
actively decided," applied identically for V2 and V3. There is no configurable
data-layer event setting: the `eventName` setting has been removed, and the
source listens to the always-emitted official events.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/cmps/usercentrics**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
