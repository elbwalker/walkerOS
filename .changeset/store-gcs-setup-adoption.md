---
'@walkeros/server-store-gcs': patch
---

Add `setup()` lifecycle. Operators can now run `walkeros setup store.<id>` to
create the GCS bucket idempotently with sensible defaults (location EU, STANDARD
storage class, uniform bucket-level access, public access prevention enforced).
Detects drift on subsequent runs without mutating the bucket. Adds a hard-fail
with actionable message at runtime when the bucket does not exist.
