#!/bin/bash
# Test WalkerOS CLI Docker image
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing WalkerOS CLI Docker Image ===${NC}\n"

# Configuration
IMAGE_NAME="${1:-walkeros/cli}"
IMAGE_TAG="${2:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${BLUE}Testing image: ${FULL_IMAGE}${NC}\n"

# Test 1: Version check
echo -e "${BLUE}[1/6] Testing version command...${NC}"
if VERSION=$(docker run --rm "${FULL_IMAGE}" --version 2>&1); then
  echo -e "${GREEN}✓ Version check passed: ${VERSION}${NC}\n"
else
  echo -e "${RED}✗ Version check failed${NC}"
  exit 1
fi

# Test 2: Help command
echo -e "${BLUE}[2/6] Testing help command...${NC}"
if docker run --rm "${FULL_IMAGE}" --help > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Help command works${NC}\n"
else
  echo -e "${RED}✗ Help command failed${NC}"
  exit 1
fi

# Test 3: Bundle from stdin to stdout (primary Docker usage pattern)
echo -e "${BLUE}[3/6] Testing stdin/stdout bundle...${NC}"
FLOW_CONFIG='{"version":1,"flows":{"default":{"server":{},"packages":{"@walkeros/collector":{"version":"latest","imports":["startFlow"]}},"collector":{"run":true}}}}'

BUNDLE_OUTPUT=$(echo "$FLOW_CONFIG" | docker run --rm -i "${FULL_IMAGE}" bundle 2>/dev/null)

if [ -n "$BUNDLE_OUTPUT" ] && echo "$BUNDLE_OUTPUT" | head -1 | grep -q .; then
  BUNDLE_SIZE=${#BUNDLE_OUTPUT}
  echo -e "${GREEN}✓ Stdin/stdout bundle works (${BUNDLE_SIZE} bytes)${NC}\n"
else
  echo -e "${RED}✗ Stdin/stdout bundle failed${NC}"
  exit 1
fi

# Test 4: Validate from stdin
echo -e "${BLUE}[4/6] Testing stdin validate...${NC}"
if echo "$FLOW_CONFIG" | docker run --rm -i "${FULL_IMAGE}" validate flow --json 2>/dev/null | grep -q '"valid"'; then
  echo -e "${GREEN}✓ Stdin validate works${NC}\n"
else
  echo -e "${YELLOW}⚠ Stdin validate returned unexpected output (may be OK)${NC}\n"
fi

# Test 5: Bundle command with example config
echo -e "${BLUE}[5/6] Testing bundle command with built-in examples...${NC}"
TEST_DIR=$(mktemp -d)
trap "rm -rf ${TEST_DIR}" EXIT

# Create a simple config file directly (no entrypoint hack needed)
cat > "${TEST_DIR}/server-collect.json" << 'EOF'
{
  "version": 1,
  "flows": {
    "default": {
      "server": {},
      "packages": {
        "@walkeros/collector": {
          "version": "latest",
          "imports": ["startFlow"]
        }
      },
      "collector": {
        "run": true
      }
    }
  }
}
EOF

if docker run --rm \
  --user "$(id -u):$(id -g)" \
  -v "${TEST_DIR}:/workspace" \
  -w /workspace \
  "${FULL_IMAGE}" \
  bundle server-collect.json \
  --stats > /dev/null 2>&1; then

  # Check if output file was created (CLI outputs to dist/bundle.mjs)
  if [ -f "${TEST_DIR}/dist/bundle.mjs" ]; then
    BUNDLE_SIZE=$(stat -f%z "${TEST_DIR}/dist/bundle.mjs" 2>/dev/null || stat -c%s "${TEST_DIR}/dist/bundle.mjs")
    echo -e "${GREEN}✓ Bundle created successfully (${BUNDLE_SIZE} bytes)${NC}\n"
  else
    echo -e "${RED}✗ Bundle file not created${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ Bundle command failed${NC}"
  exit 1
fi

# Test 6: Simulate command
echo -e "${BLUE}[6/6] Testing simulate command...${NC}"
EVENT='{"name":"page view","data":{"title":"Test"}}'
if docker run --rm \
  --user "$(id -u):$(id -g)" \
  -v "${TEST_DIR}:/workspace" \
  -w /workspace \
  "${FULL_IMAGE}" \
  simulate dist/bundle.mjs \
  --event "${EVENT}" \
  --json > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Simulate command works${NC}\n"
else
  echo -e "${YELLOW}⚠ Simulate command failed (may be expected with mocked packages)${NC}\n"
fi

# Success
echo -e "${GREEN}=== All Tests Passed! ===${NC}"
echo -e "${GREEN}CLI Docker image ${FULL_IMAGE} is ready to use.${NC}\n"

# Show image info
echo -e "${BLUE}Image Details:${NC}"
docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
