# <Vendor> API reference

The vendor facts this destination relies on. Every fact names the vendor's own
reference, the date it was read and a short verbatim quote. Update this file
before changing the request the destination sends.

| Fact                                            | Value | Source (vendor URL) | Read on | Quote |
| ----------------------------------------------- | ----- | ------------------- | ------- | ----- |
| Version used                                    |       |                     |         |       |
| Current version, deprecation, sunset            |       |                     |         |       |
| Endpoint and auth                               |       |                     |         |       |
| Body: required fields                           |       |                     |         |       |
| Body: optional fields, list fields              |       |                     |         |       |
| Identity: hashed fields and normalization       |       |                     |         |       |
| Identity: fields sent in clear                  |       |                     |         |       |
| Deduplication key and window                    |       |                     |         |       |
| Limits (batch, rate, payload, time window)      |       |                     |         |       |
| Answers (status codes, rejections inside a 2xx) |       |                     |         |       |
| Test mode                                       |       |                     |         |       |

## Vendor examples

Example requests, responses and example hashes, copied verbatim from the
vendor's reference, each with its source URL. Step examples and hash tests use
these values.

## Test-mode checks

| Date | Request (what changed) | Vendor answer |
| ---- | ---------------------- | ------------- |
