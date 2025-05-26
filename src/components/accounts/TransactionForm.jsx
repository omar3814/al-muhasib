import React, { useState, useEffect, useCallback } from 'react'; // useCallback might not be strictly needed here but good practice
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';
import { CURRENCIES, DEFAULT_CURRENCY, getCurrencyDisplay } from '../../utils/currencies';
import toast from 'react-hot-toast';
import { FiUploadCloud, FiImage, FiPaperclip } from 'react-icons/fi';

const TransactionForm = ({ onSubmit, onCancel, initialData, isLoading, isTransferMode: externalIsTransferMode = false, setIsTransferMode: setExternalIsTransferMode }) => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();

  // Internal state for type, defaulting based on prop or to 'expense'
  const [type, setType] = useState(externalIsTransferMode ? 'transfer' : (initialData?.type || 'expense'));
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY.code);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [fromAccountId, setFromAccountId] = useState(''); 
  const [toAccountId, setToAccountId] = useState('');

  const [materialId, setMaterialId] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const fileInputRef = React.useRef(null);

  const [accounts, setAccounts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [availableToAccounts, setAvailableToAccounts] = useState([]);
  const [errors, setErrors] = useState({});
  const [sourceAccountDetails, setSourceAccountDetails] = useState(null);

  // Sync internal type with external prop if it changes
  useEffect(() => {
    setType(externalIsTransferMode ? 'transfer' : (initialData?.type || 'expense'));
  }, [externalIsTransferMode, initialData]);


  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const { data: accData, error: accError } = await supabase.from('accounts').select('id, name, currency, balance').eq('user_id', user.id).order('name', { ascending: true });
        if (accError) throw accError;
        setAccounts(accData || []);
        const { data: matData, error: matError } = await supabase.from('materials').select('id, name, unit_type').eq('user_id', user.id).order('name', { ascending: true });
        if (matError) throw matError;
        setMaterials(matData || []);
      } catch (error) {
        toast.error(t('errorFetchingDropdownData'));
      }
    };
    fetchData();
  }, [user, t]);

  useEffect(() => {
    if (initialData) {
      setAmount(String(initialData.amount || ''));
      setCurrency(initialData.currency || DEFAULT_CURRENCY.code);
      setDate(initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setNotes(initialData.notes || '');
      setFromAccountId(initialData.account_id || ''); // For income/expense, this is the main account_id
      if (initialData.type === 'transfer_internal_expense') { // Assuming transfer stored as two tx
          // This logic might need adjustment based on how transfers are stored/retrieved for editing
          // For now, edit is not fully supported for transfers in this form
      }
      setMaterialId(initialData.material_id || '');
      setMaterialQuantity(String(initialData.material_quantity_affected || ''));
      setExistingImageUrl(initialData.image_url || null);
      setImagePreview(initialData.image_url || null);
      setImageFile(null);
    } else {
      setAmount('');
      setCurrency(DEFAULT_CURRENCY.code);
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setFromAccountId('');
      setToAccountId('');
      setMaterialId('');
      setMaterialQuantity('');
      setImageFile(null);
      setImagePreview(null);
      setExistingImageUrl(null);
    }
  }, [initialData]);
  
  useEffect(() => {
    const currentFromAccount = accounts.find(acc => acc.id === fromAccountId);
    setSourceAccountDetails(currentFromAccount || null);
    if (currentFromAccount) {
      setCurrency(currentFromAccount.currency);
      if (type === 'transfer') {
        setAvailableToAccounts(accounts.filter(acc => acc.id !== fromAccountId && acc.currency === currentFromAccount.currency));
        if (toAccountId && !accounts.find(acc => acc.id === toAccountId && acc.id !== fromAccountId && acc.currency === currentFromAccount.currency)) {
          setToAccountId('');
        }
      }
    } else {
      setCurrency(DEFAULT_CURRENCY.code);
      if (type === 'transfer') {
        setAvailableToAccounts(accounts.filter(acc => acc.id !== fromAccountId));
      }
    }
  }, [fromAccountId, accounts, type, toAccountId]); // Added toAccountId to re-filter if 'type' changes while 'toAccountId' is set

  // THIS IS THE MISSING FUNCTION
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        setErrors(prev => ({ ...prev, image: t('imageSizeTooLarge') })); 
        setImageFile(null); 
        setImagePreview(existingImageUrl || null); 
        if(fileInputRef.current) fileInputRef.current.value = '';
        return; 
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { 
        setErrors(prev => ({ ...prev, image: t('invalidImageType') })); 
        setImageFile(null); 
        setImagePreview(existingImageUrl || null); 
        if(fileInputRef.current) fileInputRef.current.value = '';
        return; 
      }
      setErrors(prev => ({ ...prev, image: '' })); 
      setImageFile(file); 
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const validate = () => { const newErrors = {}; if (!fromAccountId) newErrors.fromAccountId = t('requiredField'); if (type === 'transfer' && !toAccountId) newErrors.toAccountId = t('selectDestinationAccountError'); if (type === 'transfer' && fromAccountId && toAccountId && fromAccountId === toAccountId) newErrors.toAccountId = t('sourceDestSameError'); if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) newErrors.amount = t('invalidAmountPositiveError'); if (!date) newErrors.date = t('requiredField'); if (sourceAccountDetails && sourceAccountDetails.currency !== currency) { if (type === 'transfer') newErrors.currency = t('transferCurrencyMustMatchSource'); /* For income/expense, currency is taken from account, so this shouldn't error */ } if (sourceAccountDetails && parseFloat(sourceAccountDetails.balance) < parseFloat(amount) && type !== 'income') { newErrors.amount = t('insufficientFundsError'); } if (materialId && type !== 'transfer') { if (materialQuantity.trim() === '' || isNaN(parseInt(materialQuantity)) || parseInt(materialQuantity) === 0) newErrors.materialQuantity = t('invalidMaterialQuantityError'); } else if (materialQuantity.trim() !== '' && type !== 'transfer' && !materialId) { newErrors.materialId = t('selectMaterialForQuantityError');} setErrors(newErrors); return Object.keys(newErrors).length === 0;};
  const handleSubmit = async (e) => { e.preventDefault(); if (!validate()) return; if (!user || !user.id) { toast.error(t('userNotAuthenticatedError')); return; } let uploadedTransactionImageUrl = existingImageUrl; if (imageFile) { const fileExt = imageFile.name.split('.').pop(); const fileName = `tx-${Date.now()}.${fileExt}`; const filePath = `${user.id}/${fileName}`; if (existingImageUrl && user && user.id) { try { const oldImageKey = existingImageUrl.substring(existingImageUrl.indexOf(`${user.id}/`)); if (oldImageKey.startsWith(`${user.id}/`)) await supabase.storage.from('transaction-images').remove([oldImageKey]); } catch(imgErr){ console.warn("Failed to delete old transaction image", imgErr);}} const { error: uploadError } = await supabase.storage.from('transaction-images').upload(filePath, imageFile); if (uploadError) { toast.error(t('imageUploadFailed') + `: ${uploadError.message}`); return; } const { data: urlData } = supabase.storage.from('transaction-images').getPublicUrl(filePath); uploadedTransactionImageUrl = urlData?.publicUrl; } const commonData = { amount: parseFloat(amount), currency, date, notes: notes.trim(), image_url: uploadedTransactionImageUrl, }; if (type === 'transfer') { onSubmit({ isTransfer: true, fromAccountId, toAccountId, ...commonData }); } else { let finalMaterialQuantityAffected = materialId ? parseInt(materialQuantity) : null; if (materialId && finalMaterialQuantityAffected !== null) { finalMaterialQuantityAffected = type === 'expense' ? -Math.abs(finalMaterialQuantityAffected) : Math.abs(finalMaterialQuantityAffected); } onSubmit({ isTransfer: false, type, account_id: fromAccountId, material_id: materialId || null, material_quantity_affected: finalMaterialQuantityAffected, ...commonData }); } };
  const selectedMaterialUnit = materialId ? materials.find(m => m.id === materialId)?.unit_type : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="transactionType" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('transactionType')} <span className="text-nuzum-danger">*</span></label>
        <div className="flex rounded-lg shadow-sm bg-nuzum-surface border border-nuzum-border overflow-hidden">
            {['expense', 'income', 'transfer'].map(txType => (
                <button type="button" key={txType} onClick={() => { setType(txType); if(setExternalIsTransferMode) setExternalIsTransferMode(txType === 'transfer');}}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors duration-150
                        ${type === txType ? (txType === 'transfer' ? 'bg-blue-600 text-white' : (txType === 'income' ? 'bg-nuzum-success text-white' : 'bg-nuzum-danger text-white')) : 'text-nuzum-text-secondary hover:bg-nuzum-border'}
                        ${txType === 'income' ? 'border-s border-e border-nuzum-border' : ''} `} >
                    {t(txType)}
                </button>
            ))}
        </div>
      </div>
      <Input id="date" label={t('date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} required />
      <div>
        <label htmlFor="fromAccountId" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{type === 'transfer' ? t('fromAccount') : t('account')} <span className="text-nuzum-danger">*</span></label>
        <select id="fromAccountId" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={`input-style ${errors.fromAccountId ? 'border-nuzum-danger' : ''}`} required >
          <option value="">{t('selectAccount')}</option>
          {(accounts || []).map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance, acc.currency, t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)})</option>))}
        </select>
        {errors.fromAccountId && <p className="mt-1 text-xs text-nuzum-danger">{errors.fromAccountId}</p>}
      </div>
      {type === 'transfer' && (
        <div>
          <label htmlFor="toAccountId" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('toAccount')} <span className="text-nuzum-danger">*</span></label>
          <select id="toAccountId" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={`input-style ${errors.toAccountId ? 'border-nuzum-danger' : ''}`} required disabled={!fromAccountId || availableToAccounts.length === 0}>
            <option value="">{t('selectAccount')}</option>
            {availableToAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({getCurrencyDisplay(acc.currency, t, 'symbol')})</option>))}
          </select>
          {errors.toAccountId && <p className="mt-1 text-xs text-nuzum-danger">{errors.toAccountId}</p>}
          {!fromAccountId && <p className="mt-1 text-xs text-nuzum-text-secondary">{t('selectSourceFirst')}</p>}
          {fromAccountId && availableToAccounts.length === 0 && <p className="mt-1 text-xs text-nuzum-text-secondary">{t('noMatchingCurrencyAccounts')}</p>}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <Input id="amount" label={t('amount')} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0.01" placeholder="0.00" error={errors.amount} required inputClassName={sourceAccountDetails && parseFloat(amount) > parseFloat(sourceAccountDetails.balance) && type !== 'income' ? '!border-nuzum-danger' : ''}/>
        {sourceAccountDetails && (<div className="pt-1 md:pt-7"><p className={`text-xs ${sourceAccountDetails && parseFloat(amount) > parseFloat(sourceAccountDetails.balance) && type !== 'income' ? 'text-nuzum-danger' : 'text-nuzum-text-secondary'}`}>{t('availableBalance')}: {formatCurrency(sourceAccountDetails.balance, sourceAccountDetails.currency, t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</p></div>)}
      </div>
      <div>
        <label htmlFor="transactionCurrencyDisplay" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('currency')}</label>
        <Input id="transactionCurrencyDisplay" value={currency ? (getCurrencyDisplay(currency, t, 'name') + ` (${currency})`) : (type === 'transfer' ? t('selectSourceAccountFirst') : t('selectAccountFirst'))} disabled inputClassName="bg-nuzum-bg-deep cursor-not-allowed"/>
        {errors.currency && <p className="mt-1 text-xs text-nuzum-danger">{errors.currency}</p>}
      </div>
      {type !== 'transfer' && (
        <>
          <hr className="border-pa-dark-border my-5"/>
          <p className="text-sm font-medium text-pa-text-secondary -mb-2">{t('optionalMaterialSection')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end"> <div> <label htmlFor="materialId" className="block text-sm font-medium text-pa-text-secondary mb-1">{t('linkedMaterial')}</label> <select id="materialId" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={`input-style ${errors.materialId ? 'border-pa-danger' : ''}`} > <option value="">{t('selectMaterialOptional')}</option> {materials.map(mat => (<option key={mat.id} value={mat.id}>{mat.name}</option>))} </select> {errors.materialId && <p className="mt-1 text-xs text-pa-danger">{errors.materialId}</p>} </div> <Input id="materialQuantity" label={`${t('quantity')} ${selectedMaterialUnit ? `(${t(selectedMaterialUnit.toLowerCase()) || selectedMaterialUnit})` : ''}`} type="number" value={materialQuantity} onChange={(e) => setMaterialQuantity(e.target.value)} step="1" placeholder="0" error={errors.materialQuantity} disabled={!materialId} /> </div>
          <hr className="border-pa-dark-border my-5"/>
          <div> <label className="block text-sm font-medium text-pa-text-secondary mb-1"> {t('transactionImageOptional')} ({t('optional')}) </label> <div className="mt-1 flex items-center space-s-4 p-3 border-2 border-dashed border-pa-dark-border rounded-lg hover:border-pa-accent-interactive"> <div className="shrink-0 h-24 w-24 bg-pa-dark-bg rounded-md flex items-center justify-center overflow-hidden"> {imagePreview ? ( <img src={imagePreview} alt={t('imagePreview')} className="h-full w-full object-cover" /> ) : ( <FiPaperclip className="h-12 w-12 text-pa-text-placeholder" /> )} </div> <div className="flex-1"> <input type="file" id="transactionImage" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} className="hidden" ref={fileInputRef} /> <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} leftIcon={<FiUploadCloud />}> {imageFile || existingImageUrl ? t('changeImage') : t('uploadImage')} </Button> {imageFile && (<Button type="button" variant="secondary" size="sm" onClick={() => { setImageFile(null); setImagePreview(existingImageUrl || null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="ms-2 !py-1 !px-2">{t('clearSelection')}</Button>)} <p className="text-xs text-pa-text-secondary mt-2">{t('imageUploadNote')}</p> {errors.image && <p className="mt-1 text-xs text-pa-danger">{errors.image}</p>} </div> </div> </div>
        </>
      )}
      <div className="mt-4"> <label htmlFor="notes" className="block text-sm font-medium text-pa-text-secondary mb-1">{t('notes')} ({t('optional')})</label> <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" className="input-style" placeholder={type === 'transfer' ? t('transferNotesPlaceholder') : t('transactionNotesPlaceholder')}></textarea> </div>
      <div className="flex justify-end space-s-3 pt-6"> <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>{t('cancel')}</Button> <Button type="submit" variant="accent" isLoading={isLoading} disabled={isLoading}>{initialData ? t('saveChanges') : (type === 'transfer' ? t('confirmTransfer') : t('addTransaction'))}</Button> </div>
    </form>
  );
};

export default TransactionForm;