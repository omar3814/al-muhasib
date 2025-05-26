import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../common/Input';
import Button from '../common/Button';
import { formatCurrency, getCurrencyDisplayInfo } from '../../utils/currencies'; // No need for getAllCurrencies here, parent passes them

const DebtPaymentForm = ({ onSubmit, onCancel, isLoading, debt, accounts, availableCurrencies }) => {
  const { t, i18n } = useTranslation('common');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [errors, setErrors] = useState({});

  const [paymentAccountDetails, setPaymentAccountDetails] = useState(null);

  useEffect(() => {
    if (paymentAccountId && accounts) {
      setPaymentAccountDetails(accounts.find(acc => acc.id === paymentAccountId) || null);
    } else {
      setPaymentAccountDetails(null);
    }
  }, [paymentAccountId, accounts]);
  
  // Filter accounts to match the debt's currency
  const suitableAccounts = accounts.filter(acc => acc.currency === debt?.currency);

  const validate = () => {
    const newErrors = {};
    const amount = parseFloat(paymentAmount);
    const balanceOwed = parseFloat(debt.current_balance_owed);

    if (!paymentAccountId) newErrors.paymentAccountId = t('selectAccountError');
    if (!paymentAmount.trim() || isNaN(amount) || amount <= 0) {
      newErrors.paymentAmount = t('invalidAmountPositiveError');
    } else if (amount > balanceOwed) {
      newErrors.paymentAmount = t('paymentExceedsDebtError') || 'Payment cannot exceed the amount owed.';
      // Add "paymentExceedsDebtError": "لا يمكن أن يتجاوز الدفع المبلغ المستحق."
    }
    
    if (debt.type === 'i_owe' && paymentAccountDetails && amount > parseFloat(paymentAccountDetails.balance)) {
        newErrors.paymentAmount = t('insufficientFundsInPaymentAccountError') || 'Insufficient funds in the selected payment account.';
        // Add "insufficientFundsInPaymentAccountError": "رصيد غير كاف في حساب الدفع المحدد."
    }

    if (!paymentDate) newErrors.paymentDate = t('requiredField');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      debtId: debt.id,
      debtType: debt.type,
      debtName: debt.name,
      amount: parseFloat(paymentAmount),
      currency: debt.currency, // Payment is in the debt's currency
      accountId: paymentAccountId,
      date: paymentDate,
      notes: paymentNotes.trim(),
      current_balance_owed: parseFloat(debt.current_balance_owed) // Pass current balance for calculation
    });
  };

  if (!debt) return null; // Should not happen if modal is opened correctly

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-sm text-nuzum-text-secondary">{t('debtRecord') || 'Debt Record'}: <span className="font-semibold text-nuzum-text-primary">{debt.name}</span></p>
        {/* Add "debtRecord": "سجل الدين" */}
        <p className="text-sm text-nuzum-text-secondary">{t('currentAmountOwed') || 'Current Amount Owed'}: <span className="font-semibold text-nuzum-text-primary">{formatCurrency(debt.current_balance_owed, debt.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</span></p>
         {/* Add "currentAmountOwed": "المبلغ الحالي المستحق" */}
      </div>

      <hr className="border-nuzum-border" />

      <div>
        <label htmlFor="paymentAccountId" className="block text-sm font-medium text-nuzum-text-secondary mb-1">
          {debt.type === 'i_owe' ? t('payFromAccount') : t('receiveToAccount')} <span className="text-nuzum-danger">*</span>
        </label>
        {/* Add "payFromAccount": "الدفع من حساب" */}
        {/* Add "receiveToAccount": "الاستلام إلى حساب" */}
        <select
          id="paymentAccountId"
          value={paymentAccountId}
          onChange={(e) => setPaymentAccountId(e.target.value)}
          className={`input-style ${errors.paymentAccountId ? 'border-nuzum-danger' : ''}`}
          required
        >
          <option value="">{t('selectAccount')}</option>
          {suitableAccounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({formatCurrency(acc.balance, acc.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)})
            </option>
          ))}
        </select>
        {errors.paymentAccountId && <p className="mt-1 text-xs text-nuzum-danger">{errors.paymentAccountId}</p>}
        {suitableAccounts.length === 0 && <p className="mt-1 text-xs text-nuzum-text-secondary">{t('noAccountsMatchDebtCurrency') || "No accounts match the debt's currency."}</p>}
        {/* Add "noAccountsMatchDebtCurrency": "لا توجد حسابات تطابق عملة الدين." */}
      </div>
      
      <Input
        id="paymentAmount"
        label={t('paymentAmount') || 'Payment Amount'}
        // Add "paymentAmount": "مبلغ الدفع"
        type="number"
        value={paymentAmount}
        onChange={(e) => setPaymentAmount(e.target.value)}
        error={errors.paymentAmount}
        required
        step="0.01"
        min="0.01"
        placeholder="0.00"
        inputClassName={paymentAccountDetails && debt.type === 'i_owe' && parseFloat(paymentAmount) > parseFloat(paymentAccountDetails.balance) ? '!border-nuzum-danger' : ''}
      />
      {paymentAccountDetails && debt.type === 'i_owe' && (
        <p className={`text-xs -mt-3 ${parseFloat(paymentAmount) > parseFloat(paymentAccountDetails.balance) ? 'text-nuzum-danger' : 'text-nuzum-text-secondary'}`}>
            {t('availableBalance')}: {formatCurrency(paymentAccountDetails.balance, paymentAccountDetails.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}
        </p>
      )}


      <Input
        id="paymentDate"
        label={t('paymentDate') || "Date of Payment"}
        // Add "paymentDate": "تاريخ الدفع"
        type="date"
        value={paymentDate}
        onChange={(e) => setPaymentDate(e.target.value)}
        error={errors.paymentDate}
        required
      />
      
      <div>
        <label htmlFor="paymentNotes" className="block text-sm font-medium text-nuzum-text-secondary mb-1">
          {t('notes')} ({t('optional')})
        </label>
        <textarea
          id="paymentNotes"
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
          rows="3"
          className="input-style"
          placeholder={t('paymentNotesPlaceholder') || "e.g., Part payment, Full settlement"}
          // Add "paymentNotesPlaceholder": "مثال: دفعة جزئية، تسوية كاملة"
        ></textarea>
      </div>

      <div className="flex justify-end space-s-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          {t('cancel')}
        </Button>
        <Button type="submit" variant="accent" isLoading={isLoading} disabled={isLoading}>
          {t('recordPayment') || 'Record Payment'}
        </Button>
        {/* Add "recordPayment": "تسجيل الدفعة" */}
      </div>
    </form>
  );
};

export default DebtPaymentForm;