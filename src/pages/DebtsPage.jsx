import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiAlertCircle, FiThumbsUp, FiThumbsDown, FiCalendar, FiDollarSign, FiCreditCard, FiList } from 'react-icons/fi';

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import DebtForm from '../components/debts/DebtForm';
import DebtPaymentForm from '../components/debts/DebtPaymentForm';
import { formatCurrency, getAllCurrenciesForUser, getCurrencyDisplayInfo, clearCurrencyCache, HARDCODED_DEFAULT_CURRENCY } from '../utils/currencies';

const DebtsPage = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentDebt, setCurrentDebt] = useState(null); 
  
  const [formLoading, setFormLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState(null);

  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (!user) return;
    const loadInitialData = async () => {
        try {
            const [currData, accData] = await Promise.all([
                getAllCurrenciesForUser(user.id),
                supabase.from('accounts').select('id, name, currency, balance').eq('user_id', user.id).order('name', { ascending: true })
            ]);
            setAvailableCurrencies(currData || []);
            if(accData.error) throw accData.error;
            setAccounts(accData.data || []);
        } catch (err) {
            console.error("DebtsPage: Error fetching initial data for forms:", err);
            toast.error(t('errorFetchingDropdownData'));
        }
    };
    loadInitialData();
  }, [user, t]);

  const fetchDebts = useCallback(async () => { if (!user) { setLoading(false); return; } setLoading(true); setError(''); try { const { data, error: fetchError } = await supabase.from('debts').select('*').eq('user_id', user.id).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }); if (fetchError) throw fetchError; setDebts(data || []); } catch (err) { setError(t('errorFetchingDebts')); } finally { setLoading(false); }}, [user, t]);
  useEffect(() => { fetchDebts(); }, [fetchDebts]);
  useEffect(() => { if (!user) return; const channel = supabase.channel('public:debts_page_v5').on('postgres_changes', { event: '*', schema: 'public', table: 'debts', filter: `user_id=eq.${user.id}` }, (payload) => { fetchDebts(); clearCurrencyCache(); }).on('postgres_changes', {event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}`}, () => { if(user) getAllCurrenciesForUser(user.id).then(setAvailableCurrencies); fetchDebts(); }).subscribe(); return () => { supabase.removeChannel(channel); }; }, [user, fetchDebts]);
  
  const handleOpenDebtModal = (debt = null) => { setCurrentDebt(debt); setIsDebtModalOpen(true); };
  const handleCloseDebtModal = () => { setIsDebtModalOpen(false); setCurrentDebt(null); setFormLoading(false); };
  
  const handleOpenPaymentModal = (debtToPay) => { setCurrentDebt(debtToPay); setIsPaymentModalOpen(true); };
  const handleClosePaymentModal = () => { setIsPaymentModalOpen(false); setCurrentDebt(null); setFormLoading(false); };

  const handleSubmitDebt = async (formData) => { setFormLoading(true); try { if (currentDebt?.id) { const { current_balance_owed, ...updateData } = formData; const { error: uErr } = await supabase.from('debts').update(updateData).eq('id', currentDebt.id).eq('user_id', user.id); if (uErr) throw uErr; toast.success(t('debtUpdatedSuccess')); } else { const { error: iErr } = await supabase.from('debts').insert([{ ...formData, user_id: user.id }]).select().single(); if (iErr) { if (iErr.message.includes('duplicate key value violates unique constraint')) { toast.error(t('debtNameExistsError')); } else { throw iErr; } } else { toast.success(t('debtAddedSuccess')); }} clearCurrencyCache(); handleCloseDebtModal(); } catch (err) { toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); }};
  const handleDeleteDebt = async (debtId) => { if (!debtId) return; setFormLoading(true); try { const { data: linkedTransactions, error: checkError } = await supabase.from('transactions').select('id').or(`notes.ilike.%debt_ref_${debtId}%,notes.ilike.%دين_مرجع_${debtId}%`).limit(1); if (checkError) throw checkError; if (linkedTransactions && linkedTransactions.length > 0) { toast.error(t('debtDeleteFailedTransactionsExist')); setFormLoading(false); setShowDeleteConfirm(false); setDebtToDelete(null); return; } const { error: dErr } = await supabase.from('debts').delete().eq('id', debtId).eq('user_id', user.id); if (dErr) throw dErr; clearCurrencyCache(); toast.success(t('debtDeletedSuccess')); } catch (err) { toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); setShowDeleteConfirm(false); setDebtToDelete(null); }};
  
  const handleSubmitDebtPayment = async (paymentData) => {
    setFormLoading(true);
    // currentDebt is the debt object for which the payment modal was opened
    if (!currentDebt || !currentDebt.id) {
        toast.error("Error: Debt details not found for payment.");
        setFormLoading(false);
        return;
    }

    try {
        const { amount, currency, accountId, date, notes } = paymentData;
        
        // Validate if the account selected for payment has the same currency as the debt
        const paymentAccount = accounts.find(acc => acc.id === accountId);
        if (!paymentAccount || paymentAccount.currency !== currentDebt.currency) {
            toast.error(t('paymentAccountCurrencyMismatch') || "Payment account currency must match debt currency.");
            // Add "paymentAccountCurrencyMismatch": "يجب أن تتطابق عملة حساب الدفع مع عملة الدين."
            setFormLoading(false);
            return;
        }
        
        // Create Transaction
        const transactionType = currentDebt.type === 'i_owe' ? 'expense' : 'income';
        const transactionNotes = `${t(currentDebt.type === 'i_owe' ? 'paymentForDebt' : 'paymentReceivedForDebt')} "${currentDebt.name}"${notes ? ` - ${notes}` : ''} (Ref: debt_${currentDebt.id})`;
        
        const { data: newTransaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: user.id,
                type: transactionType,
                amount: amount,
                currency: currentDebt.currency, // Use debt's currency for the transaction
                date: new Date(date).toISOString(),
                notes: transactionNotes,
                account_id: accountId,
            })
            .select()
            .single();
        if (txError) throw txError;

        // Update Account Balance
        let newAccountBalance = parseFloat(paymentAccount.balance);
        if (transactionType === 'expense') {
            newAccountBalance -= amount;
        } else { 
            newAccountBalance += amount;
        }
        const { error: accUpdateError } = await supabase
            .from('accounts')
            .update({ balance: newAccountBalance.toFixed(2) })
            .eq('id', accountId);
        if (accUpdateError) throw accUpdateError;

        // Update Debt Balance and Status
        const newDebtBalanceOwed = parseFloat(currentDebt.current_balance_owed) - amount;
        let newDebtStatus = currentDebt.status;
        
        if (newDebtBalanceOwed <= 0) {
            newDebtStatus = 'paid';
        } else if (newDebtBalanceOwed < parseFloat(currentDebt.initial_amount)) {
            newDebtStatus = 'partially_paid';
        } else {
            newDebtStatus = 'active'; // Should not happen if payment reduces balance
        }

        const { error: debtUpdateError } = await supabase
            .from('debts')
            .update({ current_balance_owed: newDebtBalanceOwed.toFixed(2), status: newDebtStatus })
            .eq('id', currentDebt.id);
        if (debtUpdateError) throw debtUpdateError;

        toast.success(t('paymentRecordedSuccessfully'));
        handleClosePaymentModal();
        fetchDebts(); // Refresh debt list
        
        // Manually trigger account list refresh if needed elsewhere, or rely on RLS
        // For instance, if AccountsPage is listening for 'accounts' table changes:
        const { data: updatedAccounts } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('name', {ascending: true});
        setAccounts(updatedAccounts || []);


    } catch (err) {
        console.error("Error processing debt payment:", err);
        toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`);
    } finally {
        setFormLoading(false);
    }
  };

  const openDeleteConfirm = (debt) => { setDebtToDelete(debt); setShowDeleteConfirm(true); };
  const closeDeleteConfirm = () => { setDebtToDelete(null); setShowDeleteConfirm(false); };

  if (loading && debts.length === 0 && !error) { return <div className="flex justify-center items-center h-[calc(100vh-250px)]"><FiList className="animate-pulse h-12 w-12 text-nuzum-accent-primary"/></div>; }

  return ( 
    <div className="space-y-8"> 
      <div className="bg-nuzum-surface p-5 sm:p-6 rounded-xl shadow-card flex flex-col sm:flex-row justify-between sm:items-center gap-4"> 
        <div><h1 className="text-2xl sm:text-3xl font-bold text-nuzum-text-primary">{t('debts')}</h1><p className="text-sm text-nuzum-text-secondary mt-1">{t('manageYourDebts')}</p></div> 
        <Button onClick={() => handleOpenDebtModal()} leftIcon={<FiPlus />} variant="accent"> {t('addDebtRecord')} </Button>
      </div> 
      <div className="bg-nuzum-surface rounded-xl shadow-card"> 
        {error && !loading && ( <div className="p-10 text-center"> <FiAlertCircle className="mx-auto h-12 w-12 text-nuzum-danger mb-4" /> <p className="text-nuzum-danger">{error}</p> <Button onClick={fetchDebts} className="mt-6" variant="secondary">{t('retry')}</Button> </div> )} 
        {!loading && !error && debts.length === 0 && ( <div className="text-center py-16 px-6"> <FiList className="mx-auto h-16 w-16 text-nuzum-text-secondary mb-6" /> <h3 className="text-2xl font-semibold text-nuzum-text-primary mb-3">{t('noDebtsFound')}</h3> <p className="text-nuzum-text-secondary mb-8">{t('startTrackingDebts')}</p> <Button onClick={() => handleOpenDebtModal()} leftIcon={<FiPlus />} variant="accent" size="lg">{t('addDebtRecord')}</Button> </div> )} 
        {!error && debts.length > 0 && ( 
          <ul className="divide-y divide-nuzum-border"> 
            {debts.map(debtRecord => ( // Changed variable name to avoid conflict
              <li key={debtRecord.id} className="p-4 sm:p-5 group hover:bg-nuzum-border/30 transition-colors"> 
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      {debtRecord.type === 'i_owe' ? <FiThumbsDown className="h-5 w-5 text-nuzum-danger me-2 shrink-0"/> : <FiThumbsUp className="h-5 w-5 text-nuzum-success me-2 shrink-0"/>}
                      <span className="text-lg font-semibold text-nuzum-text-primary truncate">{debtRecord.name}</span>
                    </div>
                    <p className="text-sm text-nuzum-text-secondary mt-1"> {debtRecord.type === 'i_owe' ? t('youOwe') : t('owesYou')} {debtRecord.party_name} </p>
                    {debtRecord.due_date && <p className="text-xs text-nuzum-text-placeholder mt-0.5 flex items-center"><FiCalendar className="me-1 w-3 h-3"/>{t('dueDate')}: {new Date(debtRecord.due_date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-bold ${debtRecord.type === 'i_owe' ? 'text-nuzum-danger' : 'text-nuzum-success'}`}> {formatCurrency(debtRecord.current_balance_owed, debtRecord.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)} </p>
                    <p className={`text-xs capitalize ${parseFloat(debtRecord.current_balance_owed) <= 0 && debtRecord.status === 'paid' ? 'text-nuzum-success' : 'text-nuzum-text-secondary'}`}>{t(debtRecord.status.toLowerCase().replace('_','')) || debtRecord.status}</p>
                  </div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-s-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleOpenPaymentModal(debtRecord)} title={t('recordPayment')} className="!p-1.5 text-xs whitespace-nowrap"> <FiCreditCard className="w-3 h-3 me-1"/>{t('payment')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleOpenDebtModal(debtRecord)} title={t('edit')} className="!p-1.5"> <FiEdit2 className="w-4 h-4"/> </Button>
                    <Button size="sm" variant="ghost" onClick={() => openDeleteConfirm(debtRecord)} title={t('delete')} className="text-nuzum-danger hover:bg-red-500/10 !p-1.5"> <FiTrash2 className="w-4 h-4"/> </Button>
                  </div>
                </div>
              </li> 
            ))} 
          </ul> 
        )}
      </div>
      <Modal isOpen={isDebtModalOpen} onClose={handleCloseDebtModal} title={currentDebt ? t('editDebtRecord') : t('addDebtRecord')} size="lg"> 
        <DebtForm onSubmit={handleSubmitDebt} onCancel={handleCloseDebtModal} initialData={currentDebt} isLoading={formLoading} currencies={availableCurrencies}/> 
      </Modal>
      <Modal isOpen={isPaymentModalOpen} onClose={handleClosePaymentModal} title={t('recordDebtPayment')} size="md">
        {currentDebt && <DebtPaymentForm debt={currentDebt} accounts={accounts} availableCurrencies={availableCurrencies} onSubmit={handleSubmitDebtPayment} onCancel={handleClosePaymentModal} isLoading={formLoading} />}
      </Modal>
      <Modal isOpen={showDeleteConfirm} onClose={closeDeleteConfirm} title={t('confirmDeletionTitle')} size="sm"> 
        <p className="text-nuzum-text-secondary">{t('deleteConfirmationMessage', { name: debtToDelete?.name || '' })}</p> 
        <div className="flex justify-end space-s-3 pt-5"> 
          <Button variant="secondary" onClick={closeDeleteConfirm} disabled={formLoading}>{t('no')}</Button> 
          <Button variant="danger" onClick={() => handleDeleteDebt(debtToDelete?.id)} isLoading={formLoading} disabled={formLoading}>{t('yesDelete')}</Button> 
        </div> 
      </Modal>
    </div>
  );
};

export default DebtsPage;