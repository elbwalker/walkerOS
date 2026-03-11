/**
 * Jest transformer for @walkeros/core/types virtual module
 *
 * Resolves the virtual module to the actual @walkeros/core types file
 * and exports its content as a string, matching the build-time behavior.
 */
const fs = require('fs');

module.exports = {
  process() {
    // Resolve the path to @walkeros/core types file
    const typesPath = require.resolve('@walkeros/core/dist/index.d.ts');

    // Read the actual file content
    let content;
    try {
      content = fs.readFileSync(typesPath, 'utf-8');
    } catch (error) {
      console.warn(`Warning: Could not read @walkeros/core types: ${error.message}`);
      content = '';
    }

    // Export as a string (CJS format for Jest)
    return {
      code: `module.exports = ${JSON.stringify(content)};`,
    };
  },
};
