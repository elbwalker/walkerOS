/**
 * Jest transformer for ?raw imports
 *
 * Reads the file content and exports it as a string,
 * matching the behavior of Vite's ?raw suffix.
 */
const fs = require('fs');
const path = require('path');

module.exports = {
  process(sourceText, sourcePath) {
    // Remove ?raw suffix if present in the path
    const actualPath = sourcePath.replace(/\?raw$/, '');

    // Read the actual file content
    let content;
    try {
      content = fs.readFileSync(actualPath, 'utf-8');
    } catch (error) {
      // If file doesn't exist, return empty string
      console.warn(`Warning: Could not read file for ?raw import: ${actualPath}`);
      content = '';
    }

    // Export as a string (CJS format for Jest)
    return {
      code: `module.exports = ${JSON.stringify(content)};`,
    };
  },
};
