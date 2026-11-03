<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-source-gcp

Google Cloud Functions source for walkerOS: a runtime adapter whose `push` you
assign directly as a Cloud Functions handler, with batch processing and
configurable CORS. The package also ships Pub/Sub sources for ingesting from
Pub/Sub topics.

[Documentation](https://www.walkeros.io/docs/sources/server/gcp) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-source-gcp) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/sources/gcp)

## Installation

```bash
npm install @walkeros/server-source-gcp @google-cloud/functions-framework
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "sources": {
        "gcp": {
          "package": "@walkeros/server-source-gcp",
          "import": "sourceCloudFunction",
          "config": {}
        }
      }
    }
  }
}
```

The package has no default export, so a step names the source with `"import"`
(`sourceCloudFunction`, `sourcePubSubPull` or `sourcePubSubPush`). This
quick-start bundle is for deploying to Cloud Functions: the walkerOS runtime
serves only sources with an HTTP handler, such as the Express source.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/server/gcp**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
