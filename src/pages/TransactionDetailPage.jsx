import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
// Added FiRepeat to the imports
import { FiArrowRight, FiPaperclip, FiCalendar, FiMessageSquare, FiTag, FiPackage, FiCreditCard, FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiDownload, FiRepeat } from 'react-icons/fi';
import { formatCurrency, getCurrencyDisplayInfo, getAllCurrenciesForUser, HARDCODED_DEFAULT_CURRENCY } from '../utils/currencies';
import Button from '../components/common/Button';

const TransactionDetailPage = () => {
  const { t, i18n } = useTranslation('common');
  const { transactionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  useEffect(() => { let mounted = true; const loadCurrencies = async () => { setLoadingCurrencies(true); try { const fetchedCurrencies = await getAllCurrenciesForUser(user?.id || null); if (mounted) setAvailableCurrencies(fetchedCurrencies || []); } catch (err) { if (mounted) setAvailableCurrencies([]); } finally { if (mounted) setLoadingCurrencies(false); }}; loadCurrencies(); return () => { mounted = false; }; }, [user]);

  const fetchTransactionDetails = useCallback(async () => {
    if (!user || !transactionId || loadingCurrencies) { if(!user || !transactionId) setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const { data, error: txError } = await supabase.from('transactions').select(`*, accounts:account_id (id, name, type, currency), materials (id, name, unit_type, image_url)`).eq('user_id', user.id).eq('id', transactionId).single();
      if (txError) throw txError;
      if (!data) throw new Error(t('transactionNotFound'));
      setTransaction(data);
    } catch (err) { setError(err.message || t('errorFetchingTransactionDetails')); setTransaction(null); } 
    finally { setLoading(false); }
  }, [user, transactionId, t, loadingCurrencies]);

  useEffect(() => { if(!loadingCurrencies) fetchTransactionDetails(); }, [fetchTransactionDetails, loadingCurrencies]);
  
  const handleDownloadImage = (imageUrl, txId) => { if (imageUrl) { const link = document.createElement('a'); link.href = imageUrl; const fileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1); link.download = fileName || `attachment-${txId}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); }};

  if ((loading || loadingCurrencies) && !error) { return <div className="flex justify-center items-center h-[calc(100vh-250px)]"><svg className="animate-spin h-12 w-12 text-nuzum-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>; }
  if (error || !transaction) { return <div className="text-center p-10 bg-nuzum-surface rounded-xl shadow-card"><FiAlertCircle className="mx-auto h-12 w-12 text-nuzum-danger mb-4" /><p className="text-nuzum-danger mb-6">{error || t('transactionNotFound')}</p><Button onClick={() => navigate('/transactions')} variant="outline">{i18n.language === 'ar' ? <FiArrowRight className="ms-2"/> : null} {t('backToTransactions')} {i18n.language !== 'ar' ? <FiArrowRight className="ms-2 transform rotate-180"/> : null}</Button></div>; }

  const DetailItem = ({ icon, label, value, valueClass = 'text-nuzum-text-primary', isHtml = false }) => ( <div className="flex items-start py-3"> <div className="flex-shrink-0 w-8 text-center me-3">{React.cloneElement(icon, { className: "h-5 w-5 text-nuzum-accent-primary inline-block" })}</div> <div> <p className="text-xs text-nuzum-text-secondary">{label}</p> {isHtml ? <div className={`text-sm font-medium ${valueClass} break-words`} dangerouslySetInnerHTML={{ __html: value || '-' }} /> : <p className={`text-sm font-medium ${valueClass} break-words`}>{value || '-'}</p>} </div> </div> );

  return (
    <div className="space-y-8">
      <div className="bg-nuzum-surface p-5 sm:p-6 rounded-xl shadow-card flex flex-col sm:flex-row justify-between sm:items-center gap-4"><div><h1 className="text-2xl sm:text-3xl font-bold text-nuzum-text-primary flex items-center">{transaction.type === 'income' ? <FiTrendingUp className="h-8 w-8 text-nuzum-success me-3"/> : <FiTrendingDown className="h-8 w-8 text-nuzum-danger me-3"/>}{t('transactionDetails')}</h1><p className="text-sm text-nuzum-text-secondary ms-11">{t(transaction.type)}</p></div></div>
      <div className="bg-nuzum-surface p-6 sm:p-8 rounded-xl shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem icon={<FiDollarSign/>} label={t('amount')} value={formatCurrency(transaction.amount, transaction.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)} valueClass={transaction.type === 'income' ? 'text-nuzum-success font-bold' : 'text-nuzum-danger font-bold'}/>
          <DetailItem icon={<FiCreditCard/>} label={t('account')} value={transaction.accounts?.name || t('unknownAccount')} />
          <DetailItem icon={<FiCalendar/>} label={t('date')} value={new Date(transaction.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined, { year: 'numeric', month: 'long', day: 'numeric', hour:'2-digit', minute:'2-digit' })} />
          <DetailItem icon={<FiTag/>} label={t('currency')} value={`${getCurrencyDisplayInfo(transaction.currency, availableCurrencies, t).name} (${transaction.currency})`} />
          {transaction.notes && (<div className="md:col-span-2"><DetailItem icon={<FiMessageSquare/>} label={t('notes')} value={transaction.notes.replace(/\n/g, '<br />')} isHtml={true} /></div>)}
          {transaction.materials && (<> <hr className="md:col-span-2 border-nuzum-border my-2"/> <div className="md:col-span-2 text-center mb-0 -mt-2"><p className="text-sm font-semibold text-nuzum-text-secondary">{t('materialDetails')}</p></div> <DetailItem icon={<FiPackage/>} label={t('materialName')} value={transaction.materials.name} /> <DetailItem icon={<FiRepeat/>} label={t('quantityChanged')} value={`${transaction.material_quantity_affected > 0 ? '+' : ''}${transaction.material_quantity_affected} ${t(transaction.materials.unit_type.toLowerCase()) || transaction.materials.unit_type }`} /> {transaction.materials.image_url && (<div className="md:col-span-2 mt-2"><p className="text-xs text-nuzum-text-secondary mb-1">{t('materialImage')}</p><img src={transaction.materials.image_url} alt={transaction.materials.name} className="max-w-xs max-h-48 rounded-lg border border-nuzum-border shadow-subtle"/></div>)} </>)}
          {transaction.image_url && (<> <hr className="md:col-span-2 border-nuzum-border my-2"/> <div className="md:col-span-2"><p className="text-sm font-semibold text-nuzum-text-secondary mb-2">{t('transactionAttachment')}</p><img src={transaction.image_url} alt={t('transactionAttachment')} className="max-w-full md:max-w-md max-h-96 rounded-lg border border-nuzum-border shadow-card object-contain mb-3"/><Button onClick={() => handleDownloadImage(transaction.image_url, transaction.id)} variant="outline" size="sm" leftIcon={<FiDownload />}>{t('downloadAttachment')}</Button></div></>)}
        </div>
      </div>
      <div className="text-center mt-8"><Button onClick={() => navigate('/transactions')} variant="outline">{i18n.language === 'ar' ? <FiArrowRight className="ms-2"/> : null} {t('backToTransactions')} {i18n.language !== 'ar' ? <FiArrowRight className="ms-2 transform rotate-180"/> : null}</Button></div>
    </div>
  );
};

export default TransactionDetailPage;