#!/bin/bash
# Build and test walkerOS Docker image
set -e

# Colors for output
GREEN='\033[0.32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== walkerOS Docker Build & Test ===${NC}\n"

# Configuration
IMAGE_NAME="walkeros-test"
IMAGE_TAG="local"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

# Navigate to monorepo root
cd "$(dirname "$0")/../../.."
PROJECT_ROOT=$(pwd)

echo -e "${BLUE}Project root: ${PROJECT_ROOT}${NC}\n"

# Clean up any existing test containers
echo -e "${BLUE}Cleaning up existing containers...${NC}"
docker ps -q --filter "ancestor=${IMAGE_NAME}:${IMAGE_TAG}" | xargs -r docker stop > /dev/null 2>&1 || true
docker ps -q --filter "ancestor=${FULL_IMAGE}" | xargs -r docker stop > /dev/null 2>&1 || true
echo ""

# Step 1: Build Docker image
echo -e "${BLUE}[1/4] Building Docker image...${NC}"
docker build \
  -f packages/docker/Dockerfile \
  -t "${FULL_IMAGE}" \
  .

echo -e "${GREEN}✓ Docker image built: ${FULL_IMAGE}${NC}\n"

# Step 2: Test Bundle Mode
echo -e "${BLUE}[2/4] Testing Bundle Mode...${NC}"

# Create temporary directory for bundle output
TEST_DIR=$(mktemp -d)
trap "rm -rf ${TEST_DIR}" EXIT

docker run --rm \
  -e MODE=bundle \
  -e FLOW=/app/flows/bundle-web.json \
  -v "${TEST_DIR}:/app/dist" \
  -e GA4_MEASUREMENT_ID="G-TEST123" \
  "${FULL_IMAGE}"

# Verify bundle was created
if [ -f "${TEST_DIR}/walker.js" ]; then
  BUNDLE_SIZE=$(stat -f%z "${TEST_DIR}/walker.js" 2>/dev/null || stat -c%s "${TEST_DIR}/walker.js")
  echo -e "${GREEN}✓ Bundle mode: walker.js created (${BUNDLE_SIZE} bytes)${NC}\n"
else
  echo -e "${RED}✗ Bundle mode: Failed to create walker.js${NC}"
  exit 1
fi

# Step 3: Test Serve Mode
echo -e "${BLUE}[3/4] Testing Serve Mode...${NC}"

# Start serve mode container (no FLOW needed)
SERVE_CONTAINER=$(docker run -d \
  -e MODE=serve \
  -v "${TEST_DIR}:/app/dist:ro" \
  -p 8081:8080 \
  "${FULL_IMAGE}")

# Wait for server to start
sleep 3

# Test health endpoint
if curl -sf http://localhost:8081/health > /dev/null; then
  echo -e "${GREEN}✓ Serve mode: Health check passed${NC}"
else
  echo -e "${RED}✗ Serve mode: Health check failed${NC}"
  docker logs "${SERVE_CONTAINER}"
  docker stop "${SERVE_CONTAINER}"
  exit 1
fi

# Test static file serving
if curl -sf http://localhost:8081/walker.js | head -c 100 > /dev/null; then
  echo -e "${GREEN}✓ Serve mode: Static file serving works${NC}\n"
else
  echo -e "${RED}✗ Serve mode: Failed to serve walker.js${NC}"
  docker logs "${SERVE_CONTAINER}"
  docker stop "${SERVE_CONTAINER}"
  exit 1
fi

# Stop serve container
docker stop "${SERVE_CONTAINER}" > /dev/null
echo ""

# Wait a moment for port to be released
sleep 1

# Step 4: Test Collect Mode
echo -e "${BLUE}[4/4] Testing Collect Mode...${NC}"

# Start collect mode container (using built-in flow)
if ! COLLECT_CONTAINER=$(docker run -d \
  -e MODE=collect \
  -e FLOW=/app/flows/collect-console.json \
  -p 8080:8080 \
  "${FULL_IMAGE}" 2>&1); then
  echo -e "${RED}✗ Failed to start collect mode container${NC}"
  echo -e "${RED}Port 8080 may be in use. Check with: lsof -i :8080 or docker ps${NC}"
  exit 1
fi

# Wait for server to start
sleep 3

# Test health endpoint
if curl -sf http://localhost:8080/health > /dev/null; then
  echo -e "${GREEN}✓ Collect mode: Health check passed${NC}"
else
  echo -e "${RED}✗ Collect mode: Health check failed${NC}"
  docker logs "${COLLECT_CONTAINER}"
  docker stop "${COLLECT_CONTAINER}"
  exit 1
fi

# Test readiness endpoint
if curl -sf http://localhost:8080/ready > /dev/null; then
  echo -e "${GREEN}✓ Collect mode: Readiness check passed${NC}"
else
  echo -e "${RED}✗ Collect mode: Readiness check failed${NC}"
  docker logs "${COLLECT_CONTAINER}"
  docker stop "${COLLECT_CONTAINER}"
  exit 1
fi

# Test event collection
EVENT='{"name":"page view","data":{"title":"Test"}}'
if curl -sf -X POST \
  -H "Content-Type: application/json" \
  -d "${EVENT}" \
  http://localhost:8080/collect > /dev/null; then
  echo -e "${GREEN}✓ Collect mode: Event collection works${NC}\n"
else
  echo -e "${RED}✗ Collect mode: Event collection failed${NC}"
  docker logs "${COLLECT_CONTAINER}"
  docker stop "${COLLECT_CONTAINER}"
  exit 1
fi

# Stop collect container
docker stop "${COLLECT_CONTAINER}" > /dev/null

# Success
echo -e "${GREEN}=== All Tests Passed! ===${NC}"
echo -e "${GREEN}Docker image ${FULL_IMAGE} is ready to use.${NC}\n"

# Show image info
echo -e "${BLUE}Image Details:${NC}"
docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
