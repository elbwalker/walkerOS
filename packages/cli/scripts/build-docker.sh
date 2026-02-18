#!/bin/bash
# Build walkeros/cli Docker image
set -e

cd "$(dirname "$0")/.."

CLI_VERSION=$(node -p "require('./package.json').version")

echo "Building walkeros/cli:${CLI_VERSION} Docker image..."
docker build -t "walkeros/cli:${CLI_VERSION}" \
  --build-arg "CLI_VERSION=${CLI_VERSION}" \
  -f Dockerfile.cli .

echo ""
echo "Done!"
docker images "walkeros/cli:${CLI_VERSION}"
