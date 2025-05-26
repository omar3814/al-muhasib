import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiArchive, FiImage, FiAlertCircle, FiPackage } from 'react-icons/fi';

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import MaterialForm from '../components/materials/MaterialForm';
import { formatCurrency, getAllCurrenciesForUser, getCurrencyDisplayInfo, HARDCODED_DEFAULT_CURRENCY } from '../utils/currencies';

async function updateAccountForPurchase(transactionData) {
  if (!transactionData.account_id || !transactionData.amount || transactionData.type !== 'expense') {
    console.warn("updateAccountForPurchase: Missing data or not an expense for account update.", transactionData);
    return;
  }
  try {
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', transactionData.account_id)
      .single();
    if (accErr || !account) {
      throw new Error('Failed to fetch account for purchase balance update.' + (accErr?.message || ''));
    }
    const newBalance = parseFloat(account.balance) - parseFloat(transactionData.amount);
    const { error: updateBalanceError } = await supabase
      .from('accounts')
      .update({ balance: newBalance.toFixed(2) })
      .eq('id', transactionData.account_id);
    if (updateBalanceError) {
      throw new Error('Failed to update account balance for purchase.' + updateBalanceError.message);
    }
  } catch (error) {
    console.error("Error in updateAccountForPurchase:", error);
    toast.error(t('errorUpdatingAccountBalance') || 'Error updating account balance after purchase.');
    // Add "errorUpdatingAccountBalance": "خطأ في تحديث رصيد الحساب بعد الشراء."
    // Note: This function only handles the account update. Material quantity is handled by material save.
  }
}


