# @elbwalker/destination-node-bigquery

## 2.1.2

### Patch Changes

- Updated dependencies [2d15fef]
- Updated dependencies [e2b8243]
- Updated dependencies [366ef4c]
- Updated dependencies [0bbd470]
- Updated dependencies [28adeb8]
  - @elbwalker/source-node@3.2.0
  - @elbwalker/utils@3.6.0

## 2.1.1

### Patch Changes

- Updated dependencies [5c33b75]
- Updated dependencies [d3735ad]
  - @elbwalker/utils@3.5.1
  - @elbwalker/client-node@3.1.1

## 2.1.0

### Minor Changes

- 4fd313e: Harmonise push interfaces
  [#430](https://github.com/elbwalker/walkerOS/issues/430)

### Patch Changes

- 3053fd6: Events generator
  [#438](https://github.com/elbwalker/walkerOS/issues/438)
- Updated dependencies [51e9841]
- Updated dependencies [4fd313e]
- Updated dependencies [c898b11]
- Updated dependencies [eef2132]
- Updated dependencies [3053fd6]
- Updated dependencies [eef2132]
- Updated dependencies [5a2c0b0]
- Updated dependencies [934c5a7]
- Updated dependencies [c4ed35f]
- Updated dependencies [5d093a3]
- Updated dependencies [9fbf78a]
  - @elbwalker/utils@3.5.0
  - @elbwalker/client-node@3.1.0

## 2.0.1

### Patch Changes

- @elbwalker/client-node@3.0.3

## 2.0.0

### Major Changes

- e8da7e2: BigQuery Schema update for user
  [#411](https://github.com/elbwalker/walkerOS/issues/411)

  To migrate old data vom v1 schema:

  1. Create a table with the new schema as written in the setup.
  2. Start streaming into the new table
  3. Copy existing events from `OLD_table` into the `NEW_table` with the
     following query:

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

## 1.1.2

### Patch Changes

- @elbwalker/client-node@3.0.2

## 1.1.1

### Patch Changes

- @elbwalker/client-node@3.0.1

## 1.1.0

### Minor Changes

- 7c27f86: v3

## 1.0.3

### Patch Changes

- @elbwalker/client-node@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies [da698d9]
  - @elbwalker/client-node@1.0.2

## 1.0.1

### Patch Changes

- @elbwalker/client-node@1.0.1

## 1.0.0

### Major Changes

- walkerOS
