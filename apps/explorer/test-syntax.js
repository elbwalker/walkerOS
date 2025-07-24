// Quick test of the fixed syntax highlighter
const { highlightSyntax } = require('./dist/index.cjs');

const testCode = `function hello(name) {
  return \`Hello, \${name}!\`;
}`;

console.log('🧪 Testing fixed syntax highlighter...\n');

const result = highlightSyntax(testCode, { language: 'javascript' });

console.log('Input:');
console.log(testCode);
console.log('\nHighlighted output:');
console.log(result.highlighted);
console.log('\nLine count:', result.lineCount);

// Check for weird characters
const hasWeirdChars =
  /[<>;&]\w+[<>;]/.test(result.highlighted) &&
  !result.highlighted.includes('&lt;') &&
  !result.highlighted.includes('&gt;');
console.log('\n✅ Results:');
console.log('  Contains HTML spans:', result.highlighted.includes('<span'));
console.log(
  '  Properly escaped:',
  result.highlighted.includes('&lt;') ||
    result.highlighted.includes('&gt;') ||
    !result.highlighted.includes('<'),
);
console.log('  No weird characters:', !hasWeirdChars);
console.log('  Line count correct:', result.lineCount === 3);
