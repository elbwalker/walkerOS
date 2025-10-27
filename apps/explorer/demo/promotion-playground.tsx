import React from 'react';
import { createRoot } from 'react-dom/client';
import { PromotionPlayground } from '../src/components/demos/PromotionPlayground';
import { DemoTemplate } from './shared/DemoTemplate';

function App() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <DemoTemplate
      title="Promotion Playground"
      componentName="PromotionPlayground"
      description="Complete walkerOS flow: HTML → Preview → Events → Mapping → Destination"
    >
      <PromotionPlayground theme={theme} />
    </DemoTemplate>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
