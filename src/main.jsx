// src/main.jsx
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './i18n';
import { AuthProvider } from './contexts/AuthContext.jsx'; // Import AuthProvider

document.documentElement.classList.add('dark');

const InitialLoading = () => (
  <div style={{ direction: 'rtl', textAlign: 'center', padding: '50px', fontSize: '20px', backgroundColor: '#0A192F', color: '#CCD6F6', minHeight: '100vh' }}>
    جاري تحميل التطبيق...
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<InitialLoading />}>
      <AuthProvider> {/* Wrap BrowserRouter (and thus App) with AuthProvider */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </Suspense>
  </React.StrictMode>,
);