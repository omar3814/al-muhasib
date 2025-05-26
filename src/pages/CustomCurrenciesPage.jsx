import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiDollarSign, FiAlertCircle } from 'react-icons/fi';
import { clearCurrencyCache } from '../utils/currencies'; // Import cache clearer

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';

const CustomCurrencyForm = ({ onSubmit, onCancel, initialData, isLoading }) => {
  const { t } = useTranslation('common');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code || '');
      setName(initialData.name || '');
      setSymbol(initialData.symbol || '');
    } else {
      setCode(''); setName(''); setSymbol('');
    }
  }, [initialData]);

  const validate = () => {
    const newErrors = {};
    if (!code.trim()) newErrors.code = t('requiredField');
    else if (code.trim().length > 10) newErrors.code = t('currencyCodeTooLong');
    if (!name.trim()) newErrors.name = t('requiredField');
    if (!symbol.trim()) newErrors.symbol = t('requiredField');
    else if (symbol.trim().length > 10) newErrors.symbol = t('currencySymbolTooLong');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      symbol: symbol.trim(),
      is_custom: true,
      ...(initialData && initialData.id && { id: initialData.id }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input id="customCurrencyCode" label={t('currencyCodeLabel')} value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} required maxLength={10} placeholder="ABC" />
      <Input id="customCurrencyName" label={t('currencyNameLabel')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required placeholder={t('currencyNamePlaceholder')} />
      <Input id="customCurrencySymbol" label={t('currencySymbolLabel')} value={symbol} onChange={(e) => setSymbol(e.target.value)} error={errors.symbol} required maxLength={10} placeholder="$"/>
      <div className="flex justify-end space-s-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>{t('cancel')}</Button>
        <Button type="submit" variant="accent" isLoading={isLoading} disabled={isLoading}>{initialData?.id ? t('saveChanges') : t('addCurrency')}</Button>
      </div>
    </form>
  );
};

