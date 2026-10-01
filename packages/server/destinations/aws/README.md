<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-aws

Stream events to Amazon Data Firehose, or publish them to Amazon SNS topics,
from a walkerOS server flow.

[Documentation](https://www.walkeros.io/docs/destinations/server/aws) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-aws)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/aws)

## Installation

```bash
npm install @walkeros/server-destination-aws
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "firehose": {
          "package": "@walkeros/server-destination-aws",
          "import": "destinationFirehose",
          "config": {
            "settings": { "streamName": "walkeros-events" }
          }
        }
      }
    }
  }
}
```

On AWS compute in the stream's region, that is the whole configuration. Add
`settings.region` for a stream elsewhere, and `config.credentials` with
`$secret` references when the flow runs outside AWS. For SNS, import
`destinationSNS` and set `settings.topicArn`.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/aws** (Firehose) and
**https://www.walkeros.io/docs/destinations/server/sns** (SNS)

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
