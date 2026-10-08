import { useState } from 'react';
import { MediathekTemplate } from './components/media/templates/MediathekTemplate';
import { Button } from './components/media/atoms/Button';
import { Typography } from './components/media/atoms/Typography/Typography';
import './App.css';

type TemplateType = 'landing' | 'publisher';

function App() {
  const [currentTemplate, setCurrentTemplate] =
    useState<TemplateType>('landing');

  if (currentTemplate === 'landing') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-bg to-bg-2 p-5 text-center text-fg">
        <div className="max-w-150">
          <Typography variant="h1" align="center" className="mb-4">
            Component Demo
          </Typography>
          <Typography
            variant="body1"
            color="secondary"
            align="center"
            className="mb-8"
          >
            Explore complete application domains built with Atomic Design
            principles
          </Typography>

          <div className="mb-8 flex flex-wrap justify-center gap-4">
            <div data-testid="mediathek-button">
              <Button
                label="📺 Mediathek Demo"
                primary
                onClick={() => setCurrentTemplate('publisher')}
              />
            </div>
          </div>

          <div className="mt-6 rounded-md border border-border bg-surface p-5">
            <Typography variant="h4" align="center" className="mb-3">
              🎯 For the Full Experience
            </Typography>
            <Typography variant="body2" color="secondary" align="center">
              Run{' '}
              <code className="rounded-xs bg-surface-2 px-1.5 py-0.5 font-mono">
                npm run storybook
              </code>{' '}
              to explore all components in detail with interactive documentation
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-2.5 right-2.5 z-(--z-sticky) hidden items-center gap-2 rounded-md border border-border-strong bg-surface p-3">
        <Button
          label="🏠 Home"
          size="small"
          onClick={() => setCurrentTemplate('landing')}
        />
        <Typography variant="caption">Demo:</Typography>
        <Button
          label="Mediathek"
          primary={currentTemplate === 'publisher'}
          size="small"
          onClick={() => setCurrentTemplate('publisher')}
        />
      </div>

      {currentTemplate === 'publisher' && <MediathekTemplate />}
    </div>
  );
}

export default App;
