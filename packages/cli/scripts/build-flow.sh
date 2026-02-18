#!/bin/bash
# Build walkeros/flow Docker image (runtime runner)
set -e

cd "$(dirname "$0")/.."

CLI_VERSION=$(node -p "require('./package.json').version")

echo "Building walkeros/flow:${CLI_VERSION} Docker image..."
docker build -t "walkeros/flow:${CLI_VERSION}" \
  --build-arg "CLI_VERSION=${CLI_VERSION}" \
  -f Dockerfile .

echo ""
echo "Done!"
docker images "walkeros/flow:${CLI_VERSION}"
