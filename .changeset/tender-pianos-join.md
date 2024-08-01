---
'@elbwalker/destination-node-bigquery': major
---

BigQuery Schema update for user
[#411](https://github.com/elbwalker/walkerOS/issues/411)

To migrate old data vom v1 schema:

1. Create a table with the new schema as written in the setup.
2. Start streaming into the new table
3. Copy existing events from `OLD_table` into the `NEW_table` with the following
   query:

```sql
INSERT INTO `walkerOS.NEW_table` (timestamp, event, data, context, custom, globals, user, nested, consent, id, trigger, entity, action, timing, `group`, count, version, source, createdAt)
SELECT
  timestamp,
  event,
  CASE
    WHEN TO_JSON_STRING(data) = '{}' THEN NULL
    ELSE JSON_STRIP_NULLS(data)
  END AS data,
  CASE
    WHEN TO_JSON_STRING(context) = '{}' THEN NULL
    ELSE JSON_STRIP_NULLS(context)
  END AS context,
  CASE
    WHEN TO_JSON_STRING(custom) = '{}' THEN NULL
    ELSE JSON_STRIP_NULLS(custom)
  END AS custom,
  CASE
    WHEN TO_JSON_STRING(globals) = '{}' THEN NULL
    ELSE JSON_STRIP_NULLS(globals)
  END AS globals,
  JSON_STRIP_NULLS (TO_JSON (STRUCT (user.id, user.device, user.session))) AS user,
  CASE
    WHEN TO_JSON_STRING(nested) = '[]' THEN NULL
    ELSE JSON_STRIP_NULLS(nested)
  END AS nested,
  CASE
    WHEN TO_JSON_STRING(consent) = '{}' THEN NULL
    ELSE JSON_STRIP_NULLS(consent)
  END AS consent,
  id,
  trigger,
  entity,
  action,
  timing,
  `group`,
  count,
  JSON_STRIP_NULLS (TO_JSON (STRUCT (version.client, version.tagging))) AS version,
  JSON_STRIP_NULLS (TO_JSON (STRUCT (source.type, source.id, source.previous_id))) AS source,
  server_timestamp AS createdAt
FROM
  `walkerOS.OLD_table`
```
