#!/bin/bash

# Test collect mode
cd /workspaces/walkerOS/packages/docker

echo "Starting collect mode..."
MODE=collect CONFIG_FILE=configs/examples/collect-basic.json tsx src/index.ts &
WALKER_PID=$!

# Wait for server to start
sleep 4

echo -e "\n=== Testing health endpoint ==="
curl -s http://localhost:8080/health

echo -e "\n\n=== Testing event collection ==="
curl -s -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"page view","data":{"title":"Test Page","path":"/test"}}'

echo -e "\n\n=== Sending another event ==="
curl -s -X POST http://localhost:8080/collect \
  -H "Content-Type: application/json" \
  -d '{"name":"product add","data":{"id":"P123","name":"Laptop","price":999.99}}'

sleep 2

echo -e "\n\n=== Stopping server ==="
kill $WALKER_PID
wait $WALKER_PID 2>/dev/null

echo -e "\n✅ Test completed"
