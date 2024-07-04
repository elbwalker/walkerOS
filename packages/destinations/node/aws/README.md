<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# AWS Destination for walkerOS

The AWS Destination package allows you to send events to various AWS services
using walkerOS. Currently, it supports AWS Firehose, with plans to add more
services like SNS, SQS, CloudWatch, and Lambda.

## Overview

This package is designed to work seamlessly with walkerOS, enabling you to
integrate AWS services for efficient event handling and data processing.

## Installation

To get started, install the package via npm:

```sh
npm install @elbwalker/destination-node-aws
```

## Configuration

Configure the AWS destination with your AWS credentials and settings. Below is
an example configuration:

```js
import destinationAWS from '@elbwalker/destination-node-aws';

const config = {
  firehose: {
    streamName: 'your-firehose-stream-name', // Required
    region: 'eu-central-1',
    credentials: {
      accessKeyId: 'your-access-key-id',
      secretAccessKey: 'your-secret-access-key',
    },
  },
};

elb('walker destination', destinationAWS, config);
```

### Optional Configuration Fields

- `region`: AWS region where your services are hosted.
- `credentials`: AWS credentials for authentication, containing `accessKeyId`
  and `secretAccessKey`.

## Firehose

To configure AWS Firehose, use the following example:

```js
const firehoseConfig = {
  streamName: 'your-firehose-stream-name',
  region: 'eu-central-1',
  credentials: {
    accessKeyId: 'your-access-key-id',
    secretAccessKey: 'your-secret-access-key',
  },
};

elb('walker destination', destinationAWS, { firehose: firehoseConfig });
```

## Usage

You can add the destination multiple times, each with one AWS service
configured, or once with all services combined. This flexibility allows you to
use different credentials or handle error handling individually.

### Example

Here is a simple example to demonstrate how to use the AWS destination with
walkerOS:

```js
import destinationAWS from '@elbwalker/destination-node-aws';

const config = {
  firehose: {
    streamName: 'your-firehose-stream-name',
    region: 'eu-central-1',
    credentials: {
      accessKeyId: 'your-access-key-id',
      secretAccessKey: 'your-secret-access-key',
    },
  },
};

elb('walker destination', destinationAWS, config);
```

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.

## More Information

For more detailed information and examples, please refer to the
[documentation](https://www.elbwalker.com/docs/destinations/node/aws).
