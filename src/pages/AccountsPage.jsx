import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiDollarSign, FiAlertCircle, FiChevronRight } from 'react-icons/fi';

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import AccountForm from '../components/accounts/AccountForm';
// Import the new functions, not the old CURRENCIES array
import { formatCurrency, getCurrencyDisplayInfo, getAllCurrenciesForUser, HARDCODED_DEFAULT_CURRENCY } from '../utils/currencies';

const AccountsPage = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  
  // State to hold all available currencies (global + user's custom)
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  useEffect(() => {
    if (user) {
      getAllCurrenciesForUser(user.id).then(fetchedCurrencies => {
        setAvailableCurrencies(fetchedCurrencies || []);
      });
    } else {
      // Load only global currencies if no user (e.g., for some edge cases or public views if any)
      getAllCurrenciesForUser(null).then(fetchedCurrencies => {
        setAvailableCurrencies(fetchedCurrencies || []);
      });
    }
  }, [user]);

  const fetchAccounts = useCallback(async () => { 
    if (!user) { setLoading(false); setAccounts([]); return; } 
    setLoading(true); setError(''); 
    try { 
      const { data, error: fetchError } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('name', { ascending: true }); 
      if (fetchError) throw fetchError; 
      setAccounts(data || []); 
    } catch (err) { 
      setError(t('errorFetchingAccounts')); 
      setAccounts([]);
    } 
    finally { setLoading(false); }
  }, [user, t]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  
  useEffect(() => { 
    if (!user) return; 
    const channelName = `public:accounts_page_currency_fix:${user.id}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}` }, 
        (payload) => { fetchAccounts(); }
      )
      .subscribe((status, err) => {
        if (err) { console.error("AccountsPage: RLS subscription error:", err); }
      }); 
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAccounts]);
  
  const handleOpenAccountModal = (account = null) => { setCurrentAccount(account); setIsAccountModalOpen(true); };
  const handleCloseAccountModal = () => { setIsAccountModalOpen(false); setCurrentAccount(null); setFormLoading(false); };
  
  const handleSubmitAccount = async (formData) => { setFormLoading(true); try { if (currentAccount?.id) { const { error: uErr } = await supabase.from('accounts').update({ name: formData.name, type: formData.type, description: formData.description, currency: formData.currency }).eq('id', currentAccount.id).eq('user_id', user.id); if (uErr) throw uErr; toast.success(t('accountUpdatedSuccess')); } else { const balanceToInsert = typeof formData.balance === 'number' ? formData.balance : 0; const { error: iErr } = await supabase.from('accounts').insert([{ ...formData, balance: balanceToInsert, user_id: user.id }]).select().single(); if (iErr) throw iErr; toast.success(t('accountCreatedSuccess')); } handleCloseAccountModal(); } catch (err) { toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); }};
  const handleDeleteAccount = async (accountId) => { if (!accountId) return; setFormLoading(true); try { const { error: dErr } = await supabase.from('accounts').delete().eq('id', accountId).eq('user_id', user.id); if (dErr) { if (dErr.message.includes('violates foreign key constraint')) { toast.error(t('accountDeleteFailedTransactionsExist')); } else { throw dErr; } } else { toast.success(t('accountDeletedSuccess')); } } catch (err) { toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); setShowDeleteConfirm(false); setAccountToDelete(null); }};
  const openDeleteConfirm = (account) => { setAccountToDelete(account); setShowDeleteConfirm(true); };
  const closeDeleteConfirm = () => { setAccountToDelete(null); setShowDeleteConfirm(false); };

  if (loading && accounts.length === 0 && !error) { return <div className="flex justify-center items-center h-[calc(100vh-250px)]"><svg className="animate-spin h-12 w-12 text-nuzum-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>; }

  return ( 
    <div className="space-y-8"> 
      <div className="bg-nuzum-surface p-5 sm:p-6 rounded-xl shadow-card flex flex-col sm:flex-row justify-between sm:items-center gap-4"> 
        <div> <h1 className="text-2xl sm:text-3xl font-bold text-nuzum-text-primary">{t('accounts')}</h1> <p className="text-sm text-nuzum-text-secondary mt-1">{t('manageYourFinancialAccounts')}</p> </div> 
        <Button onClick={() => handleOpenAccountModal()} leftIcon={<FiPlus className="rtl:ms-0 rtl:-me-0.5 me-1.5 -ms-0.5"/>} variant="accent" size="md" className="w-full sm:w-auto"> {t('addNewAccount')} </Button>
      </div> 
      <div className="bg-nuzum-surface rounded-xl shadow-card"> {error && !loading && ( <div className="p-10 text-center"> <FiAlertCircle className="mx-auto h-12 w-12 text-nuzum-danger mb-4" /> <p className="text-nuzum-danger">{error}</p> <Button onClick={fetchAccounts} className="mt-6" variant="secondary">{t('retry')}</Button> </div> )} {!loading && !error && accounts.length === 0 && ( <div className="text-center py-16 px-6"> <FiDollarSign className="mx-auto h-16 w-16 text-nuzum-text-secondary mb-6" /> <h3 className="text-2xl font-semibold text-nuzum-text-primary mb-3">{t('noAccountsFoundTitle')}</h3> <p className="text-nuzum-text-secondary mb-8">{t('noAccountsFoundMessage')}</p> <Button onClick={() => handleOpenAccountModal()} leftIcon={<FiPlus />} variant="accent" size="lg">{t('addNewAccount')}</Button> </div> )} {!error && accounts.length > 0 && ( <ul className="divide-y divide-nuzum-border"> {accounts.map(account => ( <li key={account.id} className="group"> <Link to={`/accounts/${account.id}`} className="block p-5 hover:bg-nuzum-border/50 transition-all duration-200 ease-in-out transform hover:-translate-y-1"> <div className="flex items-center justify-between space-x-4 rtl:space-x-reverse"> <div className="flex-1 min-w-0"> <p className="text-lg font-semibold text-nuzum-accent-primary truncate group-hover:text-nuzum-accent-primary-hover">{account.name}</p> <p className="text-sm text-nuzum-text-secondary">{t(account.type)} {account.description ? `- ${account.description.substring(0,50)}${account.description.length > 50 ? '...' : ''}` : ''}</p> </div> <div className="text-right shrink-0"> <p className="text-xl font-bold text-nuzum-text-primary"> {formatCurrency(account.balance, account.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)} </p> <p className="text-xs text-nuzum-text-secondary">{getCurrencyDisplayInfo(account.currency, availableCurrencies, t).name}</p> </div> <div className="flex items-center space-s-2 shrink-0"> <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenAccountModal(account);}} title={t('edit')} className="opacity-0 group-hover:opacity-100 focus:opacity-100 !p-1.5 transition-opacity"> <FiEdit2 className="w-4 h-4"/> </Button> <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirm(account);}} title={t('delete')} className="text-nuzum-danger opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/10 !p-1.5 transition-opacity"> <FiTrash2 className="w-4 h-4"/> </Button> <FiChevronRight className={`w-5 h-5 text-nuzum-text-secondary transition-transform group-hover:translate-x-1 group-hover:text-nuzum-text-primary ${i18n.dir() === 'rtl' ? 'transform rotate-180 group-hover:-translate-x-1' : ''}`} /> </div> </div> </Link> </li> ))} </ul> )} </div>
      <Modal isOpen={isAccountModalOpen} onClose={handleCloseAccountModal} title={currentAccount ? t('editAccount') : t('addNewAccount')} size="lg"> 
        <AccountForm 
            onSubmit={handleSubmitAccount} 
            onCancel={handleCloseAccountModal} 
            initialData={currentAccount} 
            isLoading={formLoading}
            // Pass availableCurrencies to AccountForm
            currencies={availableCurrencies} 
        /> 
      </Modal>
      <Modal isOpen={showDeleteConfirm} onClose={closeDeleteConfirm} title={t('confirmDeletionTitle')} size="sm"> <p className="text-nuzum-text-secondary">{t('deleteConfirmationMessage', { name: accountToDelete?.name || '' })}</p> <div className="flex justify-end space-s-3 pt-5"> <Button variant="secondary" onClick={closeDeleteConfirm} disabled={formLoading}>{t('no')}</Button> <Button variant="danger" onClick={() => handleDeleteAccount(accountToDelete?.id)} isLoading={formLoading} disabled={formLoading}>{t('yesDelete')}</Button> </div> </Modal>
    </div>
  );
};

export default AccountsPage;