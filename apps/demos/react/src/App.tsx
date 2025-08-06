import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Navigation from './components/Navigation';
import ControlBar from './components/ControlBar';
import Home from './pages/Home';
import Category from './pages/Category';
import Detail from './pages/Detail';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import { initializeWalker } from './walker/index';
import { elb } from '@walkeros/web-core';

function App() {
  const location = useLocation();
  const hasInitialized = useRef(false);
  const firstRun = useRef(true);

  useEffect(() => {
    // Prevent React StrictMode double execution
    if (!hasInitialized.current) {
      initializeWalker();
      hasInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    elb('walker run');
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category" element={<Category />} />
          <Route path="/product/:id" element={<Detail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderConfirmation />} />
        </Routes>
      </main>

      <ControlBar />
    </div>
  );
}

export default App;
