import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CTA, Footer, Home, App, Pricing, Navigation } from './components';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<App />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
      <CTA />
      <Footer />
    </BrowserRouter>
  </React.StrictMode>,
);
