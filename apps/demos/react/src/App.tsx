import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Navigation from './components/Navigation';
import ConsentBar from './components/ConsentBar';
import PageA from './pages/PageA';
import PageB from './pages/PageB';
import { initializeWalker } from './walker';

function App() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  // Initialize walker on app mount
  useEffect(() => {
    // eslint-disable-next-line no-console
    initializeWalker().catch(console.error);
  }, []);

  useEffect(() => {
    // For SPAs, manually trigger page view on route change
    // Skip first render as browser source handles initial pageview when pageview: true
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (window.elb) window.elb('walker run');
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <Routes>
          <Route path="/" element={<PageA />} />
          <Route path="/page-b" element={<PageB />} />
        </Routes>
      </main>

      <ConsentBar />
    </div>
  );
}

export default App;
