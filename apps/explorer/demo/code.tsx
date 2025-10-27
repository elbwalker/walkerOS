import React from 'react';
import { createRoot } from 'react-dom/client';
import { CodeBox } from '../src/components/organisms/code-box';
import { DemoTemplate } from './shared/DemoTemplate';

const typescriptExample = `// Event structure example
const event = {
  name: 'product view',
  data: {
    id: 'P123',
    name: 'Laptop',
    price: 999
  },
  context: {
    stage: ['shopping', 1]
  },
  globals: {
    language: 'en',
    currency: 'USD'
  }
};`;

function App() {
  const [editableCode, setEditableCode] = React.useState(typescriptExample);

  return (
    <DemoTemplate
      title="Code Display"
      componentName="CodeBox"
      description="Syntax-highlighted code viewer with Monaco editor"
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <CodeBox
          code={editableCode}
          language="typescript"
          onChange={setEditableCode}
          editable={true}
          height="400px"
        />
      </div>
    </DemoTemplate>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
