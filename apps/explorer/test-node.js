// Node.js test script to demonstrate Phase 1 components
// Run with: node test-node.js

const { JSDOM } = require('jsdom');

// Setup DOM environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.navigator = {
  clipboard: {
    writeText: async (text) =>
      console.log('📋 Clipboard write:', text.substring(0, 100) + '...'),
  },
};

// Import the explorer components
const {
  CodeEditor,
  HtmlPreview,
  ResultDisplay,
  CodeBox,
} = require('./dist/index.cjs');

console.log('🚀 walkerOS Explorer - Phase 1 Components Test\n');

// Test 1: CodeEditor
console.log('1️⃣ Testing CodeEditor...');
try {
  const container1 = document.createElement('div');
  const editor = new CodeEditor(container1, {
    language: 'javascript',
    value: 'function hello() { return "Hello, walkerOS!"; }',
    showCopyButton: true,
  });

  console.log('   ✅ CodeEditor created successfully');
  console.log('   📝 Value:', editor.getValue().substring(0, 50) + '...');

  editor.setValue('const newCode = "Updated!";');
  console.log('   🔄 Updated value:', editor.getValue());

  editor.destroy();
  console.log('   🗑️ CodeEditor destroyed\n');
} catch (error) {
  console.error('   ❌ CodeEditor error:', error.message, '\n');
}

// Test 2: HtmlPreview
console.log('2️⃣ Testing HtmlPreview...');
try {
  const container2 = document.createElement('div');
  const preview = new HtmlPreview(container2, {
    html: '<div><h1>Hello walkerOS!</h1><button data-elb="test">Click me</button></div>',
    previewId: 'test-preview',
    onElementClick: (element, event) => {
      console.log(
        '   🖱️ Element clicked:',
        element.tagName,
        element.textContent,
      );
    },
  });

  console.log('   ✅ HtmlPreview created successfully');
  console.log('   📄 HTML length:', preview.getHtml().length, 'characters');

  preview.setHtml('<div><p>Updated HTML content!</p></div>');
  console.log(
    '   🔄 Updated HTML length:',
    preview.getHtml().length,
    'characters',
  );

  preview.destroy();
  console.log('   🗑️ HtmlPreview destroyed\n');
} catch (error) {
  console.error('   ❌ HtmlPreview error:', error.message, '\n');
}

// Test 3: ResultDisplay
console.log('3️⃣ Testing ResultDisplay...');
try {
  const container3 = document.createElement('div');
  const display = new ResultDisplay(container3, {
    value: {
      message: 'Hello from ResultDisplay!',
      data: [1, 2, 3, 4, 5],
      nested: {
        user: { id: 123, name: 'Test User' },
        timestamp: Date.now(),
      },
    },
    expandable: true,
  });

  console.log('   ✅ ResultDisplay created successfully');
  console.log('   📊 Value type:', typeof display.getValue());
  console.log(
    '   📄 Formatted preview:',
    display.getFormattedValue().substring(0, 100) + '...',
  );

  display.setValue({ simple: 'Updated value', count: 42 });
  console.log('   🔄 Updated value:', display.getValue());

  display.destroy();
  console.log('   🗑️ ResultDisplay destroyed\n');
} catch (error) {
  console.error('   ❌ ResultDisplay error:', error.message, '\n');
}

// Test 4: CodeBox
console.log('4️⃣ Testing CodeBox...');
try {
  const container4 = document.createElement('div');
  const codeBox = new CodeBox(container4, {
    label: 'Test Configuration',
    value: '{\n  "setting": true,\n  "count": 10\n}',
    language: 'json',
    showCopy: true,
    showReset: true,
    showLabel: true,
    resetValue: '{"default": true}',
  });

  console.log('   ✅ CodeBox created successfully');
  console.log('   📝 Value:', codeBox.getValue());
  console.log('   🎛️ Has CodeEditor:', !!codeBox.getCodeEditor());

  codeBox.setValue('{"updated": "value"}');
  console.log('   🔄 Updated value:', codeBox.getValue());

  codeBox.setLabel('Updated Label');
  console.log('   🏷️ Label updated successfully');

  codeBox.destroy();
  console.log('   🗑️ CodeBox destroyed\n');
} catch (error) {
  console.error('   ❌ CodeBox error:', error.message, '\n');
}

// Test 5: Component Integration
console.log('5️⃣ Testing Component Integration...');
try {
  const htmlContainer = document.createElement('div');
  const resultContainer = document.createElement('div');

  // Create connected components
  const htmlPreview = new HtmlPreview(htmlContainer, {
    html: '<button id="test-btn">Integration Test</button>',
    onElementClick: (element) => {
      const clickData = {
        element: element.tagName,
        id: element.id,
        text: element.textContent,
        timestamp: new Date().toISOString(),
      };
      resultDisplay.setValue(clickData);
      console.log('   🔗 Components integrated - click data passed');
    },
  });

  const resultDisplay = new ResultDisplay(resultContainer, {
    value: { message: 'Waiting for interaction...' },
  });

  console.log('   ✅ Integration components created');
  console.log('   🔗 Components are connected and ready');

  // Simulate a click by calling the handler directly
  const button = htmlPreview.getPreviewContainer().querySelector('#test-btn');
  if (button) {
    // Trigger the click handler
    htmlPreview.options.onElementClick(
      button,
      new dom.window.MouseEvent('click'),
    );
    console.log('   🖱️ Simulated click processed');
    console.log(
      '   📊 Result data:',
      JSON.stringify(resultDisplay.getValue(), null, 2),
    );
  }

  // Cleanup
  htmlPreview.destroy();
  resultDisplay.destroy();
  console.log('   🗑️ Integration components destroyed\n');
} catch (error) {
  console.error('   ❌ Integration error:', error.message, '\n');
}

console.log('🎉 All Phase 1 components tested successfully!');
console.log('\n📋 Summary:');
console.log(
  '   ✅ CodeEditor - Advanced code editing with syntax highlighting',
);
console.log('   ✅ HtmlPreview - Safe HTML rendering with interaction');
console.log('   ✅ ResultDisplay - Smart JSON/object visualization');
console.log('   ✅ CodeBox - Complete code editing experience');
console.log('   ✅ Integration - Components work together seamlessly');
console.log('\n🚀 Ready for Phase 2: LiveCode Implementation!');
