import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HARDCODED_DEFAULT_CURRENCY, getCurrencyDisplayInfo, formatCurrency } from '../../utils/currencies'; 
import { supabase } from '../../lib/supabaseClient'; 
import { useAuth } from '../../contexts/AuthContext'; 
import Input from '../common/Input';
import Button from '../common/Button';
import toast from 'react-hot-toast'; 
import { FiUploadCloud, FiImage, FiPaperclip } from 'react-icons/fi'; 

const TransactionForm = ({ 
    onSubmit, 
    onCancel, 
    initialData, 
    isLoading, 
    isTransferMode: externalIsTransferMode = false,
    accounts: passedAccounts = [], 
    materials: passedMaterials = [],
    currencies: passedAvailableCurrencies = []
}) => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();

  const [type, setType] = useState(externalIsTransferMode ? 'transfer' : (initialData?.type || 'expense'));
  const [amount, setAmount] = useState('');
  const [transactionCurrency, setTransactionCurrency] = useState(HARDCODED_DEFAULT_CURRENCY.code); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Initialize fromAccountId directly from initialData or as empty string
  const [fromAccountId, setFromAccountId] = useState(initialData?.account_id || ''); 
  
  const [toAccountId, setToAccountId] = useState(initialData?.to_account_id || '');
  const [materialId, setMaterialId] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const fileInputRef = React.useRef(null);
  
  const [availableToAccounts, setAvailableToAccounts] = useState([]);
  const [errors, setErrors] = useState({});
  const [sourceAccountDetails, setSourceAccountDetails] = useState(null);

  useEffect(() => {
    console.log("TransactionForm: Props received on render/update - passedAccounts:", passedAccounts);
    setType(externalIsTransferMode ? 'transfer' : (initialData?.type || 'expense'));
  }, [externalIsTransferMode, initialData, passedAccounts]);

  useEffect(() => {
    if (initialData) {
      setAmount(String(initialData.amount || ''));
      setTransactionCurrency(initialData.currency || HARDCODED_DEFAULT_CURRENCY.code);
      setDate(initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setNotes(initialData.notes || '');
      // setFromAccountId(initialData.account_id || ''); // Already handled in useState init
      setToAccountId(initialData.to_account_id || '');
      setMaterialId(initialData.material_id || '');
      setMaterialQuantity(String(initialData.material_quantity_affected || ''));
      setExistingImageUrl(initialData.image_url || null);
      setImagePreview(initialData.image_url || null);
      setImageFile(null);
    } else {
      // Reset for new form
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setFromAccountId(''); // Explicitly reset for new form
      setToAccountId('');
      setMaterialId('');
      setMaterialQuantity('');
      setImageFile(null);
      setImagePreview(null);
      setExistingImageUrl(null);
      // Default currency setting logic
      const defaultCurrencyToSet = (passedAvailableCurrencies && passedAvailableCurrencies.length > 0) 
        ? (passedAvailableCurrencies.find(c => c.code === 'JOD')?.code || passedAvailableCurrencies[0].code) 
        : HARDCODED_DEFAULT_CURRENCY.code;
      setTransactionCurrency(defaultCurrencyToSet);
    }
  }, [initialData, passedAvailableCurrencies]); // Removed fromAccountId from here to avoid loop with next effect
  
  useEffect(() => {
    const currentFromAccount = (passedAccounts || []).find(acc => acc.id === fromAccountId);
    setSourceAccountDetails(currentFromAccount || null);
    if (currentFromAccount) {
      setTransactionCurrency(currentFromAccount.currency);
      if (type === 'transfer') {
        setAvailableToAccounts((passedAccounts || []).filter(acc => acc.id !== fromAccountId && acc.currency === currentFromAccount.currency));
        if (toAccountId && !(passedAccounts || []).find(acc => acc.id === toAccountId && acc.id !== fromAccountId && acc.currency === currentFromAccount.currency)) {
          setToAccountId('');
        }
      }
    } else {
      // If fromAccountId is cleared, reset transactionCurrency (unless editing and had an initial value)
      if (!initialData?.currency) {
        const defaultCurrencyToSet = (passedAvailableCurrencies && passedAvailableCurrencies.length > 0) 
            ? (passedAvailableCurrencies.find(c => c.code === 'JOD')?.code || passedAvailableCurrencies[0].code) 
            : HARDCODED_DEFAULT_CURRENCY.code;
        setTransactionCurrency(defaultCurrencyToSet);
      }
      if (type === 'transfer') { setAvailableToAccounts((passedAccounts || []).filter(acc => acc.id !== fromAccountId)); }
    }
  }, [fromAccountId, passedAccounts, type, toAccountId, initialData, passedAvailableCurrencies]);

  const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, image: t('imageSizeTooLarge') })); setImageFile(null); setImagePreview(existingImageUrl || null); if(fileInputRef.current) fileInputRef.current.value = ''; return; } if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setErrors(prev => ({ ...prev, image: t('invalidImageType') })); setImageFile(null); setImagePreview(existingImageUrl || null); if(fileInputRef.current) fileInputRef.current.value = ''; return; } setErrors(prev => ({ ...prev, image: '' })); setImageFile(file); setImagePreview(URL.createObjectURL(file)); }};
  const validate = () => { /* ... same as before ... */ const newErrors = {}; if (!fromAccountId) newErrors.fromAccountId = t('requiredField'); if (type === 'transfer' && !toAccountId) newErrors.toAccountId = t('selectDestinationAccountError'); if (type === 'transfer' && fromAccountId && toAccountId && fromAccountId === toAccountId) newErrors.toAccountId = t('sourceDestSameError'); if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) newErrors.amount = t('invalidAmountPositiveError'); if (!date) newErrors.date = t('requiredField'); if (sourceAccountDetails && sourceAccountDetails.currency !== transactionCurrency) { if (type === 'transfer') newErrors.currency = t('transferCurrencyMustMatchSource'); } if (sourceAccountDetails && parseFloat(sourceAccountDetails.balance) < parseFloat(amount) && type !== 'income') { newErrors.amount = t('insufficientFundsError'); } if (materialId && type !== 'transfer') { if (materialQuantity.trim() === '' || isNaN(parseInt(materialQuantity)) || parseInt(materialQuantity) === 0) newErrors.materialQuantity = t('invalidMaterialQuantityError'); } else if (materialQuantity.trim() !== '' && type !== 'transfer' && !materialId) { newErrors.materialId = t('selectMaterialForQuantityError');} setErrors(newErrors); return Object.keys(newErrors).length === 0;};
  const handleSubmit = async (e) => { /* ... same as before ... */ e.preventDefault(); if (!validate()) return; if (!user || !user.id) { toast.error(t('userNotAuthenticatedError')); return; } let uploadedTransactionImageUrl = existingImageUrl; if (imageFile) { const fileExt = imageFile.name.split('.').pop(); const fileName = `tx-${Date.now()}.${fileExt}`; const filePath = `${user.id}/${fileName}`; if (existingImageUrl && user && user.id) { try { const oldImageKey = existingImageUrl.substring(existingImageUrl.indexOf(`${user.id}/`)); if (oldImageKey.startsWith(`${user.id}/`)) await supabase.storage.from('transaction-images').remove([oldImageKey]); } catch(imgErr){ console.warn("Failed to delete old transaction image", imgErr);}} const { error: uploadError } = await supabase.storage.from('transaction-images').upload(filePath, imageFile); if (uploadError) { toast.error(t('imageUploadFailed') + `: ${uploadError.message}`); return; } const { data: urlData } = supabase.storage.from('transaction-images').getPublicUrl(filePath); uploadedTransactionImageUrl = urlData?.publicUrl; } const commonData = { amount: parseFloat(amount), currency: transactionCurrency, date, notes: notes.trim(), image_url: uploadedTransactionImageUrl, }; if (type === 'transfer') { onSubmit({ isTransfer: true, fromAccountId, toAccountId, ...commonData }); } else { let finalMaterialQuantityAffected = materialId ? parseInt(materialQuantity) : null; if (materialId && finalMaterialQuantityAffected !== null) { finalMaterialQuantityAffected = type === 'expense' ? -Math.abs(finalMaterialQuantityAffected) : Math.abs(finalMaterialQuantityAffected); } onSubmit({ isTransfer: false, type, account_id: fromAccountId, material_id: materialId || null, material_quantity_affected: finalMaterialQuantityAffected, ...commonData }); } };
  const selectedMaterialUnit = (passedMaterials || []).find(m => m.id === materialId)?.unit_type || '';
  const typeButtonBaseClasses = "flex-1 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ease-in-out focus:z-10 focus:outline-none focus:ring-2 focus:ring-nuzum-accent-primary focus:ring-opacity-60";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('transactionType')} <span className="text-nuzum-danger">*</span></label>
        <div className="flex rounded-lg shadow-sm border border-nuzum-border overflow-hidden">
            <button type="button" onClick={() => setType('expense')} className={`${typeButtonBaseClasses} ${type === 'expense' ? 'bg-nuzum-danger text-white' : 'text-nuzum-text-secondary bg-nuzum-surface hover:bg-nuzum-border'} border-e border-nuzum-border`}>{t('expense')}</button>
            <button type="button" onClick={() => setType('income')} className={`${typeButtonBaseClasses} ${type === 'income' ? 'bg-nuzum-success text-white' : 'text-nuzum-text-secondary bg-nuzum-surface hover:bg-nuzum-border'} border-e border-nuzum-border`}>{t('income')}</button>
            <button type="button" onClick={() => setType('transfer')} className={`${typeButtonBaseClasses} ${type === 'transfer' ? 'bg-nuzum-accent-primary text-nuzum-accent-primary-content' : 'text-nuzum-text-secondary bg-nuzum-surface hover:bg-nuzum-border'}`}>{t('transfer')}</button>
        </div>
      </div>
      <Input id="date" label={t('date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} required />
      <div>
        <label htmlFor="fromAccountId" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{type === 'transfer' ? t('fromAccount') : t('account')} <span className="text-nuzum-danger">*</span></label>
        {/* DEBUG: Display the current fromAccountId state */}
        {/* <p className="text-xs text-nuzum-text-placeholder">Selected From Account ID: {fromAccountId || "None"}</p> */}
        <select 
          id="fromAccountId" 
          value={fromAccountId} // Crucial: Controlled component
          onChange={(e) => {
            console.log("From Account Selected - New Value:", e.target.value);
            setFromAccountId(e.target.value);
          }} 
          className={`input-style ${errors.fromAccountId ? 'border-nuzum-danger' : ''}`} 
          required 
        >
          <option value="">{t('selectAccount')}</option>
          {(passedAccounts || []).map(acc => 
            (acc && acc.id && acc.name ? (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ) : null)
          )}
        </select>
        {errors.fromAccountId && <p className="mt-1 text-xs text-nuzum-danger">{errors.fromAccountId}</p>}
      </div>
      {type === 'transfer' && (
        <div>
          <label htmlFor="toAccountId" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('toAccount')} <span className="text-nuzum-danger">*</span></label>
           {/* DEBUG: Display the current toAccountId state */}
          {/* <p className="text-xs text-nuzum-text-placeholder">Selected To Account ID: {toAccountId || "None"}</p> */}
          <select id="toAccountId" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={`input-style ${errors.toAccountId ? 'border-nuzum-danger' : ''}`} required disabled={!fromAccountId || availableToAccounts.length === 0}>
            <option value="">{t('selectAccount')}</option>
            {availableToAccounts.map(acc => (acc && acc.id && acc.name ? (<option key={acc.id} value={acc.id}>{acc.name}</option>) : null ))}
          </select>
          {errors.toAccountId && <p className="mt-1 text-xs text-nuzum-danger">{errors.toAccountId}</p>}
          {!fromAccountId && <p className="mt-1 text-xs text-nuzum-text-secondary">{t('selectSourceFirst')}</p>}
          {fromAccountId && availableToAccounts.length === 0 && <p className="mt-1 text-xs text-nuzum-text-secondary">{t('noMatchingCurrencyAccounts')}</p>}
        </div>
      )}
      {/* ... Rest of the form JSX IDENTICAL to the previous full version ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start"><Input id="amount" label={t('amount')} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0.01" placeholder="0.00" error={errors.amount} required inputClassName={sourceAccountDetails && parseFloat(amount) > parseFloat(sourceAccountDetails.balance) && type !== 'income' ? '!border-nuzum-danger' : ''}/>{sourceAccountDetails && (<div className="pt-1 md:pt-7"><p className={`text-xs ${sourceAccountDetails && parseFloat(amount) > parseFloat(sourceAccountDetails.balance) && type !== 'income' ? 'text-nuzum-danger' : 'text-nuzum-text-secondary'}`}>{t('availableBalance')}: {formatCurrency(sourceAccountDetails.balance, sourceAccountDetails.currency, t, passedAvailableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}</p></div>)}</div>
      <div><label htmlFor="transactionCurrencyDisplay" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('currency')}</label><Input id="transactionCurrencyDisplay" value={transactionCurrency ? (getCurrencyDisplayInfo(transactionCurrency, passedAvailableCurrencies, t).name + ` (${transactionCurrency})`) : (type === 'transfer' ? t('selectSourceAccountFirst') : t('selectAccountFirst'))} disabled inputClassName="bg-nuzum-bg-deep cursor-not-allowed"/>{errors.currency && <p className="mt-1 text-xs text-nuzum-danger">{errors.currency}</p>}</div>
      {type !== 'transfer' && (<><hr className="border-pa-dark-border my-5"/><p className="text-sm font-medium text-pa-text-secondary -mb-2">{t('optionalMaterialSection')}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end"> <div> <label htmlFor="materialId" className="block text-sm font-medium text-pa-text-secondary mb-1">{t('linkedMaterial')}</label> <select id="materialId" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={`input-style ${errors.materialId ? 'border-pa-danger' : ''}`} > <option value="">{t('selectMaterialOptional')}</option> {(passedMaterials || []).map(mat => (<option key={mat.id} value={mat.id}>{mat.name}</option>))} </select> {errors.materialId && <p className="mt-1 text-xs text-pa-danger">{errors.materialId}</p>} </div> <Input id="materialQuantity" label={`${t('quantity')} ${selectedMaterialUnit ? `(${t(selectedMaterialUnit.toLowerCase()) || selectedMaterialUnit})` : ''}`} type="number" value={materialQuantity} onChange={(e) => setMaterialQuantity(e.target.value)} step="1" placeholder="0" error={errors.materialQuantity} disabled={!materialId} /> </div><hr className="border-pa-dark-border my-5"/><div> <label className="block text-sm font-medium text-pa-text-secondary mb-1"> {t('transactionImageOptional')} ({t('optional')}) </label> <div className="mt-1 flex items-center space-s-4 p-3 border-2 border-dashed border-pa-dark-border rounded-lg hover:border-pa-accent-interactive"> <div className="shrink-0 h-24 w-24 bg-pa-dark-bg rounded-md flex items-center justify-center overflow-hidden"> {imagePreview ? ( <img src={imagePreview} alt={t('imagePreview')} className="h-full w-full object-cover" /> ) : ( <FiPaperclip className="h-12 w-12 text-pa-text-placeholder" /> )} </div> <div className="flex-1"> <input type="file" id="transactionImage" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} className="hidden" ref={fileInputRef} /> <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} leftIcon={<FiUploadCloud />}> {imageFile || existingImageUrl ? t('changeImage') : t('uploadImage')} </Button> {imageFile && (<Button type="button" variant="secondary" size="sm" onClick={() => { setImageFile(null); setImagePreview(existingImageUrl || null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="ms-2 !py-1 !px-2">{t('clearSelection')}</Button>)} <p className="text-xs text-pa-text-secondary mt-2">{t('imageUploadNote')}</p> {errors.image && <p className="mt-1 text-xs text-pa-danger">{errors.image}</p>} </div> </div> </div></>)}
      <div className="mt-4"> <label htmlFor="notes" className="block text-sm font-medium text-pa-text-secondary mb-1">{t('notes')} ({t('optional')})</label> <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" className="input-style" placeholder={type === 'transfer' ? t('transferNotesPlaceholder') : t('transactionNotesPlaceholder')}></textarea> </div>
      <div className="flex justify-end space-s-3 pt-6"> <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>{t('cancel')}</Button> <Button type="submit" variant="accent" isLoading={isLoading} disabled={isLoading}>{initialData ? t('saveChanges') : (type === 'transfer' ? t('confirmTransfer') : t('addTransaction'))}</Button> </div>
    </form>
  );
};

export default TransactionForm;