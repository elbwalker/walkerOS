/**
 * Extract the JSON key path at a given character offset in a JSON string.
 *
 * Uses a simple stack-based parser that tracks object keys as we scan
 * from the start to the offset position.
 *
 * @param json - The full JSON string
 * @param offset - Character offset (0-based) of cursor position
 * @returns Array of key segments from root to cursor
 */
export function getJsonPathAtOffset(json: string, offset: number): string[] {
  const path: string[] = [];
  let i = 0;
  let currentKey: string | undefined;
  let inString = false;
  let stringStart = -1;
  let escaped = false;

  while (i < json.length && i <= offset) {
    const ch = json[i];

    if (escaped) {
      escaped = false;
      i++;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      i++;
      continue;
    }

    if (ch === '"') {
      if (inString) {
        // End of string
        const str = json.substring(stringStart, i);
        inString = false;

        // Determine if this string is a key or value by looking ahead for ':'
        let j = i + 1;
        while (j < json.length && /\s/.test(json[j])) j++;
        if (json[j] === ':') {
          currentKey = str;
        }
      } else {
        // Start of string
        inString = true;
        stringStart = i + 1;
      }
    } else if (!inString) {
      if (ch === '{') {
        if (currentKey !== undefined) {
          path.push(currentKey);
          currentKey = undefined;
        }
      } else if (ch === '}') {
        path.pop();
      }
    }

    i++;
  }

  // Add the current key if we're at a value position
  if (currentKey !== undefined) {
    path.push(currentKey);
  }

  return path;
}
