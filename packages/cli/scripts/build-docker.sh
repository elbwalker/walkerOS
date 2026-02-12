#!/bin/bash
# Build WalkerOS CLI Docker image
set -e

cd "$(dirname "$0")/.."

echo "Building walkeros/cli Docker image..."
docker build -t walkeros/cli:latest -f Dockerfile.cli .

echo ""
echo "Done!"
docker images walkeros/cli:latest
