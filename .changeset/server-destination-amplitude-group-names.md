---
'@walkeros/server-destination-amplitude': patch
---

A group name list that holds a non-string is skipped with a DEBUG line naming
the call and the mapping key instead of being sent to Amplitude, so malformed
group data is never delivered.
