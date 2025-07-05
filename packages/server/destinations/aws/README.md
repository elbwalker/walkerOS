<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# AWS Destination for walkerOS

This package provides an AWS destination for walkerOS. It allows you to send
events to various AWS services. Currently, it supports AWS Firehose.

## Installation

```sh
npm install @walkerOS/server-destination-aws
```

## Usage

Here's a basic example of how to use the AWS destination:

```typescript
import { elb } from '@walkerOS/server-collector';
import { destinationFirehose } from '@walkerOS/server-destination-aws';

elb('walker destination', destinationFirehose, {
  custom: {
    firehose: {
      streamName: 'your-firehose-stream-name',
      region: 'eu-central-1',
      credentials: {
        accessKeyId: 'your-access-key-id',
        secretAccessKey: 'your-secret-access-key',
      },
    },
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
