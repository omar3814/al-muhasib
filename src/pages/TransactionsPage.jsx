import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiTrendingUp, FiTrendingDown, FiAlertCircle, FiRepeat, FiFilter, FiSearch, FiX, FiDownload, FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import TransactionForm from '../components/transactions/TransactionForm';
import { formatCurrency, getCurrencyDisplayInfo, getAllCurrenciesForUser, HARDCODED_DEFAULT_CURRENCY } from '../utils/currencies'; 
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

async function updateRelatedData(newTransactionDetails, oldTransactionDetails = null) {
  console.log("updateRelatedData: Called With:", { newTransactionDetails, oldTransactionDetails });
  const updates = [];

  const isCreate = !oldTransactionDetails && newTransactionDetails && newTransactionDetails.type;
  const isDelete = !!oldTransactionDetails && (!newTransactionDetails || !newTransactionDetails.type || (Object.keys(newTransactionDetails).length <= 2 && newTransactionDetails.account_id && newTransactionDetails.material_id !== undefined));
  const isEdit = !!oldTransactionDetails && !!newTransactionDetails && newTransactionDetails.type;

  console.log("updateRelatedData: Operation Type:", { isCreate, isEdit, isDelete });

  const accountIdToUpdate = oldTransactionDetails?.account_id || newTransactionDetails?.account_id;

  if (accountIdToUpdate) {
      const accountUpdatePromise = supabase
      .from('accounts')
      .select('balance')
      .eq('id', accountIdToUpdate)
      .single();

    updates.push(accountUpdatePromise.then(async ({ data: account, error }) => {
      if (error || !account) {
        console.error('updateRelatedData: Failed to fetch account for balance update.', { accountIdToUpdate, error });
        return Promise.reject(new Error('Failed to fetch account for balance update.'));
      }
      
      let currentBalance = parseFloat(account.balance);
      let calculatedNewBalance = currentBalance; 

      console.log(`updateRelatedData: Account ${accountIdToUpdate} initial balance: ${currentBalance}`);

      if (isEdit || isDelete) { 
        if (oldTransactionDetails.type === 'income') {
          calculatedNewBalance -= parseFloat(oldTransactionDetails.amount);
        } else { 
          calculatedNewBalance += parseFloat(oldTransactionDetails.amount);
        }
        console.log(`updateRelatedData: Reverted old ${oldTransactionDetails.type} of ${oldTransactionDetails.amount}. Temp balance for account ${accountIdToUpdate}: ${calculatedNewBalance}`);
      }

      if (isCreate || isEdit) { 
        if (newTransactionDetails.type === 'income') {
          calculatedNewBalance += parseFloat(newTransactionDetails.amount);
        } else { 
          calculatedNewBalance -= parseFloat(newTransactionDetails.amount);
        }
        console.log(`updateRelatedData: Applied new ${newTransactionDetails.type} of ${newTransactionDetails.amount}. Final balance for account ${accountIdToUpdate}: ${calculatedNewBalance}`);
      }
      
      if (Math.abs(currentBalance - calculatedNewBalance) > 0.0001 || isCreate || isDelete) {
        const { error: updateBalanceError } = await supabase
          .from('accounts')
          .update({ balance: calculatedNewBalance.toFixed(2) })
          .eq('id', accountIdToUpdate);
        if (updateBalanceError) {
          console.error('updateRelatedData: Failed to update account balance.', updateBalanceError);
          return Promise.reject(new Error('Failed to update account balance.'));
        }
        console.log(`updateRelatedData: Account ${accountIdToUpdate} final balance updated to: ${calculatedNewBalance.toFixed(2)}`);
      } else {
        console.log(`updateRelatedData: Account ${accountIdToUpdate} balance unchanged. No DB update needed.`);
      }
    }));
  }

  const materialIdToUpdate = oldTransactionDetails?.material_id || newTransactionDetails?.material_id;

  if (materialIdToUpdate) {
    const materialUpdatePromise = supabase
      .from('materials')
      .select('quantity')
      .eq('id', materialIdToUpdate)
      .single();

    updates.push(materialUpdatePromise.then(async ({ data: material, error }) => {
      if (error || !material) {
        console.error('updateRelatedData: Failed to fetch material for quantity update.', error);
        return Promise.reject(new Error('Failed to fetch material for quantity update.'));
      }
      let currentQuantity = parseInt(material.quantity);
      let calculatedNewQuantity = currentQuantity;
      console.log(`updateRelatedData: Material ${materialIdToUpdate} initial quantity: ${currentQuantity}`);

      if ((isEdit || isDelete) && oldTransactionDetails.material_id === materialIdToUpdate && oldTransactionDetails.material_quantity_affected !== undefined && oldTransactionDetails.material_quantity_affected !== null) {
        calculatedNewQuantity -= parseInt(oldTransactionDetails.material_quantity_affected);
        console.log(`updateRelatedData: Reverted old material qty change of ${oldTransactionDetails.material_quantity_affected}. Temp quantity for material ${materialIdToUpdate}: ${calculatedNewQuantity}`);
      }

      if ((isCreate || isEdit) && newTransactionDetails.material_id === materialIdToUpdate && newTransactionDetails.material_quantity_affected !== undefined && newTransactionDetails.material_quantity_affected !== null) {
        calculatedNewQuantity += parseInt(newTransactionDetails.material_quantity_affected);
        console.log(`updateRelatedData: Applied new material qty change of ${newTransactionDetails.material_quantity_affected}. Final quantity for material ${materialIdToUpdate}: ${calculatedNewQuantity}`);
      }
      
      if (currentQuantity !== calculatedNewQuantity || isCreate || isDelete) {
        const { error: updateQtyError } = await supabase
          .from('materials')
          .update({ quantity: calculatedNewQuantity })
          .eq('id', materialIdToUpdate);
        if (updateQtyError) {
          console.error('updateRelatedData: Failed to update material quantity.', updateQtyError);
          return Promise.reject(new Error('Failed to update material quantity.'));
        }
        console.log(`updateRelatedData: Material ${materialIdToUpdate} final quantity updated to: ${calculatedNewQuantity}`);
      } else {
         console.log(`updateRelatedData: Material ${materialIdToUpdate} quantity unchanged. No DB update needed.`);
      }
    }));
  }

  try { 
    await Promise.all(updates); 
    console.log("updateRelatedData: All updates processed successfully.");
  } catch (e) { 
    console.error("updateRelatedData: Error during Promise.all processing related data:", e); 
    toast.error(t('errorUpdatingRelatedData'));
    throw e; 
  }
}

