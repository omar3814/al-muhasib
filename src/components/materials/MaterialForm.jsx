import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../common/Input';
import Button from '../common/Button';
import { CURRENCIES, DEFAULT_CURRENCY } from '../../utils/currencies';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiUploadCloud, FiImage } from 'react-icons/fi';

const MaterialForm = ({ onSubmit, onCancel, initialData, isLoading }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth(); // Get user from context
  const [name, setName] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('0.00');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY.code);
  const [quantity, setQuantity] = useState('0');
  const [unitType, setUnitType] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPricePerUnit(String(initialData.price_per_unit || '0.00'));
      setCurrency(initialData.currency || DEFAULT_CURRENCY.code);
      setQuantity(String(initialData.quantity || '0'));
      setUnitType(initialData.unit_type || '');
      setExistingImageUrl(initialData.image_url || null);
      setImagePreview(initialData.image_url || null);
      setImageFile(null); 
    } else {
      setName('');
      setPricePerUnit('0.00');
      setCurrency(DEFAULT_CURRENCY.code);
      setQuantity('0');
      setUnitType('');
      setImageFile(null);
      setImagePreview(null);
      setExistingImageUrl(null);
    }
  }, [initialData]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: t('imageSizeTooLarge') }));
        setImageFile(null);
        setImagePreview(existingImageUrl || null);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        setErrors(prev => ({ ...prev, image: t('invalidImageType') }));
        setImageFile(null);
        setImagePreview(existingImageUrl || null);
        return;
      }
      setErrors(prev => ({ ...prev, image: '' }));
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = t('requiredField');
    if (pricePerUnit.trim() === '' || isNaN(parseFloat(pricePerUnit)) || parseFloat(pricePerUnit) < 0) {
      newErrors.pricePerUnit = t('invalidAmountError');
    }
    if (!currency) newErrors.currency = t('requiredField');
    if (quantity.trim() === '' || isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
      newErrors.quantity = t('invalidQuantityError');
    }
    if (!unitType.trim()) newErrors.unitType = t('requiredField');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // CRITICAL CHECK: Ensure user and user.id are available before proceeding
    if (!user || !user.id) {
      toast.error(t('userNotAuthenticatedError') || "User not authenticated or ID missing. Please try again.");
      // console.error("MaterialForm: User or user.id is undefined in handleSubmit. User:", user);
      return;
    }

    let uploadedImageUrl = existingImageUrl;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`; // user.id should be defined here

      // console.log("MaterialForm: Attempting to upload to filePath:", filePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('material-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error("MaterialForm: Supabase storage upload error:", uploadError);
        toast.error(t('imageUploadFailed') + `: ${uploadError.message}`);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('material-images')
        .getPublicUrl(filePath);
      uploadedImageUrl = urlData?.publicUrl || null;
      // console.log("MaterialForm: Uploaded image URL:", uploadedImageUrl);

      if (initialData && initialData.image_url && initialData.image_url !== uploadedImageUrl && user && user.id) {
        const oldImageKey = initialData.image_url.substring(initialData.image_url.indexOf(`${user.id}/`));
        if (oldImageKey) {
          // console.log("MaterialForm: Attempting to delete old image:", oldImageKey);
          await supabase.storage.from('material-images').remove([oldImageKey]);
        }
      }
    }

    onSubmit({
      name: name.trim(),
      price_per_unit: parseFloat(pricePerUnit),
      currency,
      quantity: parseInt(quantity),
      unit_type: unitType.trim(),
      image_url: uploadedImageUrl,
      ...(initialData && initialData.id && { id: initialData.id }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="materialName"
        label={t('materialName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
        placeholder={t('materialNamePlaceholder')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="pricePerUnit"
          label={t('pricePerUnit')}
          type="number"
          value={pricePerUnit}
          onChange={(e) => setPricePerUnit(e.target.value)}
          step="0.01"
          min="0"
          placeholder="0.00"
          error={errors.pricePerUnit}
          required
        />
        <div>
          <label htmlFor="materialCurrency" className="block text-sm font-medium text-text-secondary-dark mb-1">
            {t('currency')} <span className="text-red-400">*</span>
          </label>
          <select
            id="materialCurrency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`w-full px-3 py-2.5 bg-navy-light border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue text-text-primary-dark ${errors.currency ? 'border-red-500 ring-red-500' : 'border-slate-blue'}`}
            required
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{t(c.name_key)} ({c.symbol})</option>
            ))}
          </select>
          {errors.currency && <p className="mt-1 text-xs text-red-400">{errors.currency}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="quantity"
          label={t('quantity')}
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          step="1"
          min="0"
          placeholder="0"
          error={errors.quantity}
          required
        />
        <Input
          id="unitType"
          label={t('unitType')}
          value={unitType}
          onChange={(e) => setUnitType(e.target.value)}
          error={errors.unitType}
          required
          placeholder={t('unitTypePlaceholder')}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-secondary-dark mb-1">
          {t('photo')} ({t('optional')})
        </label>
        <div className="mt-1 flex items-center space-s-4 p-3 border-2 border-dashed border-slate-blue rounded-lg hover:border-accent-blue">
          <div className="shrink-0 h-24 w-24 bg-navy-deep rounded-md flex items-center justify-center overflow-hidden">
            {imagePreview ? (
              <img src={imagePreview} alt={t('materialPreview')} className="h-full w-full object-cover" />
            ) : (
              <FiImage className="h-12 w-12 text-slate-blue" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              id="materialImage"
              accept="image/png, image/jpeg, image/webp, image/gif"
              onChange={handleImageChange}
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<FiUploadCloud />}
            >
              {imageFile || existingImageUrl ? t('changeImage') : t('uploadImage')}
            </Button>
            {imageFile && (
                <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                    setImageFile(null); 
                    setImagePreview(existingImageUrl || null); 
                    if(fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="ms-2 !py-1 !px-2"
                >
                {t('clearSelection')}
                </Button>
            )}
            <p className="text-xs text-text-secondary-dark mt-2">
              {t('imageUploadNote')}
            </p>
            {errors.image && <p className="mt-1 text-xs text-red-400">{errors.image}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-s-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          {t('cancel')}
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
          {initialData ? t('saveChanges') : t('addMaterial')}
        </Button>
      </div>
    </form>
  );
};

export default MaterialForm;