# @walkeros/web-destination-fullstory

FullStory web destination for [walkerOS](https://github.com/elbwalker/walkerOS).
Forwards events to FullStory via the official `@fullstory/browser` SDK v2 with
support for custom events, user/page properties, identity, and consent.

## Installation

```bash
npm install @walkeros/web-destination-fullstory
```

## Quick Start

```json
{
  "destinations": {
    "fullstory": {
      "package": "@walkeros/web-destination-fullstory",
      "config": {
        "consent": { "analytics": true },
        "settings": {
          "orgId": "o-XXXXXX-na1"
        }
      }
    }
  }
}
```

## Settings

| Setting                    | Type         | Required | Description                                      |
| -------------------------- | ------------ | -------- | ------------------------------------------------ |
| `orgId`                    | string       | Yes      | FullStory organization ID                        |
| `host`                     | string       | No       | Recording server host (proxy support)            |
| `script`                   | string       | No       | Custom script CDN host                           |
| `cookieDomain`             | string       | No       | Cookie domain override                           |
| `debug`                    | boolean      | No       | Browser console debug logging                    |
| `devMode`                  | boolean      | No       | Disable recording (dev environments)             |
| `startCaptureManually`     | boolean      | No       | Delay capture until consent                      |
| `namespace`                | string       | No       | Global FS identifier override                    |
| `recordCrossDomainIFrames` | boolean      | No       | Cross-domain iframe recording                    |
| `identify`                 | MappingValue | No       | Destination-level identity mapping               |
| `consent`                  | Record       | No       | walkerOS consent key to FullStory action mapping |

## Mapping Settings

Per-event mapping settings control which FullStory methods are called:

| Setting    | Effect                                      | Description                          |
| ---------- | ------------------------------------------- | ------------------------------------ |
| `identify` | Calls `setIdentity({ uid, properties })`    | Overrides destination-level identify |
| `set`      | Calls `setProperties({ type, properties })` | User or page properties              |
| `setType`  | Controls property scope                     | `'user'` (default) or `'page'`       |

## Consent

For GDPR compliance, use `startCaptureManually: true` and map consent:

```json
{
  "settings": {
    "orgId": "o-XXXXXX-na1",
    "startCaptureManually": true,
    "consent": {
      "analytics": "capture"
    }
  }
}
```

- `"capture"` controls `start`/`shutdown` (recording on/off)
- `"consent"` controls `setIdentity({ consent })` flag
