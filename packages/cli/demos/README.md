# WalkerOS CLI & Docker Demos

## Installation

These are demo configurations - see the main [CLI README](../README.md) for
installation.

## Usage

The two scripts in this folder, `quick-demo.sh` and `programmatic-example.js`,
fail today: they call a `simulate` and a `run` command (and the `simulate()` and
`run()` exports) that `@walkeros/cli` does not have, and `quick-demo.sh` builds
a Docker image from `packages/docker`, which does not exist. Use the commands
under [More Examples](#more-examples) instead.

---

This directory contains demonstrations of walkerOS CLI and Docker functionality.

## Quick Demo

`quick-demo.sh` is meant as an interactive demo of the complete workflow:

- Bundle generation
- Event simulation
- Docker image build
- Docker run
- CLI Docker orchestration
- Automatic cleanup

**Prerequisites**:

- Node.js 22.12 or later
- Docker installed and running
- Built packages (`npm run build` from monorepo root)

## Programmatic API Example

`programmatic-example.js` is meant to show the CLI used programmatically in
Node.js applications:

- Using the `bundle()` function
- Using the `simulate()` function
- Error handling
- Custom output paths
- Multiple event simulations

`@walkeros/cli` exports `bundle()`, `push()`, `simulateSource()`,
`simulateTransformer()`, `simulateDestination()` and `simulateCollector()`; it
has no `simulate()`.

## More Examples

### Bundle a Flow Config

```bash
# From monorepo root
node packages/cli/dist/cli.js bundle packages/cli/examples/flow-simple.json -o dist/
```

### Simulate an Event

```bash
node packages/cli/dist/cli.js push packages/cli/examples/flow-simple.json \
    --event '{"name":"page view","data":{"title":"Home","path":"/"}}' \
    --simulate destination.demo
```

### Run in Docker

The CLI builds flows; it does not run them. Run a built server flow with
`runneros` or the `walkeros/flow` image, see the
[runtime docs](https://www.walkeros.io/docs/apps/runtime).

## Documentation

- [CLI Documentation](../README.md)

## Support

For issues or questions:

- GitHub Issues: https://github.com/elbwalker/walkerOS/issues
- Documentation: https://github.com/elbwalker/walkerOS#readme
