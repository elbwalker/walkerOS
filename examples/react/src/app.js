import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Footer, Home, LogIn, Navigation, Pricing } from './components';

export default function App() {
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
