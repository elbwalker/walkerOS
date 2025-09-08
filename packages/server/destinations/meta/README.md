<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src="https://www.elbwalker.com/img/elbwalker_logo.png" width="256px"/>
  </a>
</p>

# Meta (CAPI) Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/meta)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-meta)

walkerOS follows a **source → collector → destination** architecture. This Meta
CAPI destination receives processed events from the walkerOS collector and sends
them server-to-server to Meta's Conversions API, providing enhanced data
accuracy and attribution for Meta advertising campaigns while bypassing browser
limitations.

## Installation

```sh
npm install @walkeros/server-destination-meta
```

## Usage

Here's a basic example of how to use the Meta CAPI destination:

```typescript
import { elb } from '@walkeros/collector';
import { destinationMeta } from '@walkeros/server-destination-meta';

elb('walker destination', destinationMeta, {
  settings: {
    accessToken: 'YOUR_ACCESS_TOKEN',
    pixelId: 'YOUR_PIXEL_ID',
  },
});
```

## Configuration

| Name              | Type                  | Description                                               | Required | Example                                        |
| ----------------- | --------------------- | --------------------------------------------------------- | -------- | ---------------------------------------------- |
| `accessToken`     | `string`              | Meta access token for Conversions API authentication      | Yes      | `'your_access_token'`                          |
| `pixelId`         | `string`              | Meta Pixel ID from your Facebook Business account         | Yes      | `'1234567890'`                                 |
| `action_source`   | `ActionSource`        | Source of the event (website, app, phone_call, etc.)      | No       | `'website'`                                    |
| `doNotHash`       | `string[]`            | Array of user_data fields that should not be hashed       | No       | `['client_ip_address', 'client_user_agent']`   |
| `test_event_code` | `string`              | Test event code for debugging Meta Conversions API events | No       | `'TEST12345'`                                  |
| `url`             | `string`              | Custom URL for Meta Conversions API endpoint              | No       | `'https://graph.facebook.com/v17.0'`           |
| `user_data`       | `WalkerOSMapping.Map` | Mapping configuration for user data fields                | No       | `{ email: 'user.email', phone: 'user.phone' }` |

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
