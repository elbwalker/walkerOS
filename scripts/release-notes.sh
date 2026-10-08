#!/usr/bin/env bash
# Release notes for one stable version commit, built from the changesets that
# commit consumed. Usage: scripts/release-notes.sh <version-commit>
set -euo pipefail
commit="${1:?usage: release-notes.sh <version-commit>}"
files=$(git diff --name-only --diff-filter=D "$commit~1" "$commit" -- '.changeset/*.md' | grep -v 'README.md' || true)
if [ -z "$files" ]; then
  echo "::error::$commit consumed no changesets; refusing empty release notes." >&2
  exit 1
fi
changes=""
packages=""
for f in $files; do
  body=$(git show "$commit~1:$f")
  changes+="$(printf '%s\n' "$body" | sed '/^---$/,/^---$/d' | sed '/^$/d')"$'\n\n'
  # Frontmatter names packages in single or double quotes ('@walkeros/core': or "@walkeros/core":).
  packages+="$(printf '%s\n' "$body" | sed -n '/^---$/,/^---$/p' | grep -oE "[\"']@?walkeros[^\"']*[\"']" | tr -d "\"'" || true)"$'\n'
done
packages=$(printf '%s' "$packages" | sed '/^$/d' | sort -u)
if [ -z "$packages" ]; then
  echo "::error::the changesets of $commit name no package; refusing release notes without packages." >&2
  exit 1
fi
printf '## Changes\n\n%s\n## Published Packages\n\n' "$changes"
printf '%s\n' "$packages" | while read -r pkg; do
  printf -- '- [%s](https://www.npmjs.com/package/%s)\n' "$pkg" "$pkg"
done
