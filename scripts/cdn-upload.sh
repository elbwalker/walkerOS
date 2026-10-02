#!/usr/bin/env bash
# Upload a published @walkeros/walker.js version to static.walkeros.io.
# Usage: bash scripts/cdn-upload.sh <version> [--rollback]
# Env: BUNNY_STATIC_STORAGE_ZONE, BUNNY_STATIC_STORAGE_PASSWORD
#
# Writes objects from the published npm tarball into the Bunny storage zone
# behind https://static.walkeros.io/. Every stable version gets its immutable
# v<version>/walker.js. Only the newest stable version of its line also takes
# the moving v<major>.<minor>/walker.js slot, so a re-dispatch of an older
# version fills in its own copy but never downgrades the slot. --rollback
# skips that guard to put an older version back on purpose. A pinned copy is
# never overwritten. Cache headers come from the pull zone, not from the
# objects.
set -euo pipefail

VERSION="${1:?usage: cdn-upload.sh <version> [--rollback]}"
MODE="${2:-}"
PKG="@walkeros/walker.js"
PUBLIC="https://static.walkeros.io"
: "${BUNNY_STATIC_STORAGE_ZONE:?BUNNY_STATIC_STORAGE_ZONE is not set}"
: "${BUNNY_STATIC_STORAGE_PASSWORD:?BUNNY_STATIC_STORAGE_PASSWORD is not set}"
STORAGE="https://storage.bunnycdn.com/$BUNNY_STATIC_STORAGE_ZONE"

if [[ -n "$MODE" && "$MODE" != "--rollback" ]]; then
  echo "Unknown option: $MODE" >&2
  exit 1
fi
if ! [[ "$VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "Not a stable version: $VERSION" >&2
  exit 1
fi
LINE="v${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"
SLOT="${LINE}/walker.js"
PINNED="v${VERSION}/walker.js"

# The registry lists a new version, and serves its tarball, minutes after the
# publish: a release waits for both. A rollback names a version that is
# already there, so it does not wait.
ATTEMPTS=30
if [[ "$MODE" == "--rollback" ]]; then ATTEMPTS=1; fi

summary() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then printf '%s\n' "$@" >> "$GITHUB_STEP_SUMMARY"; fi
}

# The newest stable version of the line, printed only once the registry lists
# VERSION itself; until then nothing, so a lagging list never reads as "older".
newest_of_line() {
  npm view "$PKG" versions --json --prefer-online 2>/dev/null | node -e '
    const [line, version] = process.argv.slice(1);
    const all = [].concat(JSON.parse(require("fs").readFileSync(0, "utf8") || "[]"));
    if (!all.includes(version)) process.exit(0);
    const list = all
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v) && v.startsWith(line + "."))
      .sort((a, b) => Number(a.split(".")[2]) - Number(b.split(".")[2]));
    process.stdout.write(list.at(-1));
  ' "${LINE#v}" "$VERSION" || true
}

# 1. Every stable version gets its pinned copy; only the newest stable of its
#    line, or a rollback, also takes the moving slot.
NEWEST=""
for attempt in $(seq 1 "$ATTEMPTS"); do
  NEWEST="$(newest_of_line)"
  [[ -n "$NEWEST" ]] && break
  if [[ "$attempt" == "$ATTEMPTS" ]]; then
    echo "$PKG@$VERSION is not listed on npm" >&2
    exit 1
  fi
  sleep 15
done
KEYS=("$PINNED")
if [[ "$MODE" == "--rollback" || "$NEWEST" == "$VERSION" ]]; then
  KEYS+=("$SLOT")
else
  SLOT_NOTE="$VERSION is not the newest of $LINE (newest: $NEWEST); slot untouched."
  echo "$SLOT_NOTE"
fi

# 2. Bytes from the published tarball (npm verifies its integrity).
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
for attempt in $(seq 1 "$ATTEMPTS"); do
  if (cd "$WORK" && npm pack "$PKG@$VERSION" --silent >/dev/null 2>"$WORK/pack.err"); then break; fi
  if [[ "$attempt" == "$ATTEMPTS" ]]; then
    echo "Tarball for $PKG@$VERSION not available:" >&2
    cat "$WORK/pack.err" >&2
    exit 1
  fi
  sleep 15
