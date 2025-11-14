# WalkerOS CLI & Docker Demos

This directory contains practical demonstrations of walkerOS CLI and Docker
functionality.

## Quick Demo

**5-minute interactive demo** showing the complete workflow:

```bash
./quick-demo.sh
```

This demonstrates:

- Bundle generation
- Event simulation
- Docker image build
- Docker collect mode
- CLI Docker orchestration
- Automatic cleanup

**Prerequisites**:

- Node.js 18+ or 22+
- Docker installed and running
- Built packages (`npm run build` from monorepo root)

## Programmatic API Example

Shows how to use the CLI programmatically in Node.js applications:

```bash
# Run the example
node programmatic-example.js
```

This demonstrates:

- Using the `bundle()` function
- Using the `simulate()` function
- Error handling
- Custom output paths
- Multiple event simulations

## More Examples

### Bundle a Flow Config

```bash
# From monorepo root
node packages/cli/dist/index.js bundle packages/docker/flows/demo.json
```

### Simulate an Event

```bash
# First create a bundle
node packages/cli/dist/index.js bundle packages/docker/flows/demo.json

# Then simulate
node packages/cli/dist/index.js simulate walker-bundle.js \
    '{"name":"page view","data":{"title":"Home","path":"/"}}'
```

### Run in Docker (Collect Mode)

```bash
# Build Docker image first
docker build -f packages/docker/Dockerfile -t walkeros-local .

# Run via CLI
node packages/cli/dist/index.js run collect packages/docker/flows/demo.json \
    --port 3000 \
    --image walkeros-local \
    --no-pull
```

### Run in Docker (Serve Mode)

```bash
# Create a static bundle
node packages/cli/dist/index.js bundle packages/docker/flows/demo.json \
    --output static-walker.js

# Serve it
node packages/cli/dist/index.js run serve static-walker.js \
    --port 8080 \
    --image walkeros-local \
    --no-pull
```

## Testing

For comprehensive testing instructions, see:

- [Manual Testing Guide](../docs/MANUAL_TESTING_GUIDE.md)

## Documentation

For detailed documentation:

- [CLI Documentation](../README.md)
- [Run Command Guide](../docs/RUN_COMMAND.md)
- [Publishing Guide](../docs/PUBLISHING.md)
- [Docker Build Strategy](../../docker/docs/BUILD_STRATEGY.md)

## Support

For issues or questions:

- GitHub Issues: https://github.com/elbwalker/walkerOS/issues
- Documentation: https://github.com/elbwalker/walkerOS#readme
