import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Footer, Home, LogIn, Navigation, Pricing } from './components';
import { setupAnalytics, walker } from './data';

setupAnalytics();

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
