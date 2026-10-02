#!/bin/sh
# Boot an image and assert the @walkeros/* version it reports.
# Usage: images/smoke.sh <flow|cli> <image-ref> <expected-package-version>
#
# flow: starts the runtime on images/smoke/flow.mjs, waits for /ready, then
#       reads `runneros --version` from the running container.
# cli:  bundles images/smoke/flow.json, then reads `walkeros --version`.
set -eu

IMAGE="$1"
REF="$2"
EXPECTED="$3"
SMOKE_DIR="$(cd "$(dirname "$0")/smoke" && pwd)"

case "$IMAGE" in
  flow)
    NAME="smoke-flow-$$"
    PORT=18080
    docker run -d --name "$NAME" -p "127.0.0.1:${PORT}:8080" \
      -v "${SMOKE_DIR}:/app/flow:ro" "$REF" >/dev/null
    trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
    CODE=000
    for _ in $(seq 1 60); do
      CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/ready" || true)"
      [ "$CODE" = "200" ] && break
      sleep 0.5
    done
    if [ "$CODE" != "200" ]; then
      echo "::error::${REF} did not become ready (last /ready: ${CODE})"
      docker logs "$NAME" 2>&1 | tail -40
      exit 1
    fi
    REPORTED="$(docker exec "$NAME" runneros --version)"
    ;;
  cli)
    docker run --rm -v "${SMOKE_DIR}:/smoke:ro" "$REF" \
      bundle /smoke/flow.json --silent --output /tmp/flow.mjs
    REPORTED="$(docker run --rm "$REF" --version)"
    ;;
  *)
    echo "::error::unknown image '${IMAGE}'"
    exit 1
    ;;
esac

if [ "$REPORTED" != "$EXPECTED" ]; then
  echo "::error::${REF} reports ${REPORTED}, expected ${EXPECTED}"
  exit 1
fi
echo "OK: ${REF} reports ${REPORTED}"
