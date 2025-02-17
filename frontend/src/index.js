import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App';
import PaymentScreen from './components/PaymentScreen';
import 'antd/dist/reset.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Router>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/payment" element={<PaymentScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);

