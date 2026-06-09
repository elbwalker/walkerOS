---
'@walkeros/server-destination-gcp': patch
---

The BigQuery destination now creates the `timing` column as `FLOAT64` instead of
`INT64`. Event timing carries sub-second decimal precision, which was previously
truncated to whole numbers on write. Existing tables keep their column type;
alter it to `FLOAT64` to preserve precision going forward.
