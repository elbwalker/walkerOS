---
'@walkeros/core': patch
'@walkeros/transformer-router': patch
---

Extract match logic (compileMatcher, MatchExpression, MatchCondition,
MatchOperator, CompiledMatcher) from router to core as shared utility. Router
now imports from core — no public API changes.
