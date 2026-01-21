#!/bin/bash
# WalkerOS CLI & Docker Quick Demo
# Demonstrates the complete workflow in 5 minutes

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WalkerOS CLI & Docker Quick Demo    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ or 22+"
    exit 1
fi
echo "✓ Node.js $(node --version)"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker"
    exit 1
fi
echo "✓ Docker $(docker --version | head -1)"

if ! docker ps &> /dev/null; then
    echo "❌ Docker daemon not running. Please start Docker"
    exit 1
fi
echo "✓ Docker daemon running"

echo ""

# Setup
DEMO_DIR="/tmp/walkeros-demo-$$"
MONO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

echo -e "${YELLOW}Setting up demo environment...${NC}"
mkdir -p "$DEMO_DIR"
cd "$DEMO_DIR"

# Create sample flow
cat > flow.json <<'EOF'
{
  "flow": {
    "platform": "server",
    "sources": [
      {
        "name": "sourceExpress"
      }
    ],
    "destinations": [
      {
        "name": "destinationConsole"
      }
    ]
  },
  "build": {
    "packages": {},
    "code": "",
    "output": ""
  }
}
EOF

echo "✓ Demo environment created at $DEMO_DIR"
echo ""

# Demo 1: Bundle
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Demo 1: Bundle Generation${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Creating a walkerOS bundle from flow configuration..."
echo ""

node "$MONO_ROOT/packages/cli/dist/index.js" bundle flow.json --output walker.js

if [ -f walker.js ]; then
    BUNDLE_SIZE=$(wc -c < walker.js)
    echo ""
    echo -e "${GREEN}✓ Bundle created: walker.js (${BUNDLE_SIZE} bytes)${NC}"
else
    echo "❌ Bundle creation failed"
    exit 1
fi
echo ""
read -p "Press Enter to continue to Demo 2..."
echo ""

# Demo 2: Simulate
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Demo 2: Event Simulation${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Simulating a page view event..."
echo ""

node "$MONO_ROOT/packages/cli/dist/index.js" simulate walker.js \
    '{"name":"page view","data":{"title":"Demo Page","path":"/demo"}}'

echo ""
echo -e "${GREEN}✓ Event simulation complete${NC}"
echo ""
read -p "Press Enter to continue to Demo 3..."
echo ""

# Demo 3: Docker Build
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Demo 3: Docker Image Build${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Building walkerOS Docker image..."
echo "(This may take 2-4 minutes on first build)"
echo ""

cd "$MONO_ROOT"
docker build -f packages/docker/Dockerfile -t walkeros-demo:latest . --quiet

IMAGE_SIZE=$(docker images walkeros-demo:latest --format "{{.Size}}")
echo ""
echo -e "${GREEN}✓ Docker image built: walkeros-demo:latest (${IMAGE_SIZE})${NC}"
echo ""
cd "$DEMO_DIR"
read -p "Press Enter to continue to Demo 4..."
echo ""

# Demo 4: Docker Collect Mode
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Demo 4: Docker Collect Mode${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Starting walkerOS in collect mode..."
echo ""

docker run -d \
    --name walkeros-demo-collect \
    -e MODE=collect \
    -e FLOW=/app/flows/demo.json \
    -e PORT=8080 \
    -p 13000:8080 \
    walkeros-demo:latest > /dev/null

echo "Waiting for server to start..."
sleep 5

# Check health
if curl -s http://localhost:13000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server started and healthy${NC}"
    echo ""

    # Show health response
    echo "Health check response:"
    curl -s http://localhost:13000/health | jq . || curl -s http://localhost:13000/health
    echo ""
    echo ""

    # Send test event
    echo "Sending test event..."
    curl -X POST http://localhost:13000/collect \
        -H "Content-Type: application/json" \
        -d '{"name":"page view","data":{"title":"Demo Event","path":"/test"}}' \
        -s > /dev/null

    echo -e "${GREEN}✓ Event sent successfully${NC}"
    echo ""

    # Show container logs
    echo "Recent container logs:"
    echo "─────────────────────────────────────"
    docker logs --tail 10 walkeros-demo-collect
    echo "─────────────────────────────────────"
else
    echo "❌ Server health check failed"
    docker logs walkeros-demo-collect
fi

echo ""
read -p "Press Enter to continue to Demo 5..."
echo ""

# Demo 5: CLI Run Command
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Demo 5: CLI Docker Orchestration${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Using CLI to orchestrate Docker container..."
echo "(Starting on port 13001)"
echo ""

# Run in background for demo
node "$MONO_ROOT/packages/cli/dist/index.js" run collect "$DEMO_DIR/flow.json" \
    --port 13001 \
    --container-name walkeros-demo-cli \
    --image walkeros-demo:latest \
    --no-pull &

CLI_PID=$!

echo "Waiting for CLI to start container..."
sleep 5

# Test it
if curl -s http://localhost:13001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ CLI orchestration working${NC}"
    echo ""
    echo "Health check:"
    curl -s http://localhost:13001/health | jq . || curl -s http://localhost:13001/health
else
    echo "⚠ CLI orchestration may still be starting..."
fi

echo ""
echo "Stopping CLI process..."
kill $CLI_PID 2>/dev/null || true
wait $CLI_PID 2>/dev/null || true
sleep 2

# Verify cleanup
if ! docker ps | grep -q walkeros-demo-cli; then
    echo -e "${GREEN}✓ Container cleaned up automatically${NC}"
else
    echo "⚠ Container still running (manual cleanup needed)"
    docker stop walkeros-demo-cli 2>/dev/null || true
    docker rm walkeros-demo-cli 2>/dev/null || true
fi

echo ""
read -p "Press Enter to clean up and finish demo..."
echo ""

# Cleanup
echo -e "${YELLOW}Cleaning up demo resources...${NC}"

# Stop and remove containers
docker stop walkeros-demo-collect 2>/dev/null || true
docker rm walkeros-demo-collect 2>/dev/null || true
docker rm walkeros-demo-cli 2>/dev/null || true

# Remove demo directory
cd /tmp
rm -rf "$DEMO_DIR"

echo "✓ Cleanup complete"
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Demo Complete!                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo "What you just saw:"
echo "  ✓ Bundle generation from flow config"
echo "  ✓ Event simulation"
echo "  ✓ Docker image build"
echo "  ✓ Docker collect mode (direct)"
echo "  ✓ CLI Docker orchestration"
echo ""
echo "Next steps:"
echo "  1. Read the manual testing guide: packages/cli/docs/MANUAL_TESTING_GUIDE.md"
echo "  2. Explore flow configurations: packages/docker/flows/"
echo "  3. Review publishing guide: packages/cli/docs/PUBLISHING.md"
echo ""
echo "Optional cleanup:"
echo "  docker rmi walkeros-demo:latest"
echo ""
echo -e "${GREEN}Thank you for trying walkerOS!${NC}"
echo ""
