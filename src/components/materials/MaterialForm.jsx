import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HARDCODED_DEFAULT_CURRENCY, getCurrencyDisplayInfo, formatCurrency } from '../../utils/currencies'; 
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import Input from '../common/Input';
import Button from '../common/Button';
import { FiUploadCloud, FiImage, FiDollarSign } from 'react-icons/fi'; // Added FiDollarSign

const MaterialForm = ({ onSubmit, onCancel, initialData, isLoading, currencies, accounts: passedAccounts = [] }) => { // Added accounts prop
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  
  // Material Fields
  const [name, setName] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('0.00'); // This will be cost price for new acquisition
  const [materialCurrency, setMaterialCurrency] = useState(initialData?.currency || HARDCODED_DEFAULT_CURRENCY.code); // Currency of the material's price
  const [quantity, setQuantity] = useState('0'); // Quantity being added/purchased now
  const [unitType, setUnitType] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  
  // Transaction Fields (for purchase)
  const [isCreatingPurchaseTransaction, setIsCreatingPurchaseTransaction] = useState(true); // Default to creating purchase tx for new material
  const [purchaseAccountId, setPurchaseAccountId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const [availableCurrencies, setAvailableCurrencies] = useState(currencies || []);
  const [accounts, setAccounts] = useState(passedAccounts || []); // Use passed accounts

  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => { setAvailableCurrencies(currencies || []); setAccounts(passedAccounts || []);}, [currencies, passedAccounts]);

  useEffect(() => {
    if (initialData) { // Editing existing material
      setName(initialData.name || '');
      setPricePerUnit(String(initialData.price_per_unit || '0.00')); // Current selling price (or last cost if tracked)
      setMaterialCurrency(initialData.currency || HARDCODED_DEFAULT_CURRENCY.code);
      // For edit, quantity field might mean "add this much more stock" or "set total stock to this"
      // Let's assume "add this much more stock" for simplicity if we link it to a purchase transaction
      setQuantity('0'); // When editing, prompt for quantity *being added now*
      setUnitType(initialData.unit_type || '');
      setExistingImageUrl(initialData.image_url || null);
      setImagePreview(initialData.image_url || null);
      setImageFile(null);
      setIsCreatingPurchaseTransaction(false); // By default, don't create tx when just editing material details
    } else { // Adding new material
      setName(''); setPricePerUnit('0.00');
      setMaterialCurrency(availableCurrencies.find(c=>c.code === 'JOD')?.code || (availableCurrencies.length > 0 ? availableCurrencies[0].code : HARDCODED_DEFAULT_CURRENCY.code));
      setQuantity('0'); setUnitType('');
      setImageFile(null); setImagePreview(null); setExistingImageUrl(null);
      setIsCreatingPurchaseTransaction(true); // Default to creating purchase tx for new material
      setPurchaseAccountId(''); setPurchaseDate(new Date().toISOString().split('T')[0]); setPurchaseNotes('');
    }
  }, [initialData, availableCurrencies]);

  const handleImageChange = (e) => { /* ... same as before ... */ const file = e.target.files[0]; if (file) { if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, image: t('imageSizeTooLarge') }));setImageFile(null);setImagePreview(existingImageUrl || null); if(fileInputRef.current) fileInputRef.current.value = ''; return; } if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setErrors(prev => ({ ...prev, image: t('invalidImageType') }));setImageFile(null);setImagePreview(existingImageUrl || null); if(fileInputRef.current) fileInputRef.current.value = ''; return; } setErrors(prev => ({ ...prev, image: '' }));setImageFile(file);setImagePreview(URL.createObjectURL(file)); }};
  
  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = t('requiredField');
    if (pricePerUnit.trim() === '' || isNaN(parseFloat(pricePerUnit)) || parseFloat(pricePerUnit) < 0) newErrors.pricePerUnit = t('invalidAmountError');
    if (!materialCurrency) newErrors.materialCurrency = t('requiredField');
    if (quantity.trim() === '' || isNaN(parseInt(quantity)) || parseInt(quantity) < 0) newErrors.quantity = t('invalidQuantityError');
    if (parseInt(quantity) === 0 && !initialData) newErrors.quantity = t('quantityMustBePositiveForNew') || 'Quantity must be > 0 for new material.';
    // Add "quantityMustBePositiveForNew": "الكمية يجب ان تكون اكبر من صفر للمادة الجديدة."
    if (!unitType.trim()) newErrors.unitType = t('requiredField');
    
    if (isCreatingPurchaseTransaction) {
      if (!purchaseAccountId) newErrors.purchaseAccountId = t('selectAccountError');
      if (!purchaseDate) newErrors.purchaseDate = t('requiredField');
      if (parseInt(quantity) <= 0) newErrors.quantity = t('quantityForPurchaseError') || 'Purchase quantity must be greater than 0.';
      // Add "quantityForPurchaseError": "كمية الشراء يجب ان تكون اكبر من صفر."
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!user || !user.id) { toast.error(t('userNotAuthenticatedError')); return; }

    let uploadedMaterialImageUrl = existingImageUrl;
    if (imageFile) { /* ... image upload logic same as before, for material image ... */ const fileExt = imageFile.name.split('.').pop(); const fileName = `mat-${Date.now()}.${fileExt}`; const filePath = `${user.id}/${fileName}`; if (initialData && initialData.image_url && user && user.id) { const oldImageKey = initialData.image_url.substring(initialData.image_url.indexOf(`${user.id}/`)); if (oldImageKey.startsWith(`${user.id}/`)) { await supabase.storage.from('material-images').remove([oldImageKey]); }} const { error: uploadError } = await supabase.storage.from('material-images').upload(filePath, imageFile); if (uploadError) { toast.error(t('imageUploadFailed') + `: ${uploadError.message}`); return; } const { data: urlData } = supabase.storage.from('material-images').getPublicUrl(filePath); uploadedMaterialImageUrl = urlData?.publicUrl; }
    
    const materialPayload = {
      name: name.trim(),
      price_per_unit: parseFloat(pricePerUnit), // This is cost price if purchasing
      currency: materialCurrency,
      quantity_to_add: parseInt(quantity), // Quantity being purchased/added now
      unit_type: unitType.trim(),
      image_url: uploadedMaterialImageUrl,
      ...(initialData && initialData.id && { id: initialData.id, current_quantity: initialData.quantity }), // Pass current_quantity if editing
    };

    let purchaseTransactionPayload = null;
    if (isCreatingPurchaseTransaction && parseInt(quantity) > 0 && purchaseAccountId) {
      const selectedAccount = accounts.find(acc => acc.id === purchaseAccountId);
      if (!selectedAccount) {
        toast.error(t('invalidPurchaseAccountError') || "Invalid account selected for purchase.");
        // Add "invalidPurchaseAccountError": "الحساب المحدد للشراء غير صالح."
        return;
      }
      purchaseTransactionPayload = {
        account_id: purchaseAccountId,
        amount: parseFloat(pricePerUnit) * parseInt(quantity),
        currency: selectedAccount.currency, // Transaction currency from the selected account
        date: purchaseDate,
        notes: `${t('purchaseOfMaterial') || 'Purchase of'} ${name.trim()}${purchaseNotes ? ` - ${purchaseNotes.trim()}` : ''}`,
        // Add "purchaseOfMaterial": "شراء مادة"
        type: 'expense', // Purchase is an expense
        material_id_to_link: null, // Will be set after material is created/updated
        material_quantity_affected: parseInt(quantity), // Positive, as it's adding to stock via this purchase
      };
    }
    onSubmit(materialPayload, purchaseTransactionPayload); // Pass both payloads to parent
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input id="materialName" label={t('materialName')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required placeholder={t('materialNamePlaceholder')} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input id="pricePerUnit" label={initialData ? t('materialPrice') : t('costPricePerUnit')} // Adjust label based on context
          // Add "materialPrice": "سعر المادة (البيع)"
          // Add "costPricePerUnit": "تكلفة الوحدة (الشراء)"
          type="number" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} step="0.01" min="0" placeholder="0.00" error={errors.pricePerUnit} required />
        <div>
          <label htmlFor="materialCurrency" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('currency')} <span className="text-nuzum-danger">*</span></label>
          <select id="materialCurrency" value={materialCurrency} onChange={(e) => setMaterialCurrency(e.target.value)} className={`input-style ${errors.materialCurrency ? 'border-nuzum-danger' : ''}`} required>
            {(availableCurrencies.length > 0 ? availableCurrencies : [HARDCODED_DEFAULT_CURRENCY]).map(c => { const displayInfo = getCurrencyDisplayInfo(c.code, availableCurrencies, t); return (<option key={c.id || c.code} value={c.code}>{displayInfo.name} ({displayInfo.symbol})</option>); })}
          </select>
          {errors.materialCurrency && <p className="mt-1 text-xs text-nuzum-danger">{errors.materialCurrency}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input id="quantity" label={initialData ? t('addStockQuantity') : t('initialStockQuantity')} 
          // Add "addStockQuantity": "كمية لإضافتها للمخزون"
          // Add "initialStockQuantity": "كمية المخزون الأولية"
          type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} step="1" min="0" placeholder="0" error={errors.quantity} required />
        <Input id="unitType" label={t('unitType')} value={unitType} onChange={(e) => setUnitType(e.target.value)} error={errors.unitType} required placeholder={t('unitTypePlaceholder')} />
      </div>
      <div> {/* Image Upload ... same as before ... */} <label className="block text-sm font-medium text-nuzum-text-secondary mb-1"> {t('photo')} ({t('optional')}) </label> <div className="mt-1 flex items-center space-s-4 p-3 border-2 border-dashed border-nuzum-border rounded-lg hover:border-nuzum-accent-primary"> <div className="shrink-0 h-24 w-24 bg-nuzum-bg-deep rounded-md flex items-center justify-center overflow-hidden"> {imagePreview ? ( <img src={imagePreview} alt={t('materialPreview')} className="h-full w-full object-cover" /> ) : ( <FiImage className="h-12 w-12 text-nuzum-text-placeholder" /> )} </div> <div className="flex-1"> <input type="file" id="materialImage" accept="image/png, image/jpeg, image/webp, image/gif" onChange={handleImageChange} className="hidden" ref={fileInputRef} /> <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} leftIcon={<FiUploadCloud />}> {imageFile || existingImageUrl ? t('changeImage') : t('uploadImage')} </Button> {imageFile && (<Button type="button" variant="secondary" size="sm" onClick={() => { setImageFile(null); setImagePreview(existingImageUrl || null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="ms-2 !py-1 !px-2">{t('clearSelection')}</Button>)} <p className="text-xs text-nuzum-text-secondary mt-2">{t('imageUploadNote')}</p> {errors.image && <p className="mt-1 text-xs text-nuzum-danger">{errors.image}</p>} </div> </div> </div>
      
      {/* Purchase Transaction Fields */}
      <hr className="border-nuzum-border my-6"/>
      <div className="space-y-1">
        <label className="flex items-center space-s-3 cursor-pointer">
            <input 
                type="checkbox" 
                checked={isCreatingPurchaseTransaction}
                onChange={(e) => setIsCreatingPurchaseTransaction(e.target.checked)}
                className="h-4 w-4 text-nuzum-accent-primary bg-nuzum-surface border-nuzum-border rounded focus:ring-nuzum-accent-primary focus:ring-offset-nuzum-surface"
            />
            <span className="text-sm font-medium text-nuzum-text-primary">{t('recordPurchaseTransaction') || 'Record this as a purchase transaction?'}</span>
            {/* Add "recordPurchaseTransaction": "تسجيل هذه كمعاملة شراء؟" */}
        </label>
        <p className="text-xs text-nuzum-text-secondary ps-7">{t('recordPurchaseTransactionHelp') || 'If checked, an expense transaction will be created for this material acquisition.'}</p>
        {/* Add "recordPurchaseTransactionHelp": "إذا تم تحديده، سيتم إنشاء معاملة مصروف لاقتناء هذه المادة." */}
      </div>

      {isCreatingPurchaseTransaction && (
        <div className="p-4 border border-nuzum-border rounded-lg space-y-4 mt-3 bg-nuzum-bg-deep">
            <h4 className="text-md font-semibold text-nuzum-text-primary border-b border-nuzum-border pb-2">{t('purchaseDetails') || "Purchase Transaction Details"}</h4>
            {/* Add "purchaseDetails": "تفاصيل معاملة الشراء" */}
            <div>
                <label htmlFor="purchaseAccountId" className="block text-sm font-medium text-nuzum-text-secondary mb-1">{t('purchasedFromAccount') || 'Purchased From Account'} <span className="text-nuzum-danger">*</span></label>
                {/* Add "purchasedFromAccount": "تم الشراء من حساب" */}
                <select id="purchaseAccountId" value={purchaseAccountId} onChange={(e) => setPurchaseAccountId(e.target.value)} className={`input-style ${errors.purchaseAccountId ? 'border-nuzum-danger' : ''}`} required={isCreatingPurchaseTransaction}>
                    <option value="">{t('selectAccount')}</option>
                    {(accounts || []).map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance, acc.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)})</option>))}
                </select>
                {errors.purchaseAccountId && <p className="mt-1 text-xs text-nuzum-danger">{errors.purchaseAccountId}</p>}
            </div>
            <Input id="purchaseDate" label={t('purchaseDate') || "Date of Purchase"} type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} error={errors.purchaseDate} required={isCreatingPurchaseTransaction} />
            {/* Add "purchaseDate": "تاريخ الشراء" */}
            <Input id="purchaseNotes" label={t('purchaseNotesOptional') || "Purchase Notes (Optional)"} value={purchaseNotes} onChange={(e) => setPurchaseNotes(e.target.value)} placeholder={t('egSupplierInvoice') || "e.g., Supplier invoice #123"} />
            {/* Add "purchaseNotesOptional": "ملاحظات الشراء (اختياري)" */}
            {/* Add "egSupplierInvoice": "مثال: فاتورة المورد رقم 123" */}
        </div>
      )}

      <div className="flex justify-end space-s-3 pt-4"><Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>{t('cancel')}</Button><Button type="submit" variant="accent" isLoading={isLoading} disabled={isLoading}>{initialData?.id ? t('saveChanges') : t('addMaterial')}</Button></div>
    </form>
  );
};

export default MaterialForm;