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
