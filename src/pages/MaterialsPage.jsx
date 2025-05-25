import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiArchive, FiImage, FiAlertCircle } from 'react-icons/fi';

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import MaterialForm from '../components/materials/MaterialForm'; // Corrected path
import { formatCurrency, getCurrencyDisplay } from '../utils/currencies';

const MaterialsPage = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);

  const fetchMaterials = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMaterials(data || []);
    } catch (err) {
      console.error('Error fetching materials:', err.message);
      setError(t('errorFetchingMaterials') || 'Could not load materials.');
      // Add to common.json: "errorFetchingMaterials": "تعذر تحميل المواد."
      toast.error(t('errorFetchingMaterials'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Real-time listener for materials table
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('public:materials_page') // Unique channel name
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materials', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // console.log('Material change received!', payload);
          fetchMaterials();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMaterials]);

  const handleOpenModal = (material = null) => {
    setCurrentMaterial(material);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentMaterial(null);
    setFormLoading(false);
  };

  const handleSubmitMaterial = async (formData) => {
    setFormLoading(true);
    setError('');
    try {
      if (currentMaterial && currentMaterial.id) { // Editing
        const { error: updateError } = await supabase
          .from('materials')
          .update({
            name: formData.name,
            price_per_unit: formData.price_per_unit,
            currency: formData.currency,
            quantity: formData.quantity,
            unit_type: formData.unit_type,
            image_url: formData.image_url, // image_url comes from MaterialForm handling upload
          })
          .eq('id', currentMaterial.id)
          .eq('user_id', user.id);
        if (updateError) throw updateError;
        toast.success(t('materialUpdatedSuccess') || 'Material updated successfully!');
        // Add "materialUpdatedSuccess": "تم تحديث المادة بنجاح!"
      } else { // Creating
        const { error: insertError } = await supabase
          .from('materials')
          .insert([{ ...formData, user_id: user.id }]);
        if (insertError) throw insertError;
        toast.success(t('materialCreatedSuccess') || 'Material added successfully!');
        // Add "materialCreatedSuccess": "تمت إضافة المادة بنجاح!"
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error submitting material:', err.message);
      toast.error(t('operationFailed') + `: ${err.message.substring(0, 100)}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteMaterial = async (materialId, imageUrl) => {
    if (!materialId) return;
    setFormLoading(true);
    try {
      // First, try to delete from DB. ON DELETE RESTRICT will prevent if transactions exist.
      const { error: dbDeleteError } = await supabase
        .from('materials')
        .delete()
        .eq('id', materialId)
        .eq('user_id', user.id);

      if (dbDeleteError) {
        if (dbDeleteError.message.includes('violates foreign key constraint')) {
          toast.error(t('materialDeleteFailedTransactionsExist') || 'Cannot delete material: it has linked transactions.');
          // Add "materialDeleteFailedTransactionsExist": "لا يمكن حذف المادة: توجد معاملات مرتبطة بها."
        } else {
          throw dbDeleteError;
        }
      } else {
        // If DB delete was successful, try to delete the image from storage
        if (imageUrl) {
          const filePath = imageUrl.substring(imageUrl.lastIndexOf(user.id + '/'));
          if (filePath) {
            const { error: storageError } = await supabase.storage.from('material-images').remove([filePath]);
            if (storageError) {
              console.error("Error deleting material image from storage:", storageError.message);
              toast.warn(t('materialDbDeletedImageFail') || "Material deleted, but failed to remove image.");
              // Add "materialDbDeletedImageFail": "تم حذف المادة، ولكن فشل حذف الصورة."
            }
          }
        }
        toast.success(t('materialDeletedSuccess') || 'Material deleted successfully.');
        // Add "materialDeletedSuccess": "تم حذف المادة بنجاح."
      }
    } catch (err) {
      console.error('Error deleting material:', err.message);
      toast.error(t('operationFailed') + `: ${err.message.substring(0, 100)}`);
    } finally {
      setFormLoading(false);
      setShowDeleteConfirm(false);
      setMaterialToDelete(null);
    }
  };
  
  const openDeleteConfirm = (material) => {
    setMaterialToDelete(material);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setMaterialToDelete(null);
    setShowDeleteConfirm(false);
  };

  if (loading && materials.length === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <svg className="animate-spin h-10 w-10 text-accent-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary-dark">{t('materials')}</h1>
        <Button onClick={() => handleOpenModal()} leftIcon={<FiPlus />}>
          {t('addNewMaterial')}
        </Button>
      </div>

      {error && !loading && (
        <div className="text-center p-10 bg-navy-light rounded-xl shadow-lg">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchMaterials} className="mt-4" variant="secondary">
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && materials.length === 0 && (
        <div className="text-center py-10 px-6 bg-navy-light rounded-xl shadow">
          <FiArchive className="mx-auto h-16 w-16 text-slate-blue mb-4" />
          <h3 className="text-xl font-semibold text-text-primary-dark mb-2">{t('noMaterialsFoundTitle') || "No materials or products added yet."}</h3>
          {/* Add "noMaterialsFoundTitle": "لم تتم إضافة أي مواد أو منتجات بعد." */}
          <p className="text-text-secondary-dark mb-6">{t('noMaterialsFoundMessage') || "Manage your inventory by adding items with details like price, quantity, and unit type."}</p>
          {/* Add "noMaterialsFoundMessage": "قم بإدارة مخزونك عن طريق إضافة مواد مع تفاصيل مثل السعر والكمية ونوع الوحدة." */}
          <Button onClick={() => handleOpenModal()} leftIcon={<FiPlus />}>
            {t('addNewMaterial')}
          </Button>
        </div>
      )}

      {!error && materials.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {materials.map(material => (
            <div key={material.id} className="bg-navy-light rounded-xl shadow-lg overflow-hidden flex flex-col">
              <div className="h-48 w-full bg-navy-deep flex items-center justify-center">
                {material.image_url ? (
                  <img src={material.image_url} alt={material.name} className="h-full w-full object-cover" />
                ) : (
                  <FiImage className="h-16 w-16 text-slate-blue" />
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-accent-blue truncate mb-1">{material.name}</h3>
                <p className="text-sm text-text-secondary-dark mb-1">
                  {t('pricePerUnit')}: {formatCurrency(material.price_per_unit, material.currency, t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)} / {t(material.unit_type.toLowerCase()) || material.unit_type}
                </p>
                <p className="text-sm text-text-secondary-dark mb-3">
                  {t('quantity')}: {material.quantity}
                </p>
                <div className="mt-auto flex justify-end space-s-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleOpenModal(material)} title={t('edit')}>
                    <FiEdit2 />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => openDeleteConfirm(material)} title={t('delete')}>
                    <FiTrash2 />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentMaterial ? t('editMaterial') : t('addNewMaterial')}
        size="lg" // Material form might be larger due to image upload
      >
        <MaterialForm
          onSubmit={handleSubmitMaterial}
          onCancel={handleCloseModal}
          initialData={currentMaterial}
          isLoading={formLoading}
        />
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        title={t('confirmDeletionTitle')}
        size="sm"
      >
        <p className="text-text-secondary-dark">
          {t('deleteConfirmationMessage', { name: materialToDelete?.name || '' })}
        </p>
        <div className="flex justify-end space-s-3 pt-5">
          <Button variant="secondary" onClick={closeDeleteConfirm} disabled={formLoading}>
            {t('no')}
          </Button>
          <Button variant="danger" onClick={() => handleDeleteMaterial(materialToDelete?.id, materialToDelete?.image_url)} isLoading={formLoading} disabled={formLoading}>
            {t('yesDelete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MaterialsPage;