import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRepeat, FiFilter, FiSearch, FiX, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; //ติดปัญหา font ภาษาอาหรับ อาจจะต้องใช้ font ที่ support หรือ custom เพิ่ม
import Papa from 'papaparse';

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import TransactionForm from '../components/transactions/TransactionForm';
import { formatCurrency, CURRENCIES, getCurrencyDisplay } from '../utils/currencies';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Helper function for balance/qty updates (same as before)
async function updateRelatedData(transaction, previousTransactionData = null) {
  const updates = [];
  const accountIdForUpdate = transaction.account_id || previousTransactionData?.account_id;
  if (!accountIdForUpdate) { /* console.warn("No account ID for update"); */ return; }

  const accountUpdate = supabase.from('accounts').select('balance').eq('id', accountIdForUpdate).single();
  updates.push(accountUpdate.then(async ({ data: account, error }) => {
    if (error || !account) { console.error('Failed to fetch account for balance update.', error); return; }
    let newBalance = parseFloat(account.balance);
    if (previousTransactionData) {
        if (previousTransactionData.type === 'income') newBalance -= parseFloat(previousTransactionData.amount);
        else newBalance += parseFloat(previousTransactionData.amount);
    }
    if (transaction.type && transaction.amount) {
        if (transaction.type === 'income') newBalance += parseFloat(transaction.amount);
        else newBalance -= parseFloat(transaction.amount);
    }
    const { error: updateBalanceError } = await supabase.from('accounts').update({ balance: newBalance.toFixed(2) }).eq('id', accountIdForUpdate);
    if (updateBalanceError) { console.error('Failed to update account balance.', updateBalanceError); }
  }));

  const materialIdForUpdate = transaction.material_id || previousTransactionData?.material_id;
  const quantityAffectedForUpdate = transaction.material_quantity_affected !== undefined ? transaction.material_quantity_affected : (previousTransactionData ? previousTransactionData.material_quantity_affected : null);

  if (materialIdForUpdate && quantityAffectedForUpdate !== null) {
    const materialUpdate = supabase.from('materials').select('quantity').eq('id', materialIdForUpdate).single();
    updates.push(materialUpdate.then(async ({ data: material, error }) => {
      if (error || !material) { console.error('Failed to fetch material for quantity update.', error); return; }
      let newQuantity = parseInt(material.quantity);
      if (previousTransactionData && previousTransactionData.material_id === materialIdForUpdate && previousTransactionData.material_quantity_affected) {
        newQuantity -= parseInt(previousTransactionData.material_quantity_affected);
      }
      if (transaction.type && transaction.amount) { 
         newQuantity += parseInt(quantityAffectedForUpdate);
      }
      const { error: updateQtyError } = await supabase.from('materials').update({ quantity: newQuantity }).eq('id', materialIdForUpdate);
      if (updateQtyError) { console.error('Failed to update material quantity.', updateQtyError); }
    }));
  }
  try { await Promise.all(updates); } catch (e) { console.error("Error in updateRelatedData Promise.all:", e); }
}


