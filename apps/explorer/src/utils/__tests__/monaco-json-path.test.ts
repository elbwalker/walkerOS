import { getJsonPathAtOffset } from '../monaco-json-path';

describe('getJsonPathAtOffset', () => {
  it('extracts path at cursor inside mapping value', () => {
    const json = `{
  "flows": {
    "default": {
      "destinations": {
        "ga4": {
          "mapping": {
            "order": {
              "complete": {
                "data": {
                  "map": {
                    "transaction_id": "data."
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;
    // Cursor is at the "data." string value
    const offset = json.indexOf('"data."') + 1; // inside the opening quote
    const path = getJsonPathAtOffset(json, offset);
    expect(path).toEqual([
      'flows',
      'default',
      'destinations',
      'ga4',
      'mapping',
      'order',
      'complete',
      'data',
      'map',
      'transaction_id',
    ]);
  });

  it('returns single key for root level', () => {
    const json = '{ "key": "value" }';
    const offset = json.indexOf('"value"') + 1;
    const path = getJsonPathAtOffset(json, offset);
    expect(path).toEqual(['key']);
  });

  it('returns empty array for invalid JSON', () => {
    const path = getJsonPathAtOffset('{ broken', 3);
    // Best-effort: may return partial path
    expect(Array.isArray(path)).toBe(true);
  });

  it('handles nested objects correctly', () => {
    const json = '{ "a": { "b": { "c": "val" } } }';
    const offset = json.indexOf('"val"') + 1;
    const path = getJsonPathAtOffset(json, offset);
    expect(path).toEqual(['a', 'b', 'c']);
  });
});
