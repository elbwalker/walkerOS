import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Footer, Home, Navigation, Pricing, LogIn } from './components';

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
        <Route path="/login" element={<LogIn />} />
      </Routes>
      <Footer />
    </>
  );
}
