<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Web API Destination for walkerOS

This package provides a web API destination for walkerOS. It allows you to send
events to a custom API endpoint.

[View documentation](https://www.elbwalker.com/docs/destinations/web/api/)

## Installation

```sh
npm install @walkerOS/web-destination-api
```

## Usage

Here's a basic example of how to use the web API destination:

```typescript
import { elb } from '@walkerOS/web-collector';
import { destinationAPI } from '@walkerOS/web-destination-api';

elb('walker destination', destinationAPI, {
  custom: {
    url: 'https://api.example.com/events',
  },
});
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
