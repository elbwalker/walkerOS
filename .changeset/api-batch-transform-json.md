---
'@walkeros/web-destination-api': patch
---

With a `transform` and `batch`, the web API destination now adds each
transformed JSON object or array body to the batch as its value instead of as an
escaped JSON string. Transformed bodies that are not JSON objects or arrays are
still sent as strings.
