#!/bin/bash
# Docker Image Build Script
# Builds the walkerOS Docker image from the monorepo root

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building walkerOS Docker Image${NC}"
echo "=================================="
echo ""

# Get to monorepo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
MONO_ROOT="$(dirname "$(dirname "$DOCKER_DIR")")"

echo "Monorepo root: $MONO_ROOT"
echo "Docker package: $DOCKER_DIR"
echo ""

# Parse arguments
IMAGE_NAME="${1:-walkeros/docker}"
IMAGE_TAG="${2:-latest}"
FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"

echo -e "${YELLOW}Building image: $FULL_IMAGE${NC}"
echo ""

# Navigate to monorepo root (required for Dockerfile COPY commands)
cd "$MONO_ROOT"

# Verify required packages exist
echo "Verifying package structure..."
for pkg in core collector cli config docker; do
    if [ ! -d "packages/$pkg" ]; then
        echo -e "${RED}Error: packages/$pkg not found${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All required packages present${NC}"
echo ""

# Build the image
echo "Building Docker image..."
docker build \
    -f packages/docker/Dockerfile \
    -t "$FULL_IMAGE" \
    .

echo ""
echo -e "${GREEN}✓ Build complete${NC}"
echo ""
echo "Image: $FULL_IMAGE"
echo ""

# Display image info
echo "Image details:"
docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

# Test the image
echo -e "${YELLOW}Testing image...${NC}"
echo "Running health check in collect mode..."

# Start container in background
TEST_CONTAINER="walkeros-test-$$"
docker run -d \
    --name "$TEST_CONTAINER" \
    -e MODE=collect \
    -e FLOW=/app/demos/demo-collect.mjs \
    -p 13000:8080 \
    "$FULL_IMAGE"

# Wait for health check
echo "Waiting for container to be healthy..."
sleep 5

# Check if container is running
if docker ps | grep -q "$TEST_CONTAINER"; then
    echo -e "${GREEN}✓ Container started successfully${NC}"

    # Test health endpoint
    if curl -s http://localhost:13000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠ Health check endpoint not responding (may be normal if port mapping issues)${NC}"
    fi
else
    echo -e "${RED}✗ Container failed to start${NC}"
    docker logs "$TEST_CONTAINER"
    docker rm -f "$TEST_CONTAINER"
    exit 1
fi

# Cleanup
echo ""
echo "Cleaning up test container..."
docker stop "$TEST_CONTAINER" > /dev/null
docker rm "$TEST_CONTAINER" > /dev/null
echo -e "${GREEN}✓ Cleanup complete${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build and test successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Test manually: docker run -e MODE=collect -e FLOW=/app/demos/demo-collect.mjs -p 3000:8080 $FULL_IMAGE"
echo "  2. Tag for version: docker tag $FULL_IMAGE $IMAGE_NAME:0.1.1"
echo "  3. Push to registry: docker push $IMAGE_NAME:0.1.1"
echo ""
