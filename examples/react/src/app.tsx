import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { elb } from '@elbwalker/walker.js';
import { setupAnalytics } from './data';
import Footer from './components/organisms/footer';
import Navigation from './components/organisms/navigation';
import Home from './components/pages/home';
import LogIn from './components/pages/login';
import Pricing from './components/pages/pricing';

setupAnalytics();

export default function App() {
  // https://v5.reactrouter.com/web/api/Hooks/uselocation
  const location = useLocation();
  React.useEffect(() => {
    elb('walker run');
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
