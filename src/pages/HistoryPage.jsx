// src/pages/HistoryPage.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const HistoryPage = () => {
  const { t } = useTranslation('common');
  return <div className="text-2xl font-semibold text-text-primary-dark">{t('history')} Page Content</div>;
};
export default HistoryPage;