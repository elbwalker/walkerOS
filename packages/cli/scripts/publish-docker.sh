#!/bin/bash
# Publish WalkerOS Docker images (walkeros/cli + walkeros/flow) to Docker Hub
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Publishing WalkerOS Docker Images ===${NC}\n"

# Get version from package.json
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -p "require('${CLI_DIR}/package.json').version")

# Detect pre-release: versions with a hyphen (e.g. 1.4.0-next.0)
if echo "$VERSION" | grep -q '-'; then
  FLOAT_TAG="next"
else
  FLOAT_TAG="latest"
fi

echo -e "${BLUE}CLI Version: ${VERSION}${NC}"
echo -e "${BLUE}Float tag:   ${FLOAT_TAG}${NC}\n"

# Step 1: Build both images
echo -e "${BLUE}[1/4] Building Docker images...${NC}"
bash "${SCRIPT_DIR}/build-docker.sh"
bash "${SCRIPT_DIR}/build-flow.sh"
echo ""

# Step 2: Test CLI image
echo -e "${BLUE}[2/4] Testing CLI Docker image...${NC}"
bash "${SCRIPT_DIR}/test-docker.sh" "walkeros/cli" "${VERSION}"
echo ""

# Step 3: Tag
echo -e "${BLUE}[3/4] Tagging images...${NC}"
IMAGES=("walkeros/cli" "walkeros/flow")
TAGS=("${VERSION}" "${FLOAT_TAG}")

for IMAGE in "${IMAGES[@]}"; do
  for TAG in "${TAGS[@]}"; do
    FULL_TAG="${IMAGE}:${TAG}"
    echo -e "${BLUE}Tagging ${FULL_TAG}...${NC}"
    docker tag "${IMAGE}:${VERSION}" "${FULL_TAG}"
    echo -e "${GREEN}✓ Tagged ${FULL_TAG}${NC}"
  done
done
echo ""

# Step 4: Push
echo -e "${BLUE}[4/4] Pushing to Docker Hub...${NC}"
echo -e "${YELLOW}Note: Make sure you're logged in with 'docker login'${NC}\n"

for IMAGE in "${IMAGES[@]}"; do
  for TAG in "${TAGS[@]}"; do
    FULL_TAG="${IMAGE}:${TAG}"
    echo -e "${BLUE}Pushing ${FULL_TAG}...${NC}"

    if docker push "${FULL_TAG}"; then
      echo -e "${GREEN}✓ Pushed ${FULL_TAG}${NC}\n"
    else
      echo -e "${RED}✗ Failed to push ${FULL_TAG}${NC}"
      echo -e "${RED}Make sure you're logged in to Docker Hub${NC}"
      exit 1
    fi
  done
done

# Success
echo -e "${GREEN}=== Publish Complete! ===${NC}"
echo -e "${GREEN}Published images:${NC}"
for IMAGE in "${IMAGES[@]}"; do
  for TAG in "${TAGS[@]}"; do
    echo -e "  ${IMAGE}:${TAG}"
  done
done
echo ""
echo -e "${BLUE}View on Docker Hub:${NC}"
echo -e "  https://hub.docker.com/r/walkeros/cli"
echo -e "  https://hub.docker.com/r/walkeros/flow"
