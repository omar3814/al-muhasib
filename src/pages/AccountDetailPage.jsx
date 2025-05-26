import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { FiArrowRight, FiDollarSign, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRepeat } from 'react-icons/fi';
// Corrected import: use getCurrencyDisplayInfo and getAllCurrenciesForUser
import { formatCurrency, getCurrencyDisplayInfo, getAllCurrenciesForUser, HARDCODED_DEFAULT_CURRENCY } from '../utils/currencies';
import Button from '../components/common/Button';

const AccountDetailPage = () => {
  const { t, i18n } = useTranslation('common');
  const { accountId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  useEffect(() => { 
    let mounted = true;
    const loadCurrencies = async () => {
      setLoadingCurrencies(true);
      try {
        const fetchedCurrencies = await getAllCurrenciesForUser(user?.id || null);
        if (mounted) {
          setAvailableCurrencies(fetchedCurrencies || []);
        }
      } catch (err) {
        if (mounted) {
          console.error("AccountDetailPage: Error fetching currencies:", err);
          setAvailableCurrencies([]); 
        }
      } finally {
        if (mounted) {
          setLoadingCurrencies(false);
        }
      }
    };
    loadCurrencies();
    return () => { mounted = false; };
  }, [user]);

  const fetchAccountDetails = useCallback(async () => {
    if (!user || !accountId || loadingCurrencies) { 
      if (!user || !accountId) setLoading(false);
      return; 
    }
    setLoading(true); setError('');
    try {
      const { data: accountData, error: accountError } = await supabase.from('accounts').select('*').eq('user_id', user.id).eq('id', accountId).single();
      if (accountError) throw accountError;
      if (!accountData) throw new Error(t('accountNotFound'));
      setAccount(accountData);

      const { data: transactionsData, error: transactionsError } = await supabase.from('transactions').select(`*, materials (id, name)`).eq('user_id', user.id).eq('account_id', accountId).order('date', { ascending: false }).limit(10);
      if (transactionsError) console.warn("Error fetching account transactions:", transactionsError.message); // Changed to warn as it's secondary data
      setTransactions(transactionsData || []);
    } catch (err) { 
      setError(err.message || t('errorFetchingAccountDetails')); 
      setAccount(null); 
    } 
    finally { setLoading(false); }
  }, [user, accountId, t, loadingCurrencies]);

  useEffect(() => { 
    if (!loadingCurrencies) { // Only fetch details once currencies are available
      fetchAccountDetails(); 
    }
  }, [fetchAccountDetails, loadingCurrencies]);

  // Real-time listener for THIS specific account
  useEffect(() => {
    if (!user || !accountId) return;
    const channelName = `account-detail-${accountId}`;
    const accountSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'accounts', filter: `id=eq.${accountId}` },
        (payload) => {
          console.log('Account detail change received, refetching:', payload);
          fetchAccountDetails(); // Refetch account details if it changes
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `account_id=eq.${accountId}`},
        (payload) => {
            console.log('Transaction for this account changed, refetching details (incl tx):', payload);
            fetchAccountDetails(); // Refetch to get updated transaction list and potentially balance
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(accountSubscription);
    };
  }, [user, accountId, fetchAccountDetails]);


  if ((loading || loadingCurrencies) && !error) { return <div className="flex justify-center items-center h-[calc(100vh-250px)]"><svg className="animate-spin h-12 w-12 text-nuzum-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>; }
  if (error || !account) { return <div className="text-center p-10 bg-nuzum-surface rounded-xl shadow-card"><FiAlertCircle className="mx-auto h-12 w-12 text-nuzum-danger mb-4" /><p className="text-nuzum-danger mb-6">{error || t('accountNotFound')}</p><Button onClick={() => navigate('/accounts')} variant="outline">{i18n.language === 'ar' ? <FiArrowRight className="ms-2"/> : null} {t('backToAccounts')} {i18n.language !== 'ar' ? <FiArrowRight className="ms-2 transform rotate-180"/> : null}</Button></div>; }

  return (
    <div className="space-y-8">
      <div className="bg-nuzum-surface p-6 rounded-xl shadow-card">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <div className="flex items-center mb-2"><FiDollarSign className="h-8 w-8 text-nuzum-accent-primary me-3"/><h1 className="text-3xl font-bold text-nuzum-text-primary">{account.name}</h1></div>
            <p className="text-nuzum-text-secondary">{t(account.type)}</p>
            {account.description && <p className="text-sm text-nuzum-text-secondary mt-1">{account.description}</p>}
          </div>
          <div className="text-start sm:text-end">
            <p className="text-sm text-nuzum-text-secondary">{t('currentBalance')}</p>
            <p className="text-3xl font-bold text-nuzum-text-primary">{formatCurrency(account.balance, account.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</p>
            <p className="text-xs text-nuzum-text-secondary">{getCurrencyDisplayInfo(account.currency, availableCurrencies, t).name}</p>
          </div>
        </div>
      </div>
      <div className="bg-nuzum-surface p-6 rounded-xl shadow-card">
        <div className="flex justify-between items-center mb-5"><h2 className="text-xl font-semibold text-nuzum-text-primary">{t('recentAccountTransactions')}</h2><Link to={`/transactions?accountId=${account.id}`} className="text-sm font-medium text-nuzum-accent-primary hover:text-nuzum-accent-primary-hover hover:underline">{t('viewAllTransactionsForAccount')}</Link></div>
        {transactions.length > 0 ? ( <ul className="divide-y divide-nuzum-border"> {transactions.map(tx => ( <li key={tx.id} className="py-4"> <Link to={`/transactions/${tx.id}`} className="block hover:bg-nuzum-border/30 p-2 -m-2 rounded-md"> <div className="flex items-start justify-between space-x-4"> <div className="flex-1 min-w-0"> <div className="flex items-center mb-1"> {tx.type === 'income' ? <FiTrendingUp className="h-5 w-5 text-nuzum-success me-2 shrink-0" /> : <FiTrendingDown className="h-5 w-5 text-nuzum-danger me-2 shrink-0" />} <span className={`font-semibold text-lg ${tx.type === 'income' ? 'text-nuzum-success' : 'text-nuzum-danger'}`}>{formatCurrency(tx.amount, tx.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</span> </div> <p className="text-sm text-nuzum-text-primary truncate" title={tx.notes}>{tx.notes || t(tx.type)}</p> <p className="text-xs text-nuzum-text-secondary mt-1">{new Date(tx.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined, { year: 'numeric', month: 'long', day: 'numeric' })} {tx.materials && ` | ${tx.materials.name}`}</p> </div> </div> </Link> </li> ))} </ul> ) : ( <p className="text-nuzum-text-secondary py-4 text-center">{t('noTransactionsForAccount')}</p> )}
      </div>
    </div>
  );
};

export default AccountDetailPage;