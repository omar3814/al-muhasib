import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';
import { CURRENCIES, DEFAULT_CURRENCY } from '../../utils/currencies';
import toast from 'react-hot-toast';

const TransactionForm = ({ onSubmit, onCancel, initialData, isLoading }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  const [type, setType] = useState('expense'); // 'income' or 'expense'
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY.code);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [materialId, setMaterialId] = useState(''); // Optional
  const [materialQuantity, setMaterialQuantity] = useState(''); // Optional, for stock change

  const [accounts, setAccounts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [errors, setErrors] = useState({});

  // Fetch accounts and materials for dropdowns
  const fetchDataForDropdowns = useCallback(async () => {
    if (!user) return;
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, currency') // Fetch currency to potentially pre-select transaction currency
        .eq('user_id', user.id);
      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('id, name, unit_type')
        .eq('user_id', user.id);
      if (materialsError) throw materialsError;
      setMaterials(materialsData || []);

    } catch (error) {
      console.error("Error fetching data for transaction form:", error.message);
      toast.error(t('errorFetchingDropdownData') || "Could not load data for form.");
      // Add "errorFetchingDropdownData": "تعذر تحميل البيانات للنموذج."
    }
  }, [user, t]);

  useEffect(() => {
    fetchDataForDropdowns();
  }, [fetchDataForDropdowns]);

  useEffect(() => {
    if (initialData) {
      // Prefill form if editing (basic support for now, complex edits need care)
      setType(initialData.type || 'expense');
      setAmount(String(initialData.amount || ''));
      setCurrency(initialData.currency || DEFAULT_CURRENCY.code);
      setDate(initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setNotes(initialData.notes || '');
      setAccountId(initialData.account_id || '');
      setMaterialId(initialData.material_id || '');
      setMaterialQuantity(String(initialData.material_quantity_affected || ''));
    } else {
        // Reset for new form
        setType('expense');
        setAmount('');
        setCurrency(DEFAULT_CURRENCY.code);
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setAccountId('');
        setMaterialId('');
        setMaterialQuantity('');
    }
  }, [initialData]);
  
  // When account is selected, update the transaction currency to match the account's currency
  useEffect(() => {
    if(accountId && accounts.length > 0) {
        const selectedAccount = accounts.find(acc => acc.id === accountId);
        if (selectedAccount && selectedAccount.currency) {
            setCurrency(selectedAccount.currency);
        }
    }
  }, [accountId, accounts]);


  const validate = () => {
    const newErrors = {};
    if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = t('invalidAmountPositiveError') || 'Please enter a valid positive amount.';
      // Add "invalidAmountPositiveError": "الرجاء إدخال مبلغ صحيح وموجب."
    }
    if (!date) newErrors.date = t('requiredField');
    if (!accountId) newErrors.accountId = t('selectAccountError') || 'Please select an account.';
    // Add "selectAccountError": "الرجاء اختيار حساب."
    
    if (materialId) { // If a material is selected, quantity is required
        if (materialQuantity.trim() === '' || isNaN(parseInt(materialQuantity)) || parseInt(materialQuantity) === 0) {
            newErrors.materialQuantity = t('invalidMaterialQuantityError') || 'Please enter a valid quantity for the material.';
            // Add "invalidMaterialQuantityError": "الرجاء إدخال كمية صالحة للمادة."
        }
    } else if (materialQuantity.trim() !== '') { // If quantity is entered, material must be selected
        newErrors.materialId = t('selectMaterialForQuantityError') || 'Please select a material if specifying quantity.';
        // Add "selectMaterialForQuantityError": "الرجاء اختيار مادة إذا تم تحديد الكمية."
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const selectedMaterial = materials.find(m => m.id === materialId);
    
    // For expenses involving material, quantity is negative. For income, positive.
    // This simple logic assumes "selling" is income, "buying/using" is expense.
    // Adjust if your accounting model is different (e.g. cost of goods sold for income).
    let finalMaterialQuantityAffected = materialId ? parseInt(materialQuantity) : null;
    if (materialId && finalMaterialQuantityAffected !== null) {
        if (type === 'expense') {
            finalMaterialQuantityAffected = -Math.abs(finalMaterialQuantityAffected); // Selling material
        } else if (type === 'income') {
             finalMaterialQuantityAffected = Math.abs(finalMaterialQuantityAffected); // Buying/Adding material
        }
    }


    onSubmit({
      type,
      amount: parseFloat(amount),
      currency,
      date,
      notes: notes.trim(),
      account_id: accountId,
      material_id: materialId || null, // Ensure null if empty
      material_quantity_affected: finalMaterialQuantityAffected,
      ...(initialData && initialData.id && { id: initialData.id }),
    });
  };
  
  const selectedMaterialUnit = materialId ? materials.find(m => m.id === materialId)?.unit_type : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="transactionType" className="block text-sm font-medium text-text-secondary-dark mb-1">
            {t('transactionType')} <span className="text-red-400">*</span>
          </label>
          <select
            id="transactionType"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2.5 bg-navy-light border border-slate-blue rounded-lg"
          >
            <option value="expense">{t('expense')}</option>
            <option value="income">{t('income')}</option>
          </select>
        </div>
        <Input
          id="date"
          label={t('date')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="amount"
          label={t('amount')}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.01"
          min="0.01"
          placeholder="0.00"
          error={errors.amount}
          required
        />
         <div>
          <label htmlFor="transactionCurrency" className="block text-sm font-medium text-text-secondary-dark mb-1">
            {t('currency')} <span className="text-red-400">*</span>
          </label>
          <select
            id="transactionCurrency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`w-full px-3 py-2.5 bg-navy-light border rounded-lg shadow-sm ${errors.currency ? 'border-red-500' : 'border-slate-blue'}`}
            required
            disabled // Currency is now derived from selected account
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{t(c.name_key)} ({c.symbol})</option>
            ))}
          </select>
          {errors.currency && <p className="mt-1 text-xs text-red-400">{errors.currency}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="accountId" className="block text-sm font-medium text-text-secondary-dark mb-1">
          {t('linkedAccount')} <span className="text-red-400">*</span>
        </label>
        <select
          id="accountId"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={`w-full px-3 py-2.5 bg-navy-light border rounded-lg shadow-sm ${errors.accountId ? 'border-red-500' : 'border-slate-blue'}`}
          required
        >
          <option value="">{t('selectAccount')}</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name} ({t(acc.currency.toLowerCase()) || acc.currency})</option>
          ))}
        </select>
        {errors.accountId && <p className="mt-1 text-xs text-red-400">{errors.accountId}</p>}
      </div>
      
      <hr className="border-slate-blue my-6"/>

      <p className="text-sm font-medium text-text-secondary-dark -mb-2">{t('optionalMaterialSection') || 'Material Details (Optional)'}</p>
      {/* Add "optionalMaterialSection": "تفاصيل المادة (اختياري)" */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="materialId" className="block text-sm font-medium text-text-secondary-dark mb-1">
            {t('linkedMaterial')}
          </label>
          <select
            id="materialId"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className={`w-full px-3 py-2.5 bg-navy-light border rounded-lg shadow-sm ${errors.materialId ? 'border-red-500' : 'border-slate-blue'}`}
          >
            <option value="">{t('selectMaterialOptional') || '-- Select Material (Optional) --'}</option>
             {/* Add "selectMaterialOptional": "-- اختر المادة (اختياري) --" */}
            {materials.map(mat => (
              <option key={mat.id} value={mat.id}>{mat.name}</option>
            ))}
          </select>
          {errors.materialId && <p className="mt-1 text-xs text-red-400">{errors.materialId}</p>}
        </div>
        <Input
            id="materialQuantity"
            label={`${t('quantity')} ${selectedMaterialUnit ? `(${t(selectedMaterialUnit.toLowerCase()) || selectedMaterialUnit})` : ''}`}
            type="number"
            value={materialQuantity}
            onChange={(e) => setMaterialQuantity(e.target.value)}
            step="1"
            placeholder="0"
            error={errors.materialQuantity}
            disabled={!materialId} // Only enable if a material is selected
          />
      </div>

      <hr className="border-slate-blue my-6"/>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-text-secondary-dark mb-1">
          {t('notes')} ({t('optional')})
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="3"
          className="w-full px-3 py-2 bg-navy-light border border-slate-blue rounded-lg shadow-sm"
          placeholder={t('transactionNotesPlaceholder') || "E.g., Payment for services, Purchase of office supplies"}
          // Add "transactionNotesPlaceholder": "مثال: دفعة مقابل خدمات، شراء لوازم مكتبية"
        ></textarea>
      </div>

      <div className="flex justify-end space-s-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          {t('cancel')}
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
          {initialData ? t('saveChanges') : t('addTransaction')}
        </Button>
        {/* Add "addTransaction": "إضافة معاملة" */}
      </div>
    </form>
  );
};

export default TransactionForm;