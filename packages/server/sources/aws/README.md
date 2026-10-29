<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-source-aws

AWS Lambda source for walkerOS. It works across API Gateway REST (v1), API
Gateway HTTP (v2) and Lambda Function URLs. The package also ships an SQS source
for ingesting from SQS queues.

[Documentation](https://www.walkeros.io/docs/sources/server/aws) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-source-aws) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/sources/aws)

## Installation

```bash
npm install @walkeros/server-source-aws
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "sources": {
        "lambda": {
          "package": "@walkeros/server-source-aws",
          "import": "sourceLambda",
          "config": {}
        }
      }
    }
  }
}
```

The package has no default export, so a step names the source with `"import"`
(`sourceLambda` or `sourceSqs`). This quick-start bundle is for deploying to AWS
Lambda: the walkerOS runtime serves only sources with an HTTP handler, such as
the Express source.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/server/aws**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
