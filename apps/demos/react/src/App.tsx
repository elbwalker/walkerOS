import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { elb, setupAnalytics } from './data';
import Footer from './components/organisms/footer';
import Navigation from './components/organisms/navigation';
import Home from './components/pages/home';
import LogIn from './components/pages/login';
import Pricing from './components/pages/pricing';
import './App.css';

function App() {
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Initialize analytics on app start
    setupAnalytics().then(() => {
      setAnalyticsReady(true);
    });
  }, []);

  useEffect(() => {
    // Run walker tracking on location change (only after analytics is ready)
    if (analyticsReady && elb) {
      elb('walker run');
    }
  }, [location, analyticsReady]);

  return (
    <>
      <Navigation />

      {/* Debug Section */}
      {analyticsReady && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: '#f0f0f0',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 1000,
          }}
        >
          <h4>🔍 Browser Source Debug</h4>
          <button
            onClick={() =>
              elb('debug button click', {
                source: 'manual',
                timestamp: Date.now(),
              })
            }
            style={{ marginRight: '5px', fontSize: '10px' }}
          >
            Test Manual Event
          </button>
          <button
            onClick={() =>
              console.log('Window elbEvents:', (window as any).elbEvents)
            }
            style={{ fontSize: '10px' }}
          >
            Show Events
          </button>
          <div style={{ marginTop: '5px', fontSize: '10px' }}>
            Status: {analyticsReady ? '✅ Ready' : '⏳ Loading'}
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<LogIn />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
