import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../common/Input';
import Button from '../common/Button';
import { HARDCODED_DEFAULT_CURRENCY, getCurrencyDisplayInfo } from '../../utils/currencies';

const DebtForm = ({ onSubmit, onCancel, initialData, isLoading, currencies = [] }) => {
  const { t } = useTranslation('common');

  const [name, setName] = useState('');
  const [type, setType] = useState('i_owe'); // 'i_owe' or 'owed_to_me'
  const [partyName, setPartyName] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [currency, setCurrency] = useState(HARDCODED_DEFAULT_CURRENCY.code);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active'); // Default status
  const [errors, setErrors] = useState({});

  const debtTypes = [
    { value: 'i_owe', labelKey: 'iOwe' },         // Add "iOwe": "أنا مدين (دين علي)"
    { value: 'owed_to_me', labelKey: 'owedToMe' } // Add "owedToMe": "مدين لي (دين لي)"
  ];

  const debtStatuses = [ // Basic statuses for now
    { value: 'active', labelKey: 'active' },       // Add "active": "نشط"
    { value: 'partially_paid', labelKey: 'partiallyPaid' }, // Add "partiallyPaid": "مدفوع جزئياً"
    { value: 'paid', labelKey: 'paidFull' },         // Add "paidFull": "مدفوع بالكامل"
    // { value: 'defaulted', labelKey: 'defaulted' } // Optional
  ];


  useEffect(() => {
    if (currencies && currencies.length > 0 && !initialData) {
        const jod = currencies.find(c => c.code === 'JOD');
        setCurrency(jod ? jod.code : currencies[0].code);
    }
  }, [currencies, initialData]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || 'i_owe');
      setPartyName(initialData.party_name || '');
      setInitialAmount(String(initialData.initial_amount || ''));
      setCurrency(initialData.currency || (currencies.find(c=>c.code === 'JOD')?.code || HARDCODED_DEFAULT_CURRENCY.code));
      setDueDate(initialData.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '');
      setNotes(initialData.notes || '');
      setStatus(initialData.status || 'active');
    } else {
      setName('');
      setType('i_owe');
      setPartyName('');
      setInitialAmount('');
      if (currencies && currencies.length > 0) { // Set default for new form
          const jodOrDefault = currencies.find(c => c.code === 'JOD') || currencies[0];
          setCurrency(jodOrDefault.code);
      } else {
          setCurrency(HARDCODED_DEFAULT_CURRENCY.code);
      }
      setDueDate('');
      setNotes('');
      setStatus('active');
    }
  }, [initialData, currencies]);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = t('requiredField');
    if (!type) newErrors.type = t('requiredField');
    if (!partyName.trim()) newErrors.partyName = t('requiredField');
    if (!initialAmount.trim() || isNaN(parseFloat(initialAmount)) || parseFloat(initialAmount) <= 0) {
      newErrors.initialAmount = t('invalidAmountPositiveError');
    }
    if (!currency) newErrors.currency = t('requiredField');
    if (!status) newErrors.status = t('requiredField');
    // Due date is optional
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const amountValue = parseFloat(initialAmount);
    onSubmit({
      name: name.trim(),
      type: type,
      party_name: partyName.trim(),
      initial_amount: amountValue,
      currency: currency,
      current_balance_owed: initialData?.id ? initialData.current_balance_owed : amountValue, // For new, balance is initial amount
      due_date: dueDate || null,
      status: status,
      notes: notes.trim(),
      ...(initialData && initialData.id && { id: initialData.id }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input id="debtName" label={t('debtName') || 'Debt Name / Description'} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required placeholder={t('egLoanFromBank') || "e.g., Loan from Bank X, Personal Loan to Friend"}/>
      {/* Add "debtName": "اسم الدين / الوصف" */}
      {/* Add "egLoanFromBank": "مثال: قرض من بنك س، قرض شخصي لصديق" */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="debtType" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('debtType') || 'Debt Type'} <span className="text-nuzum-danger">*</span></label>
          {/* Add "debtType": "نوع الدين" */}
          <select id="debtType" value={type} onChange={(e) => setType(e.target.value)} className={`input-style ${errors.type ? 'border-nuzum-danger' : ''}`} required>
            {debtTypes.map(opt => (<option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>))}
          </select>
          {errors.type && <p className="mt-1 text-xs text-nuzum-danger">{errors.type}</p>}
        </div>
        <Input id="partyName" label={t('otherPartyName') || 'Other Party Name'} value={partyName} onChange={(e) => setPartyName(e.target.value)} error={errors.partyName} required placeholder={t('egBankNameFriendName') || "e.g., Bank Name, Friend's Name"}/>
        {/* Add "otherPartyName": "اسم الطرف الآخر" */}
        {/* Add "egBankNameFriendName": "مثال: اسم البنك، اسم الصديق" */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input id="initialAmount" label={t('initialAmount') || 'Initial Amount'} type="number" value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)} error={errors.initialAmount} required step="0.01" min="0.01" placeholder="0.00" />
        {/* Add "initialAmount": "المبلغ الأولي" */}
        <div>
          <label htmlFor="debtCurrency" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('currency')} <span className="text-nuzum-danger">*</span></label>
          <select id="debtCurrency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`input-style ${errors.currency ? 'border-nuzum-danger' : ''}`} required >
            {(currencies.length > 0 ? currencies : [HARDCODED_DEFAULT_CURRENCY]).map(c => { const displayInfo = getCurrencyDisplayInfo(c.code, currencies, t); return (<option key={c.id || c.code} value={c.code}>{displayInfo.name} ({displayInfo.symbol})</option>); })}
          </select>
          {errors.currency && <p className="mt-1 text-xs text-nuzum-danger">{errors.currency}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Input id="dueDate" label={t('dueDateOptional') || 'Due Date (Optional)'} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={errors.dueDate} />
         {/* Add "dueDateOptional": "تاريخ الاستحقاق (اختياري)" */}
        <div>
          <label htmlFor="debtStatus" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('status')} <span className="text-nuzum-danger">*</span></label>
          <select id="debtStatus" value={status} onChange={(e) => setStatus(e.target.value)} className={`input-style ${errors.status ? 'border-nuzum-danger' : ''}`} required>
            {debtStatuses.map(s => (<option key={s.value} value={s.value}>{t(s.labelKey)}</option>))}
          </select>
          {errors.status && <p className="mt-1 text-xs text-nuzum-danger">{errors.status}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="debtNotes" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('notes')} ({t('optional')})</label>
        <textarea id="debtNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" className="input-style" placeholder={t('debtNotesPlaceholder') || "Any details about this debt..."} />
        {/* Add "debtNotesPlaceholder": "أي تفاصيل حول هذا الدين..." */}
      </div>

      <div className="flex justify-end space-s-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>{t('cancel')}</Button>
        <Button type="submit" variant="accent" isLoading={isLoading} disabled={isLoading}>{initialData?.id ? t('saveChanges') : t('addDebt')}</Button>
        {/* Add "addDebt": "إضافة دين" */}
      </div>
    </form>
  );
};

export default DebtForm;