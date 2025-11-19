#!/bin/bash
# Publish walkerOS Runtime Docker image to Docker Hub
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Publishing walkerOS Runtime Docker Image ===${NC}\n"

# Get version from package.json
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -p "require('${DOCKER_DIR}/package.json').version")

echo -e "${BLUE}Runtime Version: ${VERSION}${NC}"
echo -e "${BLUE}Publishing to Docker Hub...${NC}\n"

# Configuration
IMAGE_NAME="walkeros/docker"
TAGS=("${VERSION}" "latest")

# Step 1: Build and Test
echo -e "${BLUE}[1/3] Building and testing Docker image...${NC}"
bash "${SCRIPT_DIR}/build-and-test.sh"
echo ""

# Step 2: Tag
echo -e "${BLUE}[2/3] Tagging images...${NC}"
# The build-and-test script builds as walkeros-test:local, so we need to tag it
docker tag walkeros-test:local "${IMAGE_NAME}:latest"

for TAG in "${TAGS[@]}"; do
  FULL_TAG="${IMAGE_NAME}:${TAG}"
  echo -e "${BLUE}Tagging as ${FULL_TAG}...${NC}"
  docker tag "${IMAGE_NAME}:latest" "${FULL_TAG}"
  echo -e "${GREEN}✓ Tagged ${FULL_TAG}${NC}"
done
echo ""

# Step 3: Push
echo -e "${BLUE}[3/3] Pushing to Docker Hub...${NC}"
echo -e "${YELLOW}Note: Make sure you're logged in with 'docker login'${NC}\n"

for TAG in "${TAGS[@]}"; do
  FULL_TAG="${IMAGE_NAME}:${TAG}"
  echo -e "${BLUE}Pushing ${FULL_TAG}...${NC}"

  if docker push "${FULL_TAG}"; then
    echo -e "${GREEN}✓ Pushed ${FULL_TAG}${NC}\n"
  else
    echo -e "${RED}✗ Failed to push ${FULL_TAG}${NC}"
    echo -e "${RED}Make sure you're logged in to Docker Hub${NC}"
    exit 1
  fi
done

# Success
echo -e "${GREEN}=== Publish Complete! ===${NC}"
echo -e "${GREEN}Published images:${NC}"
for TAG in "${TAGS[@]}"; do
  echo -e "  ${IMAGE_NAME}:${TAG}"
done
echo ""
echo -e "${BLUE}View on Docker Hub: https://hub.docker.com/r/${IMAGE_NAME}${NC}"
