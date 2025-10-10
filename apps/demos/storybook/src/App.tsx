import { useState } from 'react';
import { MediathekTemplate } from './components/media/templates/MediathekTemplate';
import { Button } from './stories/Button';
import { Typography } from './components/media/atoms/Typography/Typography';
import './App.css';

type TemplateType = 'landing' | 'publisher';

function App() {
  const [currentTemplate, setCurrentTemplate] =
    useState<TemplateType>('landing');

  if (currentTemplate === 'landing') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <div style={{ maxWidth: '600px' }}>
          <Typography
            variant="h1"
            style={{ marginBottom: '16px', color: 'white' }}
          >
            Component Demo
          </Typography>
          <Typography
            variant="body1"
            style={{ marginBottom: '32px', color: 'rgba(255,255,255,0.9)' }}
          >
            Explore complete application domains built with Atomic Design
            principles
          </Typography>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '32px',
            }}
          >
            <div data-testid="mediathek-button">
              <Button
                label="📺 Mediathek Demo"
                primary
                onClick={() => setCurrentTemplate('publisher')}
              />
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '24px',
            }}
          >
            <Typography
              variant="h4"
              style={{ marginBottom: '12px', color: 'white' }}
            >
              🎯 For the Full Experience
            </Typography>
            <Typography
              variant="body2"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Run{' '}
              <code
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
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
      <div
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 1000,
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
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
