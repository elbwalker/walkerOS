import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { CTA, Footer, Home, Pricing, Navigation } from './components';

export function walker() {
  (window.elbLayer = window.elbLayer || []).push(arguments);
}

export default function App() {
  // https://v5.reactrouter.com/web/api/Hooks/uselocation
  const location = useLocation();
  React.useEffect(() => {
    walker('walker run');
  }, [location]);

  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
      <CTA
        title="Ready to dive in?"
        description="Start your free trial today."
        position="footer"
      />
      <Footer />
    </>
  );
}