const TransactionsPage = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isTransferModalActive, setIsTransferModalActive] = useState(false);
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
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [initialDataLoading, setInitialDataLoading] = useState(true);

  const loadDropdownData = useCallback(async () => {
    if (!user) {
      setAccounts([]); setMaterials([]); setAvailableCurrencies([]);
      setInitialDataLoading(false);
      return;
    }
    setInitialDataLoading(true);
    try {
      const [accRes, matRes, currRes] = await Promise.all([
        supabase.from('accounts').select('id, name, currency, balance').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('materials').select('id, name, unit_type').eq('user_id', user.id).order('name', { ascending: true }),
        getAllCurrenciesForUser(user.id)
      ]);
      if (accRes.error) throw accRes.error;
      setAccounts(accRes.data || []);
      if (matRes.error) throw matRes.error;
      setMaterials(matRes.data || []);
      setAvailableCurrencies(currRes || []);
    } catch (err) { 
      console.error("TransactionsPage: Error fetching initial page/dropdown data:", err.message); 
      toast.error(t('errorFetchingDropdownData'));
      setAccounts([]); setMaterials([]); setAvailableCurrencies([]);
    } finally {
      setInitialDataLoading(false);
    }
  }, [user, t]);

  useEffect(() => { 
    loadDropdownData();
  }, [loadDropdownData]);
  
  const fetchTransactions = useCallback(async () => { 
    if (!user || initialDataLoading) { 
        if(!user) setPageLoading(false); 
        return; 
    } 
    setPageLoading(true); setPageError(''); 
    try { 
        let q = supabase.from('transactions').select(`id, created_at, user_id, type, amount, currency, date, notes, account_id, material_id, material_quantity_affected, image_url, accounts:account_id ( id, name, currency ), materials ( id, name, unit_type )`).eq('user_id', user.id); 
        if (searchTerm) q = q.ilike('notes', `%${searchTerm}%`); 
        if (filterType) q = q.eq('type', filterType); 
        if (filterCurrency) q = q.eq('currency', filterCurrency); 
        if (filterAccountId) q = q.eq('account_id', filterAccountId); 
        if (filterMaterialId) q = q.eq('material_id', filterMaterialId); 
        if (filterDateFrom) q = q.gte('date', filterDateFrom); 
        if (filterDateTo) { const tD = new Date(filterDateTo); tD.setHours(23,59,59,999); q = q.lte('date', tD.toISOString()); } 
        q = q.order('date', { ascending: false }).order('created_at', { ascending: false }); 
        const { data, error: fe } = await q; 
        if (fe) { toast.error(t('errorFetchingTransactions') + `: ${fe.message}`); setTransactions([]); throw fe; } 
        setTransactions(data || []); 
    } catch (err) { 
        setPageError(t('errorFetchingTransactions')); setTransactions([]); 
    } finally { 
        setPageLoading(false); 
    }}, [user, t, searchTerm, filterType, filterCurrency, filterAccountId, filterMaterialId, filterDateFrom, filterDateTo, initialDataLoading]); 

  useEffect(() => { 
    if(!initialDataLoading) fetchTransactions(); 
  }, [fetchTransactions, initialDataLoading]);

  useEffect(() => { if (!user) return; const ch = supabase.channel('public:transactions_page_full_code_fix').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => fetchTransactions()).on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}`}, () => loadDropdownData()).on('postgres_changes', { event: '*', schema: 'public', table: 'materials', filter: `user_id=eq.${user.id}`}, () => loadDropdownData()) .subscribe(); return () => supabase.removeChannel(ch); }, [user, fetchTransactions, loadDropdownData]);
  const handleOpenTransactionModal = (isTransfer = false) => { setIsTransferModalActive(isTransfer); setIsTransactionModalOpen(true); };
  const handleCloseTransactionModal = () => { setIsTransactionModalOpen(false); setFormLoading(false); setIsTransferModalActive(false); };
  const handleSubmitTransactionOrTransfer = async (formDataFromForm) => { setFormLoading(true); try { if (formDataFromForm.isTransfer) { const { fromAccountId, toAccountId, amount, date, notes, currency, image_url } = formDataFromForm; const sourceAccount = accounts.find(acc => acc.id === fromAccountId); const destinationAccount = accounts.find(acc => acc.id === toAccountId); if (!sourceAccount || !destinationAccount) throw new Error(t('invalidAccountsSelectedError')); if (sourceAccount.currency !== currency || destinationAccount.currency !== currency) throw new Error(t('transferCurrencyMismatchError')); if (parseFloat(sourceAccount.balance) < parseFloat(amount)) throw new Error(t('insufficientFundsError')); const transferTimestamp = new Date(date).toISOString(); const transferRef = `transfer-${Date.now()}`; const expenseTxData = { user_id: user.id, type: 'expense', amount, currency, date: transferTimestamp, notes: `${t('transferTo')} ${destinationAccount.name}${notes ? ` - ${notes}` : ''} (Ref: ${transferRef})`, account_id: fromAccountId, image_url: image_url || null }; const incomeTxData = { user_id: user.id, type: 'income', amount, currency, date: transferTimestamp, notes: `${t('transferFrom')} ${sourceAccount.name}${notes ? ` - ${notes}` : ''} (Ref: ${transferRef})`, account_id: toAccountId, image_url: image_url || null }; const { data: insertedTxs, error: insertError } = await supabase.from('transactions').insert([expenseTxData, incomeTxData]).select(); if (insertError) throw insertError; if (insertedTxs && insertedTxs.length === 2) { await updateRelatedData(insertedTxs[0]); await updateRelatedData(insertedTxs[1]); } toast.success(t('transferSuccessful')); } else { const { isTransfer, ...actualTransactionData } = formDataFromForm; const { data: newTxData, error: insertError } = await supabase.from('transactions').insert([{ ...actualTransactionData, user_id: user.id }]).select().single(); if (insertError) throw insertError; await updateRelatedData(newTxData); toast.success(t('transactionAddedSuccess')); } handleCloseTransactionModal(); } catch (err) { console.error("Error submitting transaction/transfer:", err); toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); }};
  const handleDeleteTransaction = async (transactionData) => { if (!transactionData?.id) return; setFormLoading(true); try { const { error: dErr } = await supabase.from('transactions').delete().eq('id', transactionData.id).eq('user_id', user.id); if (dErr) throw dErr; await updateRelatedData({ account_id: transactionData.account_id, material_id: transactionData.material_id }, transactionData); toast.success(t('transactionDeletedSuccess')); } catch (err) { toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); setShowDeleteConfirm(false); setTransactionToDelete(null); }};
  const openDeleteConfirm = (transaction) => { setTransactionToDelete(transaction); setShowDeleteConfirm(true); };
  const closeDeleteConfirm = () => { setTransactionToDelete(null); setShowDeleteConfirm(false); };
  const clearFilters = () => { setSearchTerm(''); setFilterType(''); setFilterCurrency(''); setFilterAccountId(''); setFilterMaterialId(''); setFilterDateFrom(''); setFilterDateTo(''); };
  const datePresets = useMemo(() => ({ today: { from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }, thisMonth: { from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }, lastMonth: { from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') }, }), []);
  const applyDatePreset = (preset) => { setFilterDateFrom(datePresets[preset].from); setFilterDateTo(datePresets[preset].to); };
  const exportToCSV = () => { const enTranslations = i18n.getResourceBundle('en', 'common'); const getEn = (key, fb = '') => enTranslations[key] || fb || key; const dataToExport = transactions.map(tx => ({ [getEn('date', 'Date')]: new Date(tx.date).toLocaleDateString('en-CA'), [getEn('type', 'Type')]: getEn(tx.type.toLowerCase(), tx.type), [getEn('notes', 'Notes')]: tx.notes || '-', [getEn('amount', 'Amount')]: tx.amount, [getEn('currency', 'Currency')]: tx.currency, [getEn('account', 'Account')]: tx.accounts?.name || getEn('unknownAccount', 'Unknown Account'), [t('material')]: tx.materials?.name || '-', [t('materialQuantity')]: tx.material_id ? Math.abs(tx.material_quantity_affected) : '-', [t('materialUnit')]: tx.material_id ? (getEn(tx.materials?.unit_type?.toLowerCase(), tx.materials?.unit_type)) : '-', })); const csv = Papa.unparse(dataToExport); const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute('href', url); link.setAttribute('download', `Nuzum_Transactions_${new Date().toISOString().split('T')[0]}.csv`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }};
  const exportToPDF = async () => { const doc = new jsPDF({orientation: 'p', unit: 'mm', format: 'a4'}); const enTranslations = i18n.getResourceBundle('en', 'common'); const getEn = (key, fb = '') => enTranslations[key] || fb || key; doc.setFont('helvetica', 'normal'); const tableColumns = [{ header: getEn('date', 'Date'), dataKey: 'dateStr' }, { header: getEn('type', 'Type'), dataKey: 'typeStr' }, { header: getEn('notes', 'Notes'), dataKey: 'notes' }, { header: getEn('account', 'Account'), dataKey: 'accountName' }, { header: getEn('material', 'Material'), dataKey: 'materialName' },{ header: getEn('amount', 'Amount'), dataKey: 'amountStr' }, { header: getEn('currency', 'Currency'), dataKey: 'currency' }]; const tableRows = transactions.map(tx => ({ dateStr: new Date(tx.date).toLocaleDateString('en-CA'), typeStr: getEn(tx.type.toLowerCase(), tx.type), notes: tx.notes || '-', accountName: tx.accounts?.name || getEn('unknownAccount', 'Unknown Account'), materialName: tx.materials?.name || '-', amountStr: tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), currency: tx.currency, })); doc.setProperties({ title: getEn('transactionsReport', 'Transactions Report'), subject: getEn('appName', 'Nuzum') + ' - ' + getEn('transactions', 'Transactions'), creator: getEn('appName', 'Nuzum') }); doc.setFontSize(18); doc.setTextColor(40); doc.text(getEn('transactionsReport', 'Transactions Report'), 14, 20); doc.setFontSize(10); doc.setTextColor(100); doc.text(`${getEn('reportGeneratedOn')}: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 26); doc.autoTable({ columns: tableColumns, body: tableRows, startY: 35, theme: 'grid', headStyles: { fillColor: [51, 65, 85], textColor: [240, 246, 252], fontStyle: 'bold', fontSize: 9, }, styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'ellipsize', valign: 'middle' }, columnStyles: { notes: { cellWidth: 'auto' }, amountStr: { halign: 'right' }, currency: { halign: 'center' } }, didDrawPage: function (data) { const pageCount = doc.internal.getNumberOfPages(); doc.setFontSize(8); doc.setTextColor(150); doc.text( `Page ${data.pageNumber} of ${pageCount} | ${getEn('appName', 'Nuzum')}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10 ); } }); doc.save(`Nuzum_Transactions_${new Date().toISOString().split('T')[0]}.pdf`); };

  if (initialDataLoading || (pageLoading && transactions.length === 0 && !pageError) ) { return <div className="flex justify-center items-center h-[calc(100vh-250px)]"><svg className="animate-spin h-12 w-12 text-nuzum-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>; }
  
  return ( 
    <div className="space-y-8"> 
      <div className="bg-nuzum-surface p-5 sm:p-6 rounded-xl shadow-card flex flex-col sm:flex-row justify-between sm:items-center gap-4"> 
        <div><h1 className="text-2xl sm:text-3xl font-bold text-nuzum-text-primary">{t('transactions')}</h1><p className="text-sm text-nuzum-text-secondary mt-1">{t('viewAndManageTransactions')}</p></div> 
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"><Button onClick={exportToCSV} variant="secondary" size="md" leftIcon={<FiDownload />} className="w-full sm:w-auto">{t('exportCSV')}</Button><Button onClick={exportToPDF} variant="secondary" size="md" leftIcon={<FiDownload />} className="w-full sm:w-auto">{t('exportPDF')}</Button><Button onClick={() => handleOpenTransactionModal(false)} leftIcon={<FiPlus className="rtl:ms-0 rtl:-me-0.5 me-1.5 -ms-0.5"/>} variant="accent" size="md" className="w-full sm:w-auto">{t('addNewTransaction')}</Button><Button onClick={() => handleOpenTransactionModal(true)} leftIcon={<FiRefreshCw className="rtl:ms-0 rtl:-me-0.5 me-1.5 -ms-0.5"/>} variant="outline" size="md" className="w-full sm:w-auto">{t('newTransfer')}</Button></div> 
      </div> 
      <div className="p-5 bg-nuzum-surface rounded-xl shadow-card space-y-5"> 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end"> <Input id="searchTerm" label={t('searchNotes')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('search') + "..."} leftIcon={<FiSearch className="text-pa-text-secondary"/>} className="input-style-container"/> <div> <label htmlFor="filterType" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('transactionType')}</label> <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-style"> <option value="">{t('all')}</option> <option value="income">{t('income')}</option> <option value="expense">{t('expense')}</option> </select> </div> <div> <label htmlFor="filterCurrency" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('currency')}</label> <select id="filterCurrency" value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)} className="input-style"> <option value="">{t('all')}</option> {(availableCurrencies || []).map(c => <option key={c.id || c.code} value={c.code}>{getCurrencyDisplayInfo(c.code, availableCurrencies, t).name} ({c.symbol})</option>)} </select> </div> <div> <label htmlFor="filterAccountId" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('account')}</label> <select id="filterAccountId" value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)} className="input-style"> <option value="">{t('all')}</option> {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)} </select> </div> <div> <label htmlFor="filterMaterialId" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('material')}</label> <select id="filterMaterialId" value={filterMaterialId} onChange={(e) => setFilterMaterialId(e.target.value)} className="input-style"> <option value="">{t('all')}</option> {materials.map(mat => <option key={mat.id} value={mat.id}>{mat.name}</option>)} </select> </div> <div className="lg:col-span-1 flex items-end"> <Button onClick={clearFilters} variant="secondary" size="md" className="w-full" leftIcon={<FiX/>}> {t('clearFilters')} </Button> </div> </div> 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"> <Input id="filterDateFrom" label={t('dateFrom')} type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="input-style-container"/> <Input id="filterDateTo" label={t('dateTo')} type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="input-style-container"/> <div className="flex space-s-2 pt-4 md:pt-0"> <Button onClick={() => applyDatePreset('today')} size="sm" variant="outline" className="flex-1">{t('today')}</Button> <Button onClick={() => applyDatePreset('thisMonth')} size="sm" variant="outline" className="flex-1">{t('thisMonth')}</Button> <Button onClick={() => applyDatePreset('lastMonth')} size="sm" variant="outline" className="flex-1">{t('lastMonth')}</Button> </div> </div> 
      </div> 
      {pageLoading && !pageError && ( <div className="flex justify-center items-center py-10 bg-nuzum-surface rounded-xl shadow-card mt-8"> <FiRepeat className="animate-spin h-10 w-10 text-nuzum-accent-primary" /> </div> )} 
      {pageError && !pageLoading && ( <div className="bg-nuzum-surface p-10 rounded-xl shadow-card text-center mt-8"> <FiAlertCircle className="mx-auto h-12 w-12 text-nuzum-danger mb-4" /> <p className="text-nuzum-danger">{pageError}</p> <Button onClick={fetchTransactions} className="mt-6" variant="secondary">{t('retry')}</Button> </div> )} 
      {!pageLoading && !pageError && transactions.length === 0 && ( <div className="bg-nuzum-surface text-center py-16 px-6 rounded-xl shadow-card mt-8"> <FiRepeat className="mx-auto h-16 w-16 text-nuzum-text-secondary mb-6" /> <h3 className="text-2xl font-semibold text-nuzum-text-primary mb-3">{t('noTransactionsMatchFilters')}</h3> <p className="text-nuzum-text-secondary mb-8">{t('tryAdjustingFilters')}</p> <Button onClick={() => handleOpenTransactionModal(false)} leftIcon={<FiPlus />} variant="accent" size="lg">{t('addNewTransaction')}</Button> </div> )} 
      {!pageError && transactions.length > 0 && ( <div className="bg-nuzum-surface shadow-xl rounded-xl overflow-hidden mt-8"> <ul className="divide-y divide-nuzum-border"> {transactions.map(tx => ( <li key={tx.id} className="group"> <Link to={`/transactions/${tx.id}`} className="block p-4 sm:p-6 hover:bg-nuzum-border transition-colors duration-150 ease-out transform hover:-translate-y-px"> <div className="flex items-center justify-between space-x-4 rtl:space-x-reverse"> <div className="flex-1 min-w-0"> <div className="flex items-center mb-1"> {tx.type === 'income' ? <FiTrendingUp className="h-5 w-5 text-nuzum-success me-2 shrink-0" /> : <FiTrendingDown className="h-5 w-5 text-nuzum-danger me-2 shrink-0" />} <span className={`font-semibold text-lg ${tx.type === 'income' ? 'text-nuzum-success' : 'text-nuzum-danger'}`}>{formatCurrency(tx.amount, tx.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</span> </div> <p className="text-sm text-nuzum-text-primary truncate group-hover:text-white" title={tx.notes}>{tx.notes || t(tx.type)}</p> <p className="text-xs text-nuzum-text-secondary mt-1"> {new Date(tx.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined, { year: 'numeric', month: 'long', day: 'numeric' })} {' | '} {tx.accounts?.name || t('unknownAccount')} {tx.materials && ` | ${tx.materials.name} (${Math.abs(tx.material_quantity_affected)} ${t(tx.materials.unit_type?.toLowerCase()) || tx.materials.unit_type})`} </p> </div> <div className="flex items-center space-s-2 shrink-0"> <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirm(tx);}} title={t('delete')} className="text-nuzum-danger opacity-0 group-hover:opacity-100 focus:opacity-100 !p-1.5 transition-opacity"> <FiTrash2 className="w-4 h-4"/> </Button> <FiChevronRight className={`w-5 h-5 text-nuzum-text-secondary transition-transform group-hover:translate-x-1 group-hover:text-nuzum-text-primary ${i18n.dir() === 'rtl' ? 'transform rotate-180 group-hover:-translate-x-1' : ''}`} /> </div> </div> </Link> </li> ))} </ul> </div> )} 
      <Modal 
        isOpen={isTransactionModalOpen} 
        onClose={handleCloseTransactionModal} 
        title={isTransferModalActive ? t('accountTransfer') : t('addNewTransaction')} 
        size="lg"
      >
        <TransactionForm 
            onSubmit={handleSubmitTransactionOrTransfer} 
            onCancel={handleCloseTransactionModal} 
            isLoading={formLoading}
            isTransferMode={isTransferModalActive} 
            accounts={accounts} 
            materials={materials}
            currencies={availableCurrencies} 
        />
      </Modal>
      <Modal isOpen={showDeleteConfirm} onClose={closeDeleteConfirm} title={t('confirmDeletionTitle')} size="sm"> <p className="text-nuzum-text-secondary">{t('confirmDeleteTransaction')}</p> <div className="flex justify-end space-s-3 pt-5"> <Button variant="secondary" onClick={closeDeleteConfirm} disabled={formLoading}>{t('no')}</Button> <Button variant="danger" onClick={() => handleDeleteTransaction(transactionToDelete)} isLoading={formLoading} disabled={formLoading}>{t('yesDelete')}</Button> </div> </Modal> 
    </div>
  );
};

export default TransactionsPage;