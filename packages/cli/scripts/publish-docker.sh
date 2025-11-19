#!/bin/bash
# Publish WalkerOS CLI Docker image to Docker Hub
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Publishing WalkerOS CLI Docker Image ===${NC}\n"

# Get version from package.json
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -p "require('${CLI_DIR}/package.json').version")

echo -e "${BLUE}CLI Version: ${VERSION}${NC}"
echo -e "${BLUE}Publishing to Docker Hub...${NC}\n"

# Configuration
IMAGE_NAME="walkeros/cli"
TAGS=("${VERSION}" "latest")

# Step 1: Build
echo -e "${BLUE}[1/4] Building Docker image...${NC}"
bash "${SCRIPT_DIR}/build-docker.sh"
echo ""

# Step 2: Test
echo -e "${BLUE}[2/4] Testing Docker image...${NC}"
bash "${SCRIPT_DIR}/test-docker.sh" "${IMAGE_NAME}" "latest"
echo ""

# Step 3: Tag
echo -e "${BLUE}[3/4] Tagging images...${NC}"
for TAG in "${TAGS[@]}"; do
  FULL_TAG="${IMAGE_NAME}:${TAG}"
  echo -e "${BLUE}Tagging as ${FULL_TAG}...${NC}"
  docker tag "${IMAGE_NAME}:latest" "${FULL_TAG}"
  echo -e "${GREEN}✓ Tagged ${FULL_TAG}${NC}"
done
echo ""

# Step 4: Push
echo -e "${BLUE}[4/4] Pushing to Docker Hub...${NC}"
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
