#!/usr/bin/env bash
# Summarize turbo run summaries written by `--summarize` (in .turbo/runs/).
# Usage: bash scripts/turbo-report.sh [N]   # N = how many recent runs (default 5)
set -euo pipefail
N="${1:-5}"
DIR="$(git rev-parse --show-toplevel)/.turbo/runs"
[ -d "$DIR" ] || { echo "no .turbo/runs yet — run a verify:* script first"; exit 0; }

ls -t "$DIR"/*.json 2>/dev/null | head -n "$N" | python3 -c '
import json, sys, datetime as d
CONC = 4  # turbo.json concurrency; cold estimate divides saved time by this
print("%-14s %7s %5s %5s %8s  %s" % ("when", "wall", "tasks", "hit%", "cold_est", "command"))
for path in sys.stdin.read().split():
    x = json.load(open(path))
    e = x["execution"]
    wall = (e["endTime"] - e["startTime"]) / 1000
    att, cac = e["attempted"], e["cached"]
    saved = sum(t["cache"].get("timeSaved", 0) for t in x.get("tasks", [])) / 1000
    cold = saved / CONC
    when = d.datetime.utcfromtimestamp(e["startTime"] / 1000).strftime("%m-%d %H:%M")
    hit = (cac / att * 100) if att else 0
    print("%-14s %6.1fs %5d %4.0f%% %7.0fs  %s" % (when, wall, att, hit, cold, e["command"][:48]))
'
echo
echo "cold_est = summed cache.timeSaved / concurrency(4): estimated wall if nothing were cached."
