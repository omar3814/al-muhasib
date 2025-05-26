import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../common/Input';
import Button from '../common/Button';
// Import HARDCODED_DEFAULT_CURRENCY and getCurrencyDisplayInfo for consistency, though currencies prop is primary
import { HARDCODED_DEFAULT_CURRENCY, getCurrencyDisplayInfo } from '../../utils/currencies'; 

const AccountForm = ({ onSubmit, onCancel, initialData, isLoading, currencies }) => { // Added currencies prop
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [initialBalance, setInitialBalance] = useState('0.00');
  
  // Use the passed 'currencies' prop for the dropdown
  const [availableCurrencies, setAvailableCurrencies] = useState(currencies || []);
  // Initialize currency state
  const [currency, setCurrency] = useState(initialData?.currency || HARDCODED_DEFAULT_CURRENCY.code);


  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  const accountTypes = [ { value: 'cash', labelKey: 'cash' }, { value: 'bank', labelKey: 'bank' }, { value: 'customer', labelKey: 'customer' }, { value: 'supplier', labelKey: 'supplier' }, { value: 'other', labelKey: 'other' }];

  useEffect(() => {
    setAvailableCurrencies(currencies || []); // Update if prop changes
    // If creating a new account and JOD exists in the passed list, default to it.
    if (!initialData && currencies && currencies.length > 0) {
        const jod = currencies.find(c => c.code === 'JOD');
        if (jod) {
            setCurrency(jod.code);
        } else {
            setCurrency(currencies[0].code); // Fallback to the first currency in the dynamic list
        }
    }
  }, [currencies, initialData]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || '');
      setInitialBalance(initialData.initialBalance !== undefined ? String(initialData.initialBalance) : (initialData.balance !== undefined ? String(initialData.balance) : '0.00'));
      setCurrency(initialData.currency || (availableCurrencies.find(c=>c.code === 'JOD')?.code || HARDCODED_DEFAULT_CURRENCY.code) );
      setDescription(initialData.description || '');
    } else {
      setName(''); setType(''); setInitialBalance('0.00'); 
      // Currency is set by the above useEffect based on 'currencies' prop for new forms
      setDescription('');
    }
  }, [initialData, availableCurrencies]);

  const validate = () => { const newErrors = {}; if (!name.trim()) newErrors.name = t('requiredField'); if (!type.trim()) newErrors.type = t('requiredField'); if (initialBalance.trim() === '' || isNaN(parseFloat(initialBalance))) { newErrors.initialBalance = t('invalidAmountError');} if (!currency) newErrors.currency = t('requiredField'); setErrors(newErrors); return Object.keys(newErrors).length === 0; };
  const handleSubmit = (e) => { e.preventDefault(); if (!validate()) return; onSubmit({ name: name.trim(), type: type.trim(), balance: parseFloat(initialBalance), currency, description: description.trim(), ...(initialData && initialData.id && { id: initialData.id }), }); };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input id="accountName" label={t('accountName')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required placeholder={t('accountNamePlaceholder')} />
      <div>
        <label htmlFor="accountType" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('accountType')} <span className="text-nuzum-danger">*</span></label>
        <select id="accountType" value={type} onChange={(e) => setType(e.target.value)} className={`input-style ${errors.type ? 'border-nuzum-danger' : ''}`} required>
          <option value="">{t('selectAccountType')}</option>
          {accountTypes.map(opt => (<option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>))}
        </select>
        {errors.type && <p className="mt-1 text-xs text-nuzum-danger">{errors.type}</p>}
      </div>
      {!initialData?.id && ( <Input id="initialBalance" label={t('initialBalance')} type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} step="0.01" placeholder="0.00" error={errors.initialBalance} required /> )}
      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('currency')} <span className="text-nuzum-danger">*</span></label>
        <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`input-style ${errors.currency ? 'border-nuzum-danger' : ''}`} required disabled={!!initialData?.id}>
          {/* Populate with availableCurrencies received as prop */}
          {(availableCurrencies.length > 0 ? availableCurrencies : [HARDCODED_DEFAULT_CURRENCY]).map(c => {
            const displayInfo = getCurrencyDisplayInfo(c.code, availableCurrencies, t); // Use availableCurrencies here
            return (<option key={c.id || c.code} value={c.code}>{displayInfo.name} ({displayInfo.symbol})</option>);
          })}
        </select>
        {errors.currency && <p className="mt-1 text-xs text-nuzum-danger">{errors.currency}</p>}
      </div>
      <div><label htmlFor="description" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('optionalDescription')}</label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="input-style" placeholder={t('accountDescriptionPlaceholder')}></textarea></div>
      <div className="flex justify-end space-s-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>{t('cancel')}</Button><Button type="submit" variant="accent" isLoading={isLoading} disabled={isLoading}>{initialData?.id ? t('saveChanges') : t('createAccount')}</Button></div>
    </form>
  );
};

export default AccountForm;