const CustomCurrenciesPage = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [customCurrencies, setCustomCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currencyToDelete, setCurrencyToDelete] = useState(null);

  const fetchCustomCurrencies = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const { data, error: fetchError } = await supabase.from('currencies').select('*').eq('user_id', user.id).eq('is_custom', true).order('code', { ascending: true });
      if (fetchError) throw fetchError;
      setCustomCurrencies(data || []);
    } catch (err) { setError(t('errorFetchingCustomCurrencies')); toast.error(t('errorFetchingCustomCurrencies')); } 
    finally { setLoading(false); }
  }, [user, t]);

  useEffect(() => { fetchCustomCurrencies(); }, [fetchCustomCurrencies]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`public:currencies:user_id=eq.${user.id}_custom`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'currencies', filter: `user_id=eq.${user.id}` }, 
        (payload) => { 
            fetchCustomCurrencies(); 
            clearCurrencyCache(); // Clear cache on any change to user's currencies
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchCustomCurrencies]);

  const handleOpenModal = (currency = null) => { setCurrentCurrency(currency); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setCurrentCurrency(null); setFormLoading(false); };

  const handleSubmitCurrency = async (formData) => {
    setFormLoading(true);
    try {
      if (currentCurrency?.id) {
        const { error: uError } = await supabase.from('currencies').update({ code: formData.code, name: formData.name, symbol: formData.symbol }).eq('id', currentCurrency.id).eq('user_id', user.id);
        if (uError) throw uError;
        toast.success(t('currencyUpdatedSuccess'));
      } else {
        const { error: iError } = await supabase.from('currencies').insert([{ ...formData, user_id: user.id, is_custom: true }]);
        if (iError) {
            if (iError.message.includes('duplicate key value violates unique constraint "unique_user_custom_currency_code_idx"')) {
                toast.error(t('currencyCodeExistsError'));
            } else { throw iError; }
        } else { toast.success(t('currencyAddedSuccess')); }
      }
      clearCurrencyCache(); // Clear cache after add/update
      handleCloseModal();
    } catch (err) { toast.error(t('operationFailed') + `: ${err.message}`); } 
    finally { setFormLoading(false); }
  };

  const handleDeleteCurrency = async (currencyId) => {
    if (!currencyId) return;
    setFormLoading(true);
    try {
      // Check if currency is in use (simplified check - production needs more robust check across tables)
      const { data: accountsUsing, error: accCheckError } = await supabase.from('accounts').select('id').eq('currency', currencyToDelete?.code).eq('user_id', user.id).limit(1);
      if(accCheckError) throw accCheckError;
      if(accountsUsing && accountsUsing.length > 0) {
        toast.error(t('currencyInUseAccountsError') || 'Cannot delete: Currency is in use by one or more accounts.');
        // Add "currencyInUseAccountsError": "لا يمكن الحذف: العملة مستخدمة في حساب واحد أو أكثر."
        setFormLoading(false); setShowDeleteConfirm(false); setCurrencyToDelete(null); return;
      }
      // Add similar checks for materials and transactions tables if they store currency codes

      const { error: dError } = await supabase.from('currencies').delete().eq('id', currencyId).eq('user_id', user.id).eq('is_custom', true);
      if (dError) throw dError;
      clearCurrencyCache(); // Clear cache after delete
      toast.success(t('currencyDeletedSuccess'));
    } catch (err) { toast.error(t('operationFailed') + `: ${err.message}`); } 
    finally { setFormLoading(false); setShowDeleteConfirm(false); setCurrencyToDelete(null); }
  };
  const openDeleteConfirm = (currency) => { setCurrencyToDelete(currency); setShowDeleteConfirm(true); };
  const closeDeleteConfirm = () => { setCurrencyToDelete(null); setShowDeleteConfirm(false); };

  if (loading && customCurrencies.length === 0 && !error) { return <div className="flex justify-center items-center h-[calc(100vh-250px)]"><FiDollarSign className="animate-pulse h-12 w-12 text-nuzum-accent-primary"/></div>; }

  return (
    <div className="space-y-8">
      <div className="bg-nuzum-surface p-5 sm:p-6 rounded-xl shadow-card flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-nuzum-text-primary">{t('customCurrencies')}</h1>
          <p className="text-sm text-nuzum-text-secondary mt-1">{t('manageYourCustomCurrencies')}</p>
        </div>
        <Button onClick={() => handleOpenModal()} leftIcon={<FiPlus />} variant="accent">{t('addCustomCurrency')}</Button>
      </div>

      <div className="bg-nuzum-surface rounded-xl shadow-card">
        {error && !loading && ( <div className="p-10 text-center"> <FiAlertCircle className="mx-auto h-12 w-12 text-nuzum-danger mb-4" /> <p className="text-nuzum-danger">{error}</p> <Button onClick={fetchCustomCurrencies} className="mt-6" variant="secondary">{t('retry')}</Button> </div> )}
        {!loading && !error && customCurrencies.length === 0 && ( <div className="text-center py-16 px-6"> <FiDollarSign className="mx-auto h-16 w-16 text-nuzum-text-secondary mb-6" /> <h3 className="text-2xl font-semibold text-nuzum-text-primary mb-3">{t('noCustomCurrenciesFound')}</h3> <p className="text-nuzum-text-secondary mb-8">{t('addYourFirstCustomCurrency')}</p> <Button onClick={() => handleOpenModal()} leftIcon={<FiPlus />} variant="accent" size="lg">{t('addCustomCurrency')}</Button> </div> )}
        {!error && customCurrencies.length > 0 && (
          <ul className="divide-y divide-nuzum-border">
            {customCurrencies.map(curr => (
              <li key={curr.id} className="p-4 sm:p-5 hover:bg-nuzum-border/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-nuzum-text-primary truncate">{curr.name} <span className="text-nuzum-text-secondary">({curr.code})</span></p>
                    <p className="text-sm text-nuzum-text-secondary">{t('symbol')}: {curr.symbol}</p>
                  </div>
                  <div className="flex space-s-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(curr)} title={t('edit')}><FiEdit2 className="w-4 h-4"/></Button>
                    <Button size="sm" variant="ghost" onClick={() => openDeleteConfirm(curr)} title={t('delete')} className="text-nuzum-danger hover:bg-red-500/10"><FiTrash2 className="w-4 h-4"/></Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentCurrency ? t('editCustomCurrency') : t('addCustomCurrency')} size="md">
        <CustomCurrencyForm onSubmit={handleSubmitCurrency} onCancel={handleCloseModal} initialData={currentCurrency} isLoading={formLoading}/>
      </Modal>
      <Modal isOpen={showDeleteConfirm} onClose={closeDeleteConfirm} title={t('confirmDeletionTitle')} size="sm">
        <p className="text-nuzum-text-secondary">{t('deleteConfirmationMessage', { name: currencyToDelete?.name || '' })}</p>
        <div className="flex justify-end space-s-3 pt-5">
          <Button variant="secondary" onClick={closeDeleteConfirm} disabled={formLoading}>{t('no')}</Button>
          <Button variant="danger" onClick={() => handleDeleteCurrency(currencyToDelete?.id)} isLoading={formLoading} disabled={formLoading}>{t('yesDelete')}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default CustomCurrenciesPage;