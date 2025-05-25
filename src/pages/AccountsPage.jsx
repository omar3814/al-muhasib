
// src/pages/AccountsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiDollarSign, FiAlertCircle } from 'react-icons/fi';

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import AccountForm from '../components/accounts/AccountForm';
import { formatCurrency, getCurrencyDisplay } from '../utils/currencies';

const AccountsPage = () => {
  console.log('ACCOUNTS PAGE IS MOUNTING / RENDERING NOW - Path:', window.location.pathname); // Specific log
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null); 
  const [formLoading, setFormLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  const fetchAccounts = useCallback(async () => {
    if (!user) {
        setLoading(false); // Ensure loading stops if no user
        return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err.message);
      setError(t('errorFetchingAccounts'));
      // toast.error(t('errorFetchingAccounts')); // Can be too noisy
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('public:accounts_page_listener') // Unique channel name
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // console.log('Account change received on AccountsPage!', payload);
          fetchAccounts(); 
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAccounts]);

  const handleOpenModal = (account = null) => {
    setCurrentAccount(account);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAccount(null);
    setFormLoading(false);
  };

  const handleSubmitAccount = async (formData) => {
    setFormLoading(true);
    setError('');
    try {
      if (currentAccount && currentAccount.id) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            name: formData.name,
            type: formData.type,
            description: formData.description,
          })
          .eq('id', currentAccount.id)
          .eq('user_id', user.id);
        if (updateError) throw updateError;
        toast.success(t('accountUpdatedSuccess'));
      } else { 
        const { error: insertError } = await supabase
          .from('accounts')
          .insert([{ ...formData, user_id: user.id }]);
        if (insertError) throw insertError;
        toast.success(t('accountCreatedSuccess'));
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error submitting account:', err.message);
      toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`);
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleDeleteAccount = async (accountId) => {
    if (!accountId) return;
    setFormLoading(true); 
    try {
        const { error: deleteError } = await supabase
            .from('accounts')
            .delete()
            .eq('id', accountId)
            .eq('user_id', user.id);
        if (deleteError) {
            if (deleteError.message.includes('violates foreign key constraint')) {
                toast.error(t('accountDeleteFailedTransactionsExist'));
            } else { throw deleteError; }
        } else {
            toast.success(t('accountDeletedSuccess'));
        }
    } catch (err) {
        console.error('Error deleting account:', err.message);
        toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`);
    } finally {
        setFormLoading(false);
        setShowDeleteConfirm(false);
        setAccountToDelete(null);
    }
  };

  const openDeleteConfirm = (account) => {
    setAccountToDelete(account);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setAccountToDelete(null);
    setShowDeleteConfirm(false);
  };

  if (loading && accounts.length === 0 && !error) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <svg className="animate-spin h-10 w-10 text-accent-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary-dark">{t('accounts')}</h1>
        <Button onClick={() => handleOpenModal()} leftIcon={<FiPlus />}>
          {t('addNewAccount')}
        </Button>
      </div>

      {error && !loading && (
        <div className="text-center p-10 bg-navy-light rounded-xl shadow-lg">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchAccounts} className="mt-4" variant="secondary">
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="text-center py-10 px-6 bg-navy-light rounded-xl shadow">
          <FiDollarSign className="mx-auto h-16 w-16 text-slate-blue mb-4" />
          <h3 className="text-xl font-semibold text-text-primary-dark mb-2">{t('noAccountsFoundTitle')}</h3>
          <p className="text-text-secondary-dark mb-6">{t('noAccountsFoundMessage')}</p>
          <Button onClick={() => handleOpenModal()} leftIcon={<FiPlus />}>
            {t('addNewAccount')}
          </Button>
        </div>
      )}

      {!error && accounts.length > 0 && (
        <div className="bg-navy-light shadow-xl rounded-xl overflow-hidden">
          <ul className="divide-y divide-slate-blue">
            {accounts.map(account => (
              <li key={account.id} className="p-4 sm:p-6 hover:bg-navy-deep transition-colors duration-150">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-accent-blue truncate">{account.name}</p>
                    <p className="text-sm text-text-secondary-dark">{t(account.type)} {account.description ? `- ${account.description}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-text-primary-dark">
                      {formatCurrency(account.balance, account.currency, t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}
                    </p>
                    <p className="text-xs text-text-secondary-dark">{getCurrencyDisplay(account.currency, t, 'name')}</p>
                  </div>
                  <div className="flex space-s-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleOpenModal(account)} title={t('edit')}>
                      <FiEdit2 />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => openDeleteConfirm(account)} title={t('delete')}>
                      <FiTrash2 />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentAccount ? t('editAccount') : t('addNewAccount')}
      >
        <AccountForm
          onSubmit={handleSubmitAccount}
          onCancel={handleCloseModal}
          initialData={currentAccount}
          isLoading={formLoading}
        />
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        title={t('confirmDeletionTitle')}
        size="sm"
      >
        <p className="text-text-secondary-dark">
          {t('deleteConfirmationMessage', { name: accountToDelete?.name || '' })}
        </p>
        <div className="flex justify-end space-s-3 pt-5">
          <Button variant="secondary" onClick={closeDeleteConfirm} disabled={formLoading}>
            {t('no')}
          </Button>
          <Button variant="danger" onClick={() => handleDeleteAccount(accountToDelete?.id)} isLoading={formLoading} disabled={formLoading}>
            {t('yesDelete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AccountsPage;
