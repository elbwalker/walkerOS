import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import App from './app';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  // Note when using React.StrictMode the initial walker run is called twice
  // due to mounting, unmounting & remounting again. But only in dev mode.
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
