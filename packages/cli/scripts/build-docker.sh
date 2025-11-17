#!/bin/bash
# Build WalkerOS CLI Docker image
set -e

cd "$(dirname "$0")/.."

echo "📦 Building WalkerOS CLI..."
npm run build

echo ""
echo "🐳 Building Docker image..."
docker build -t walkeros/cli:latest -f docker/Dockerfile .

echo ""
echo "✅ Docker image built successfully!"
echo ""
docker images walkeros/cli:latest
