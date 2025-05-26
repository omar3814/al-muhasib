import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { FiArrowRight, FiPackage, FiDollarSign, FiDownload, FiAlertCircle, FiRepeat, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { formatCurrency, getCurrencyDisplayInfo, getAllCurrenciesForUser, HARDCODED_DEFAULT_CURRENCY } from '../utils/currencies'; // Ensured all needed imports
import Button from '../components/common/Button';

const MaterialDetailPage = () => {
  const { t, i18n } = useTranslation('common');
  const { materialId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  useEffect(() => { let mounted = true; const loadCurrencies = async () => { setLoadingCurrencies(true); try { const fetchedCurrencies = await getAllCurrenciesForUser(user?.id || null); if (mounted) setAvailableCurrencies(fetchedCurrencies || []); } catch (err) { if (mounted) setAvailableCurrencies([]); } finally { if (mounted) setLoadingCurrencies(false); }}; loadCurrencies(); return () => { mounted = false; }; }, [user]);

  const fetchMaterialDetails = useCallback(async () => {
    if (!user || !materialId || loadingCurrencies) { if (!user || !materialId) setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const { data: materialData, error: materialError } = await supabase.from('materials').select('*').eq('user_id', user.id).eq('id', materialId).single();
      if (materialError) throw materialError;
      if (!materialData) throw new Error(t('materialNotFound'));
      setMaterial(materialData);
      const { data: transactionsData, error: transactionsError } = await supabase.from('transactions').select(`*, accounts(name)`).eq('user_id', user.id).eq('material_id', materialId).order('date', { ascending: false }).limit(5);
      if (transactionsError) console.warn("Error fetching material transactions:", transactionsError.message);
      setTransactions(transactionsData || []);
    } catch (err) { setError(err.message || t('errorFetchingMaterialDetails')); setMaterial(null); } 
    finally { setLoading(false); }
  }, [user, materialId, t, loadingCurrencies]); // Added loadingCurrencies

  useEffect(() => { if (!loadingCurrencies) fetchMaterialDetails(); }, [fetchMaterialDetails, loadingCurrencies]);

  const handleDownloadImage = () => { if (material?.image_url) { const link = document.createElement('a'); link.href = material.image_url; const fileName = material.image_url.substring(material.image_url.lastIndexOf('/') + 1); link.download = fileName || `material-image-${material.id}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); }};

  if ((loading || loadingCurrencies) && !error) { return <div className="flex justify-center items-center h-[calc(100vh-250px)]"><svg className="animate-spin h-12 w-12 text-nuzum-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>; }
  if (error || !material) { return <div className="text-center p-10 bg-nuzum-surface rounded-xl shadow-card"><FiAlertCircle className="mx-auto h-12 w-12 text-nuzum-danger mb-4" /><p className="text-nuzum-danger mb-6">{error || t('materialNotFound')}</p><Button onClick={() => navigate('/materials')} variant="outline">{i18n.language === 'ar' ? <FiArrowRight className="ms-2"/> : null} {t('backToMaterials')} {i18n.language !== 'ar' ? <FiArrowRight className="ms-2 transform rotate-180"/> : null}</Button></div>; }

  return (
    <div className="space-y-8">
      <div className="bg-nuzum-surface p-6 sm:p-8 rounded-xl shadow-card">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="md:w-1/3 flex flex-col items-center">
            <div className="w-full aspect-square bg-nuzum-bg-deep rounded-lg flex items-center justify-center overflow-hidden mb-4 shadow-subtle">
              {material.image_url ? ( <img src={material.image_url} alt={material.name} className="w-full h-full object-contain" /> ) : ( <FiPackage className="h-24 w-24 text-nuzum-text-placeholder" /> )}
            </div>
            {material.image_url && (<Button onClick={handleDownloadImage} variant="outline" size="sm" leftIcon={<FiDownload />}>{t('downloadImage')}</Button>)}
          </div>
          <div className="md:w-2/3 space-y-4">
            <h1 className="text-3xl font-bold text-nuzum-text-primary border-b border-nuzum-border pb-3 mb-4">{material.name}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-nuzum-text-secondary font-medium">{t('pricePerUnit')}: </span><span className="text-nuzum-text-primary">{formatCurrency(material.price_per_unit, material.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</span></div>
              <div><span className="text-nuzum-text-secondary font-medium">{t('currency')}: </span><span className="text-nuzum-text-primary">{getCurrencyDisplayInfo(material.currency, availableCurrencies, t).name} ({material.currency})</span></div>
              <div><span className="text-nuzum-text-secondary font-medium">{t('currentStock')}: </span><span className="text-nuzum-text-primary">{material.quantity} {t(material.unit_type.toLowerCase()) || material.unit_type}</span></div>
              <div><span className="text-nuzum-text-secondary font-medium">{t('unitType')}: </span><span className="text-nuzum-text-primary">{t(material.unit_type.toLowerCase()) || material.unit_type}</span></div>
            </div>
          </div>
        </div>
      </div>
       {transactions.length > 0 && (
        <div className="bg-nuzum-surface p-6 rounded-xl shadow-card">
            <h2 className="text-xl font-semibold text-nuzum-text-primary mb-4">{t('relatedTransactions')}</h2>
            <ul className="divide-y divide-nuzum-border">
                {transactions.map(tx => (
                    <li key={tx.id} className="py-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className={`text-sm font-medium ${tx.type === 'income' ? 'text-nuzum-success' : 'text-nuzum-danger'}`}>{t(tx.type)}</p>
                                <p className="text-xs text-nuzum-text-secondary">{new Date(tx.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)} - {tx.accounts.name}</p>
                            </div>
                            <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-nuzum-success' : 'text-nuzum-danger'}`}>
                                {tx.type === 'income' ? '+' : '-'}
                                {formatCurrency(tx.amount, tx.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}
                                ({Math.abs(tx.material_quantity_affected)} {t(material.unit_type.toLowerCase()) || material.unit_type})
                            </p>
                        </div>
                         {tx.notes && <p className="text-xs text-nuzum-text-secondary mt-1 ps-1">{tx.notes}</p>}
                    </li>
                ))}
            </ul>
        </div>
       )}
    </div>
  );
};

export default MaterialDetailPage;