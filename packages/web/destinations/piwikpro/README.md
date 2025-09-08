<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src="https://www.elbwalker.com/img/elbwalker_logo.png" width="256px"/>
  </a>
</p>

# Piwik PRO Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/piwikpro)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-piwikpro)

This package provides a [Piwik PRO](https://piwik.pro/) destination for
walkerOS. Piwik PRO is a European, privacy-focused web analytics and marketing
platform that helps businesses track website traffic and user behavior.

walkerOS follows a **source → collector → destination** architecture. This Piwik
PRO destination receives processed events from the walkerOS collector and
transforms them into Piwik PRO's analytics format, providing privacy-compliant
analytics with GDPR compliance and data ownership control.

## Installation

```sh
npm install @walkeros/web-destination-piwikpro
```

## Usage

Here's a basic example of how to use the Piwik PRO destination:

```typescript
import { createCollector } from '@walkeros/collector';
import { destinationPiwikPro } from '@walkeros/web-destination-piwikpro';

const { elb } = await createCollector();

elb('walker destination', destinationPiwikPro, {
  settings: {
    appId: 'XXX-XXX-XXX-XXX-XXX', // Required
    url: 'https://your_account_name.piwik.pro/', // Required
  },
});
```

## Configuration

| Name           | Type      | Description                                    | Required | Example                                  |
| -------------- | --------- | ---------------------------------------------- | -------- | ---------------------------------------- |
| `appId`        | `string`  | ID of the Piwik PRO site                       | Yes      | `'XXX-XXX-XXX-XXX-XXX'`                  |
| `url`          | `string`  | URL of your Piwik PRO account                  | Yes      | `'https://your_account_name.piwik.pro/'` |
| `linkTracking` | `boolean` | Enables/Disables download and outlink tracking | No       | `false`                                  |

### Event Mapping

For custom event mapping (`mapping.entity.action.settings`):

| Name        | Type     | Description                           | Required | Example        |
| ----------- | -------- | ------------------------------------- | -------- | -------------- |
| `goalId`    | `string` | ID to count the event as a goal       | No       | `'1'`          |
| `goalValue` | `string` | Property to be used as the goal value | No       | `'data.value'` |

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
