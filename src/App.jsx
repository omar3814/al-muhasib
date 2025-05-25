import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './components/layout/MainLayout';
// Auth
import ProtectedRoute from './components/auth/ProtectedRoute';

// Page Components (Lazy Loaded)
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const AccountsPage = React.lazy(() => import('./pages/AccountsPage'));
const MaterialsPage = React.lazy(() => import('./pages/MaterialsPage'));
const TransactionsPage = React.lazy(() => import('./pages/TransactionsPage'));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const PageLoadingFallback = () => {
  const { t } = useTranslation('common');
  return (
    <div className="flex justify-center items-center h-[calc(100vh-150px)] bg-navy-deep">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-accent-blue mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl text-text-primary-dark">{t('loading')}</p>
      </div>
    </div>
  );
};

function App() {
  const { user, loading } = useAuth(); 

  return (
    <div dir="rtl">
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        toastOptions={{
          className: '',
          style: { background: '#172A45', color: '#CCD6F6', border: '1px solid #334E68', minWidth: '300px' },
          success: { duration: 3000, iconTheme: { primary: '#4A90E2', secondary: '#CCD6F6' }},
          error: { duration: 5000, iconTheme: { primary: '#EF4444', secondary: '#CCD6F6' }},
        }}
      />
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/login" element={!loading && user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="/signup" element={!loading && user ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
          
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;