const TransactionsPage = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterMaterialId, setFilterMaterialId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    if (!user) return;
    const fetchFilterData = async () => {
      try {
        const { data: accData, error: accError } = await supabase.from('accounts').select('id, name').eq('user_id', user.id);
        if (accError) throw accError;
        setAccounts(accData || []);
        const { data: matData, error: matError } = await supabase.from('materials').select('id, name').eq('user_id', user.id);
        if (matError) throw matError;
        setMaterials(matData || []);
      } catch (err) { console.error("Error fetching filter data:", err.message); }
    };
    fetchFilterData();
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    // ... (fetchTransactions logic remains the same as previous version)
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('transactions')
        .select(`*, accounts (id, name, currency), materials (id, name, unit_type)`)
        .eq('user_id', user.id);

      if (searchTerm) query = query.ilike('notes', `%${searchTerm}%`);
      if (filterType) query = query.eq('type', filterType);
      if (filterCurrency) query = query.eq('currency', filterCurrency);
      if (filterAccountId) query = query.eq('account_id', filterAccountId);
      if (filterMaterialId) query = query.eq('material_id', filterMaterialId);
      if (filterDateFrom) query = query.gte('date', filterDateFrom);
      if (filterDateTo) { 
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('date', toDate.toISOString());
      }
      
      query = query.order('date', { ascending: false }).order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err.message);
      setError(t('errorFetchingTransactions'));
      // toast.error(t('errorFetchingTransactions')); // Can be noisy
    } finally {
      setLoading(false);
    }
  }, [user, t, searchTerm, filterType, filterCurrency, filterAccountId, filterMaterialId, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  useEffect(() => { if (!user) return; const channel = supabase.channel('public:transactions_page_filters_v2').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => fetchTransactions()).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchTransactions]);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => { setIsModalOpen(false); setFormLoading(false); };
  const handleSubmitTransaction = async (formData) => { /* ... same as before ... */ setFormLoading(true); try { const { data: newTxData, error: insertError } = await supabase.from('transactions').insert([{ ...formData, user_id: user.id }]).select().single(); if (insertError) throw insertError; await updateRelatedData(newTxData); toast.success(t('transactionAddedSuccess')); handleCloseModal(); } catch (err) { toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); }};
  const handleDeleteTransaction = async (transactionData) => { /* ... same as before ... */ if (!transactionData?.id) return; setFormLoading(true); try { const { error: deleteError } = await supabase.from('transactions').delete().eq('id', transactionData.id).eq('user_id', user.id); if (deleteError) throw deleteError; await updateRelatedData({}, transactionData); toast.success(t('transactionDeletedSuccess')); } catch (err) { toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); setShowDeleteConfirm(false); setTransactionToDelete(null); }};
  const openDeleteConfirm = (transaction) => { setTransactionToDelete(transaction); setShowDeleteConfirm(true); };
  const closeDeleteConfirm = () => { setTransactionToDelete(null); setShowDeleteConfirm(false); };
  const clearFilters = () => { setSearchTerm(''); setFilterType(''); setFilterCurrency(''); setFilterAccountId(''); setFilterMaterialId(''); setFilterDateFrom(''); setFilterDateTo(''); };
  const datePresets = useMemo(() => ({ today: { from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }, thisMonth: { from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }, lastMonth: { from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') }, }), []);
  const applyDatePreset = (preset) => { setFilterDateFrom(datePresets[preset].from); setFilterDateTo(datePresets[preset].to); };

  const exportToCSV = () => {
    const dataToExport = transactions.map(tx => ({
      [t('date')]: new Date(tx.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : undefined),
      [t('type')]: t(tx.type),
      [t('notes')]: tx.notes || '-',
      [t('amount')]: tx.amount,
      [t('currency')]: tx.currency,
      [t('account')]: tx.accounts?.name || t('unknownAccount'),
      [t('material')]: tx.materials?.name || '-',
      [t('materialQuantity')]: tx.material_id ? Math.abs(tx.material_quantity_affected) : '-',
      [t('materialUnit')]: tx.material_id ? (t(tx.materials?.unit_type?.toLowerCase()) || tx.materials?.unit_type) : '-',
    }));
    // Add "materialQuantity": "كمية المادة"
    // Add "materialUnit": "وحدة المادة"

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    
    // For Arabic, you need to load an Arabic-supporting font
    // This is a placeholder. You'd need to acquire Amira-Regular.ttf or similar, host it,
    // and ensure it's loaded correctly. For client-side PDF generation with jsPDF,
    // font embedding is complex and often requires pre-converting fonts.
    // doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    // doc.setFont('Amiri');
    // As a fallback, text might not render correctly for Arabic without a proper font.

    const tableColumn = [
        t('date'), t('type'), t('notes'), t('amount'), t('currency'), 
        t('account'), t('material')//, t('materialQuantity'), t('materialUnit')
    ];
    const tableRows = [];

    transactions.forEach(tx => {
      const transactionData = [
        new Date(tx.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : undefined),
        t(tx.type),
        tx.notes || '-',
        tx.amount.toFixed(2), // Ensure amount is string for jsPDF-autoTable
        tx.currency,
        tx.accounts?.name || t('unknownAccount'),
        tx.materials?.name || '-',
        // tx.material_id ? Math.abs(tx.material_quantity_affected) : '-',
        // tx.material_id ? (t(tx.materials?.unit_type?.toLowerCase()) || tx.materials?.unit_type) : '-',
      ];
      tableRows.push(transactionData);
    });

    // AutoTable will generate the table
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        // Apply styles for RTL if needed, and font for Arabic
        // didParseCell: function (data) {
        //   if (data.row.section === 'head' || data.row.section === 'body') {
        //     data.cell.styles.font = 'Amiri'; // Or your loaded Arabic font
        //     // For RTL text alignment for Arabic content:
        //     // if (i18n.language === 'ar') {
        //     //   data.cell.styles.halign = 'right';
        //     // }
        //   }
        // }
    });
    doc.text(t('transactionsReport') || "Transactions Report", 14, 15);
    // Add "transactionsReport": "تقرير المعاملات"
    doc.save(`transactions_${new Date().toISOString().split('T')[0]}.pdf`);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-text-primary-dark">{t('transactions')}</h1>
        <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="md" leftIcon={<FiDownload />}>
                {t('exportCSV')}
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="md" leftIcon={<FiDownload />}>
                {t('exportPDF')}
            </Button>
            <Button onClick={handleOpenModal} leftIcon={<FiPlus />}>
              {t('addNewTransaction')}
            </Button>
        </div>
      </div>

      {/* Filters Section ... (same as before) ... */}
      <div className="p-4 bg-navy-light rounded-xl shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <Input id="searchTerm" label={t('searchNotes')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('search') + "..."} leftIcon={<FiSearch className="text-text-secondary-dark"/>}/>
          <div> <label htmlFor="filterType" className="block text-sm font-medium text-text-secondary-dark mb-1">{t('transactionType')}</label> <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full input-style"> <option value="">{t('all')}</option> <option value="income">{t('income')}</option> <option value="expense">{t('expense')}</option> </select> </div>
          <div> <label htmlFor="filterCurrency" className="block text-sm font-medium text-text-secondary-dark mb-1">{t('currency')}</label> <select id="filterCurrency" value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)} className="w-full input-style"> <option value="">{t('all')}</option> {CURRENCIES.map(c => <option key={c.code} value={c.code}>{t(c.name_key)} ({c.symbol})</option>)} </select> </div>
          <div> <label htmlFor="filterAccountId" className="block text-sm font-medium text-text-secondary-dark mb-1">{t('account')}</label> <select id="filterAccountId" value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)} className="w-full input-style"> <option value="">{t('all')}</option> {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)} </select> </div>
          <div> <label htmlFor="filterMaterialId" className="block text-sm font-medium text-text-secondary-dark mb-1">{t('material')}</label> <select id="filterMaterialId" value={filterMaterialId} onChange={(e) => setFilterMaterialId(e.target.value)} className="w-full input-style"> <option value="">{t('all')}</option> {materials.map(mat => <option key={mat.id} value={mat.id}>{mat.name}</option>)} </select> </div>
          <div className="lg:col-span-1 flex items-end space-s-2"> <Button onClick={clearFilters} variant="secondary" size="md" className="w-full lg:w-auto" leftIcon={<FiX/>}> {t('clearFilters')} </Button> </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input id="filterDateFrom" label={t('dateFrom')} type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            <Input id="filterDateTo" label={t('dateTo')} type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            <div className="flex space-s-2"> <Button onClick={() => applyDatePreset('today')} size="sm" variant="outline" className="flex-1">{t('today')}</Button> <Button onClick={() => applyDatePreset('thisMonth')} size="sm" variant="outline" className="flex-1">{t('thisMonth')}</Button> <Button onClick={() => applyDatePreset('lastMonth')} size="sm" variant="outline" className="flex-1">{t('lastMonth')}</Button> </div>
        </div>
      </div>

      {/* Transactions List ... (same as before) ... */}
      {loading && ( <div className="flex justify-center items-center py-10"> <FiRepeat className="animate-spin h-10 w-10 text-accent-blue" /> </div> )}
      {error && !loading && ( <div className="text-center p-10 bg-navy-light rounded-xl shadow-lg"> <FiAlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" /> <p className="text-red-400">{error}</p> <Button onClick={fetchTransactions} className="mt-4" variant="secondary">{t('retry')}</Button> </div> )}
      {!loading && !error && transactions.length === 0 && ( <div className="text-center py-10 px-6 bg-navy-light rounded-xl shadow"> <FiRepeat className="mx-auto h-16 w-16 text-slate-blue mb-4" /> <h3 className="text-xl font-semibold text-text-primary-dark mb-2">{t('noTransactionsMatchFilters')}</h3> <p className="text-text-secondary-dark mb-6">{t('tryAdjustingFilters')}</p> <Button onClick={handleOpenModal} leftIcon={<FiPlus />}>{t('addNewTransaction')}</Button> </div> )}
      {!error && transactions.length > 0 && ( <div className="bg-navy-light shadow-xl rounded-xl overflow-hidden"> <ul className="divide-y divide-slate-blue"> {transactions.map(tx => ( <li key={tx.id} className="p-4 sm:p-6 hover:bg-navy-deep transition-colors duration-150"> <div className="flex items-start justify-between space-x-4"> <div className="flex-1 min-w-0"> <div className="flex items-center mb-1"> {tx.type === 'income' ? <FiTrendingUp className="h-5 w-5 text-green-400 me-2 shrink-0" /> : <FiTrendingDown className="h-5 w-5 text-red-400 me-2 shrink-0" />} <span className={`font-semibold text-lg ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(tx.amount, tx.currency, t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</span> </div> <p className="text-sm text-text-primary-dark truncate" title={tx.notes}>{tx.notes || t(tx.type)}</p> <p className="text-xs text-text-secondary-dark mt-1"> {new Date(tx.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined, { year: 'numeric', month: 'long', day: 'numeric' })} {' | '} {tx.accounts?.name || t('unknownAccount')} {tx.materials && ` | ${tx.materials.name} (${Math.abs(tx.material_quantity_affected)} ${t(tx.materials.unit_type?.toLowerCase()) || tx.materials.unit_type})`} </p> </div> <div className="flex space-s-2 shrink-0 mt-1"> <Button size="sm" variant="danger" onClick={() => openDeleteConfirm(tx)} title={t('delete')}><FiTrash2 /></Button> </div> </div> </li> ))} </ul> </div> )}
      {/* Modals ... (same as before) ... */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={t('addNewTransaction')} size="lg"> <TransactionForm onSubmit={handleSubmitTransaction} onCancel={handleCloseModal} isLoading={formLoading} /> </Modal>
      <Modal isOpen={showDeleteConfirm} onClose={closeDeleteConfirm} title={t('confirmDeletionTitle')} size="sm"> <p className="text-text-secondary-dark">{t('confirmDeleteTransaction')}</p> <div className="flex justify-end space-s-3 pt-5"> <Button variant="secondary" onClick={closeDeleteConfirm} disabled={formLoading}>{t('no')}</Button> <Button variant="danger" onClick={() => handleDeleteTransaction(transactionToDelete)} isLoading={formLoading} disabled={formLoading}>{t('yesDelete')}</Button> </div> </Modal>
    </div>
  );
};

export default TransactionsPage;