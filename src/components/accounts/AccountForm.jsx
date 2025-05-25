// src/components/accounts/AccountForm.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../common/Input';
import Button from '../common/Button';
import { CURRENCIES, DEFAULT_CURRENCY } from '../../utils/currencies';

const AccountForm = ({ onSubmit, onCancel, initialData, isLoading }) => {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [initialBalance, setInitialBalance] = useState('0.00');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY.code);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  const accountTypes = [
    { value: 'cash', labelKey: 'cash' },
    { value: 'bank', labelKey: 'bank' },
    { value: 'customer', labelKey: 'customer' },
    { value: 'supplier', labelKey: 'supplier' },
    { value: 'other', labelKey: 'other' },
  ];

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || '');
      // For editing, initialBalance is not directly editable, it's shown for info or managed by transactions.
      // Here, we assume 'initialBalance' field is for *creation* scenario.
      // If initialData has 'balance', that's the current balance, not for this form's 'initialBalance' field when editing.
      setInitialBalance(initialData.initialBalance !== undefined ? String(initialData.initialBalance) : (initialData.balance !== undefined ? String(initialData.balance) : '0.00'));
      setCurrency(initialData.currency || DEFAULT_CURRENCY.code);
      setDescription(initialData.description || '');
    } else {
      // Reset for new form
      setName('');
      setType('');
      setInitialBalance('0.00');
      setCurrency(DEFAULT_CURRENCY.code);
      setDescription('');
    }
  }, [initialData]);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = t('requiredField');
    if (!type.trim()) newErrors.type = t('requiredField');
    if (initialBalance.trim() === '' || isNaN(parseFloat(initialBalance))) {
      newErrors.initialBalance = t('invalidAmountError') || 'Please enter a valid number.';
      // Add "invalidAmountError": "الرجاء إدخال مبلغ صحيح."
    }
    if (!currency) newErrors.currency = t('requiredField');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      type: type.trim(),
      // Only pass initialBalance if it's a new account (no initialData or no id in initialData)
      // For edits, balance is managed by transactions. This form's 'initialBalance' is for creation.
      balance: parseFloat(initialBalance), // For new accounts, this is the starting balance.
      currency,
      description: description.trim(),
      // If editing, pass the id
      ...(initialData && initialData.id && { id: initialData.id }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="accountName"
        label={t('accountName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
        placeholder={t('accountNamePlaceholder') || "E.g., Main Bank Account, Cash on Hand"}
        // Add "accountNamePlaceholder": "مثال: الحساب البنكي الرئيسي، النقدية بالصندوق"
      />
      
      <div>
        <label htmlFor="accountType" className="block text-sm font-medium text-text-secondary-dark mb-1">
          {t('accountType')} <span className="text-red-400">*</span>
        </label>
        <select
          id="accountType"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={`w-full px-3 py-2.5 bg-navy-light border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue text-text-primary-dark ${errors.type ? 'border-red-500 ring-red-500' : 'border-slate-blue'}`}
          required
        >
          <option value="">{t('selectAccountType') || '-- Select Type --'}</option>
          {/* Add "selectAccountType": "-- اختر النوع --" */}
          {accountTypes.map(opt => (
            <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
          ))}
        </select>
        {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type}</p>}
      </div>

      {!initialData?.id && ( // Only show Initial Balance for new accounts
        <Input
          id="initialBalance"
          label={t('initialBalance')}
          type="number"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          step="0.01"
          placeholder="0.00"
          error={errors.initialBalance}
          required
        />
      )}
      
      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-text-secondary-dark mb-1">
          {t('currency')} <span className="text-red-400">*</span>
        </label>
        <select
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={`w-full px-3 py-2.5 bg-navy-light border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue text-text-primary-dark ${errors.currency ? 'border-red-500 ring-red-500' : 'border-slate-blue'}`}
          required
          disabled={!!initialData?.id} // Disable currency change if editing existing account for simplicity now
                                    // (currency conversion for existing balances/transactions is complex)
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{t(c.name_key)} ({c.symbol})</option>
          ))}
        </select>
        {errors.currency && <p className="mt-1 text-xs text-red-400">{errors.currency}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-text-secondary-dark mb-1">
          {t('optionalDescription')}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="3"
          className="w-full px-3 py-2 bg-navy-light border border-slate-blue rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue text-text-primary-dark placeholder-text-secondary-dark"
          placeholder={t('accountDescriptionPlaceholder') || "Any notes about this account..."}
          // Add "accountDescriptionPlaceholder": "أي ملاحظات حول هذا الحساب..."
        ></textarea>
      </div>

      <div className="flex justify-end space-s-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          {t('cancel')}
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
          {initialData ? t('saveChanges') : t('createAccount')}
        </Button>
        {/* Add "saveChanges": "حفظ التغييرات" */}
        {/* Add "createAccount": "إنشاء حساب" */}
      </div>
    </form>
  );
};

export default AccountForm;