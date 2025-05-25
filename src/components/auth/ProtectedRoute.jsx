import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth(); 
  const location = useLocation();
  const { t } = useTranslation('common');

  console.log('ProtectedRoute: Rendering. loading:', loading, 'isAuthenticated:', isAuthenticated, 'User ID:', user?.id);

  if (loading) {
    console.log('ProtectedRoute: Displaying loading spinner because loading is true.');
    return (
      <div className="flex justify-center items-center h-screen bg-navy-deep">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-accent-blue mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xl text-text-primary-dark">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login. Current location:', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('ProtectedRoute: User is authenticated, rendering children.');
  return children;
};

export default ProtectedRoute;