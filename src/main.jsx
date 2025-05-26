import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css'; // Tailwind CSS base styles etc.
import './i18n';     // Internationalization setup
import { AuthProvider } from './contexts/AuthContext.jsx';

// Apply dark mode by default by adding 'dark' class to the <html> element
// This is important for Tailwind's darkMode: 'class' strategy
document.documentElement.classList.add('dark');

const InitialLoading = () => (
  <div style={{ direction: 'rtl', textAlign: 'center', padding: '50px', fontSize: '20px', backgroundColor: '#1A1D23', color: '#E0E0E0', minHeight: '100vh' }}>
    جاري تحميل التطبيق...
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<InitialLoading />}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </Suspense>
  </React.StrictMode>,
);