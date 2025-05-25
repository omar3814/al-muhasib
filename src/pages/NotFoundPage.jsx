// src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle } from 'react-icons/fi';

const NotFoundPage = () => {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-6 bg-navy-deep"> {/* Adjust min-height based on navbar/footer */}
      <FiAlertTriangle className="text-accent-blue text-6xl mb-6" />
      <h1 className="text-4xl font-bold text-text-primary-dark mb-3">
        404 - {t('pageNotFoundTitle') || 'Page Not Found'}
      </h1>
      <p className="text-lg text-text-secondary-dark mb-8">
        {t('pageNotFoundMessage') || "Sorry, the page you are looking for doesn't exist or has been moved."}
      </p>
      <Link
        to="/"
        className="bg-accent-blue text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:bg-blue-500 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-opacity-50"
      >
        {t('goBackButton') || 'Go Back Home'}
      </Link>
    </div>
  );
};
export default NotFoundPage;