const MaterialsPage = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);

  const fetchData = useCallback(async () => { if (!user) { setLoading(false); return; } setLoading(true); setError(''); try { const [materialsRes, accountsRes, currenciesRes] = await Promise.all([ supabase.from('materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false }), supabase.from('accounts').select('id, name, currency, balance').eq('user_id', user.id).order('name', { ascending: true }), getAllCurrenciesForUser(user.id) ]); if (materialsRes.error) throw materialsRes.error; setMaterials(materialsRes.data || []); if (accountsRes.error) throw accountsRes.error; setAccounts(accountsRes.data || []); setAvailableCurrencies(currenciesRes || []); } catch (err) { setError(t('errorFetchingPageData')); } finally { setLoading(false); }}, [user, t]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!user) return; const channel = supabase.channel('public:materials_page_final_fix').on('postgres_changes', { event: '*', schema: 'public', table: 'materials', filter: `user_id=eq.${user.id}` }, () => fetchData()).on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}`}, () => fetchData()).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchData]);
  const handleOpenModal = (material = null) => { setCurrentMaterial(material); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setCurrentMaterial(null); setFormLoading(false); };

  const handleSubmitMaterial = async (materialPayload, purchaseTransactionPayloadFromForm) => {
    setFormLoading(true);
    let savedMaterial = null;

    try {
      if (materialPayload.id) { // Editing existing material
        const currentQtyInDb = parseFloat(materialPayload.current_quantity || 0);
        const quantityToAdd = materialPayload.quantity_to_add > 0 ? materialPayload.quantity_to_add : 0;
        const newTotalQuantity = currentQtyInDb + quantityToAdd;

        const { data: updatedMaterial, error: uErr } = await supabase
          .from('materials')
          .update({
            name: materialPayload.name,
            price_per_unit: materialPayload.price_per_unit,
            currency: materialPayload.currency,
            quantity: newTotalQuantity, // Update with the new total
            unit_type: materialPayload.unit_type,
            image_url: materialPayload.image_url,
          })
          .eq('id', materialPayload.id)
          .eq('user_id', user.id)
          .select()
          .single();
        if (uErr) throw uErr;
        savedMaterial = updatedMaterial;
        toast.success(t('materialUpdatedSuccess'));
      } else { // Creating new material
        const { data: newMaterial, error: iErr } = await supabase
          .from('materials')
          .insert([{ 
            name: materialPayload.name,
            price_per_unit: materialPayload.price_per_unit,
            currency: materialPayload.currency,
            quantity: materialPayload.quantity_to_add, // This is the initial quantity
            unit_type: materialPayload.unit_type,
            image_url: materialPayload.image_url,
            user_id: user.id 
          }])
          .select()
          .single();
        if (iErr) throw iErr;
        savedMaterial = newMaterial;
        toast.success(t('materialCreatedSuccess'));
      }

      // If a purchase transaction needs to be recorded (and material save was successful)
      if (purchaseTransactionPayloadFromForm && savedMaterial && savedMaterial.id && materialPayload.quantity_to_add > 0) {
        // Remove the placeholder 'material_id_to_link' if it exists from the form payload
        const { material_id_to_link, ...actualPurchaseTxData } = purchaseTransactionPayloadFromForm;

        const finalTxPayload = {
          ...actualPurchaseTxData, // Use the data from form (account_id, amount, currency, date, notes, type)
          user_id: user.id,
          material_id: savedMaterial.id, // Link to the newly created/updated material
          // 'material_quantity_affected' from form is the positive quantity added
          material_quantity_affected: materialPayload.quantity_to_add, 
        };
        
        console.log("Attempting to insert transaction:", finalTxPayload);
        const { data: newTx, error: txError } = await supabase.from('transactions').insert(finalTxPayload).select().single();
        
        if (txError) {
            console.error("Transaction insert error:", txError);
            toast.error(`${t('materialSavedButTxFailed')} ${txError.message}`);
        } else {
            // Update the source account balance for the purchase
            await updateAccountForPurchase(newTx); 
        }
      }
      handleCloseModal();
      // RLS subscription should trigger fetchData, or call it explicitly if needed.
      // fetchData(); 
    } catch (err) { 
      console.error("Error in handleSubmitMaterial:", err);
      toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); 
    } finally { 
      setFormLoading(false); 
    }
  };

  const handleDeleteMaterial = async (materialId, imageUrl) => { if (!materialId) return; setFormLoading(true); try { const { error: dbDelErr } = await supabase.from('materials').delete().eq('id', materialId).eq('user_id', user.id); if (dbDelErr) { if (dbDelErr.message.includes('violates foreign key constraint')) { toast.error(t('materialDeleteFailedTransactionsExist')); } else { throw dbDelErr; } } else { if (imageUrl && user && user.id) { const filePath = imageUrl.substring(imageUrl.indexOf(user.id + '/')); if (filePath.startsWith(user.id + '/')) { const { error: storageErr } = await supabase.storage.from('material-images').remove([filePath]); if (storageErr) { toast.warn(t('materialDbDeletedImageFail')); } } } toast.success(t('materialDeletedSuccess')); } } catch (err) { toast.error(t('operationFailed') + `: ${err.message.substring(0,100)}`); } finally { setFormLoading(false); setShowDeleteConfirm(false); setMaterialToDelete(null); }};
  const openDeleteConfirm = (material) => { setMaterialToDelete(material); setShowDeleteConfirm(true); };
  const closeDeleteConfirm = () => { setMaterialToDelete(null); setShowDeleteConfirm(false); };

  if (loading && materials.length === 0 && !error) { return <div className="flex justify-center items-center h-[calc(100vh-250px)]"><svg className="animate-spin h-12 w-12 text-nuzum-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>; }

  return (
    <div className="space-y-8">
      <div className="bg-nuzum-surface p-5 sm:p-6 rounded-xl shadow-card flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-bold text-nuzum-text-primary">{t('materials')}</h1><p className="text-sm text-nuzum-text-secondary mt-1">{t('manageYourInventoryItems')}</p></div>
        <Button onClick={() => handleOpenModal()} leftIcon={<FiPlus className="rtl:ms-0 rtl:-me-0.5 me-1.5 -ms-0.5"/>} variant="accent" size="md" className="w-full sm:w-auto">{t('addNewMaterial')}</Button>
      </div>
      <div className="bg-nuzum-surface p-4 sm:p-6 rounded-xl shadow-card">
        {error && !loading && ( <div className="p-10 text-center"> <FiAlertCircle className="mx-auto h-12 w-12 text-nuzum-danger mb-4" /> <p className="text-nuzum-danger">{error}</p> <Button onClick={fetchData} className="mt-6" variant="secondary">{t('retry')}</Button> </div> )}
        {!loading && !error && materials.length === 0 && ( <div className="text-center py-16 px-6"> <FiArchive className="mx-auto h-16 w-16 text-nuzum-text-secondary mb-6" /> <h3 className="text-2xl font-semibold text-nuzum-text-primary mb-3">{t('noMaterialsFoundTitle')}</h3> <p className="text-nuzum-text-secondary mb-8">{t('noMaterialsFoundMessage')}</p> <Button onClick={() => handleOpenModal()} leftIcon={<FiPlus />} variant="accent" size="lg">{t('addNewMaterial')}</Button> </div> )}
        {!error && materials.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {materials.map(material => (
              <Link to={`/materials/${material.id}`} key={material.id} className="block bg-nuzum-surface rounded-xl shadow-card hover:bg-nuzum-border hover:shadow-lg transition-all duration-200 ease-out group overflow-hidden flex flex-col transform hover:-translate-y-1">
                <div className="h-32 w-full bg-nuzum-bg-deep flex items-center justify-center overflow-hidden">{material.image_url ? ( <img src={material.image_url} alt={material.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" /> ) : ( <FiPackage className="h-12 w-12 text-nuzum-text-placeholder" /> )}</div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-md font-semibold text-nuzum-accent-primary truncate mb-1 group-hover:text-nuzum-accent-primary-hover">{material.name}</h3>
                  <p className="text-xs text-nuzum-text-secondary mb-0.5"> {formatCurrency(material.price_per_unit, material.currency, t, availableCurrencies, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)} / {t(material.unit_type.toLowerCase()) || material.unit_type} </p>
                  <p className="text-xs text-nuzum-text-secondary mb-2"> {t('quantity')}: {material.quantity} </p>
                  <div className="mt-auto flex justify-end space-s-2 pt-1"><Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenModal(material);}} title={t('edit')} className="opacity-60 group-hover:opacity-100 !p-1.5"> <FiEdit2 className="w-4 h-4"/> </Button><Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirm(material);}} title={t('delete')} className="text-nuzum-danger opacity-60 group-hover:opacity-100 hover:bg-red-500/10 !p-1.5"> <FiTrash2 className="w-4 h-4"/> </Button></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentMaterial ? t('editMaterial') : t('addNewMaterial')} size="lg"> 
        <MaterialForm 
            onSubmit={handleSubmitMaterial} 
            onCancel={handleCloseModal} 
            initialData={currentMaterial} 
            isLoading={formLoading}
            currencies={availableCurrencies}
            accounts={accounts} 
        /> 
      </Modal>
      <Modal isOpen={showDeleteConfirm} onClose={closeDeleteConfirm} title={t('confirmDeletionTitle')} size="sm"> <p className="text-nuzum-text-secondary">{t('deleteConfirmationMessage', { name: materialToDelete?.name || '' })}</p> <div className="flex justify-end space-s-3 pt-5"> <Button variant="secondary" onClick={closeDeleteConfirm} disabled={formLoading}>{t('no')}</Button> <Button variant="danger" onClick={() => handleDeleteMaterial(materialToDelete?.id, materialToDelete?.image_url)} isLoading={formLoading} disabled={formLoading}>{t('yesDelete')}</Button> </div> </Modal>
    </div>
  );
};

export default MaterialsPage;