done
tar -xzf "$WORK"/*.tgz -C "$WORK"
FILE="$WORK/package/dist/walker.js"
[[ -f "$FILE" ]] || { echo "$PKG@$VERSION has no dist/walker.js" >&2; exit 1; }

# 3. Sanity gate: a plausible size and the banner the build writes.
SIZE="$(wc -c < "$FILE")"
[[ "$SIZE" -gt 1000 && "$SIZE" -lt 300000 ]] || { echo "Unexpected size: $SIZE bytes" >&2; exit 1; }
TOP="$(head -c 200 "$FILE")"
[[ "$TOP" == *"/*! walker.js v${VERSION} | MIT | "* ]] || { echo "Banner does not name v$VERSION" >&2; exit 1; }

SHA="$(sha256sum "$FILE" | cut -d' ' -f1)"

# The password reaches curl as a mode-600 header file, never as an argument,
# so it shows up neither on a command line nor in ps.
HEADERS="$WORK/auth.headers"
(umask 077 && printf 'AccessKey: %s\n' "$BUNNY_STATIC_STORAGE_PASSWORD" > "$HEADERS")

# Reads a key from storage into $WORK/origin.js; prints the HTTP status.
fetch() {
  curl -s --retry 3 -H @"$HEADERS" -o "$WORK/origin.js" -w '%{http_code}' "$STORAGE/$1" || true
}

# sha256 of a key as storage holds it; empty when absent. Only a definite 404
# counts as absent: any other answer fails, so a storage hiccup never reads as
# "missing" and never lets a pinned copy be overwritten.
origin_sha() {
  local code
  code="$(fetch "$1")"
  case "$code" in
    200) sha256sum "$WORK/origin.js" | cut -d' ' -f1 ;;
    404) ;;
    *) echo "Reading $1 from storage failed (HTTP $code)" >&2; return 1 ;;
  esac
}

# Prints the HTTP status. Bunny checks the body against the Checksum header
# (sha256, uppercase hex); the read-back below is the real check either way.
put() {
  curl -s --retry 3 -X PUT -H @"$HEADERS" -H "Checksum: ${SHA^^}" \
    -H 'Content-Type: application/octet-stream' --data-binary @"$FILE" \
    -o /dev/null -w '%{http_code}' "$STORAGE/$1" || true
}

# 4. Upload (idempotent), then verify by reading back. The immutable copy goes
#    first, so the slot never names bytes that have no pinned twin.
for KEY in "${KEYS[@]}"; do
  CURRENT="$(origin_sha "$KEY")"
  if [[ "$CURRENT" == "$SHA" ]]; then
    echo "$KEY already current"
    continue
  fi
  if [[ "$KEY" == "$PINNED" && -n "$CURRENT" ]]; then
    echo "pinned v$VERSION differs; refusing to overwrite" >&2
    exit 1
  fi
  CODE="$(put "$KEY")"
  [[ "$CODE" == 2?? ]] || { echo "Upload of $KEY failed (HTTP $CODE)" >&2; exit 1; }
  STORED="$(origin_sha "$KEY")"
  if [[ "$STORED" != "$SHA" ]]; then
    echo "Verification failed for $KEY (storage holds sha256 ${STORED:-nothing})" >&2
    exit 1
  fi
  echo "Uploaded $KEY ($SIZE bytes, sha256 $SHA)"
done

# 5. One public read: a new pinned key is an edge cache miss, so a 200 proves
#    the pull zone serves from this storage zone.
CODE="$(curl -sI --retry 3 -o /dev/null -w '%{http_code}' "$PUBLIC/$PINNED" || true)"
[[ "$CODE" == 200 ]] || { echo "$PUBLIC/$PINNED answers HTTP $CODE, expected 200" >&2; exit 1; }

if [[ -n "${SLOT_NOTE:-}" ]]; then
  summary "### walker.js on static.walkeros.io" \
    "- $PUBLIC/$PINNED" \
    "- $SIZE bytes, sha256 \`$SHA\`" \
    "- $SLOT_NOTE"
else
  summary "### walker.js on static.walkeros.io" \
    "- $PUBLIC/$SLOT" \
    "- $PUBLIC/$PINNED" \
    "- $SIZE bytes, sha256 \`$SHA\`" \
    "- The edge may serve the previous copy of the slot for up to 3 hours, browsers for 20 minutes; purge the URL in Bunny for an instant flip."
fi
