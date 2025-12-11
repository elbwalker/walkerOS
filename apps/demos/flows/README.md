# Browser to BigQuery Demo

Complete event pipeline: Browser → Server → BigQuery

## Setup

1. Add credentials:

   ```bash
   cp ~/sa-bigquery.json shared/credentials/sa-bigquery.json
   ```

2. Bundle flows:

   ```bash
   walkeros bundle browser-to-bigquery.json --flow server
   walkeros bundle browser-to-bigquery.json --flow web
   ```

3. Run server (Terminal 1):

   ```bash
   walkeros run collect dist/bundle.mjs --port 8080
   ```

4. Serve web (Terminal 2):

   ```bash
   npx serve . -p 3000
   ```

5. Open http://localhost:3000 and click buttons

## Verify in BigQuery

```sql
SELECT * FROM walkerOS.events ORDER BY timestamp DESC LIMIT 10
```
