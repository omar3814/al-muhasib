import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { FiUser, FiUploadCloud, FiSave, FiMail, FiEdit3, FiKey, FiAlertCircle } from 'react-icons/fi'; // Added FiKey

const ProfilePage = () => {
  const { t } = useTranslation('common');
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => { if (profile) { setFullName(profile.full_name || ''); setUsername(profile.username || ''); setAvatarPreview(profile.avatar_url || null);}}, [profile]);
  const handleAvatarChange = (e) => { const file = e.target.files[0]; if (file) { if (file.size > 2 * 1024 * 1024) { setFormErrors(prev => ({ ...prev, avatar: t('imageSizeTooLargeAvatar')})); setAvatarFile(null); return; } if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setFormErrors(prev => ({ ...prev, avatar: t('invalidImageTypeAvatar')})); setAvatarFile(null); return; } setFormErrors(prev => ({ ...prev, avatar: '' })); setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }};
  const validateProfileForm = () => { const errors = {}; if (!fullName.trim()) errors.fullName = t('requiredField'); if (!username.trim()) errors.username = t('requiredField'); else if (username.trim().length < 3) errors.username = t('usernameTooShort'); setFormErrors(errors); return Object.keys(errors).length === 0; };
  
  const handleProfileUpdate = async (e) => { 
    e.preventDefault(); 
    if (!validateProfileForm() || !user) return; 
    setFormSubmitting(true); 
    let avatarPublicUrl = profile?.avatar_url; 
    try { 
      if (avatarFile) { 
        const fileExt = avatarFile.name.split('.').pop(); 
        const fileName = `avatar-${Date.now()}.${fileExt}`; 
        const filePath = `${user.id}/${fileName}`; 
        if (profile?.avatar_url) { 
          const oldAvatarPath = profile.avatar_url.substring(profile.avatar_url.lastIndexOf(user.id + '/')); 
          if(oldAvatarPath && oldAvatarPath.startsWith(user.id + '/')){ 
            await supabase.storage.from('avatars').remove([oldAvatarPath]); 
          }
        } 
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true }); 
        if (uploadError) throw uploadError; 
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath); 
        avatarPublicUrl = urlData?.publicUrl; 
      } 
      const updates = { full_name: fullName.trim(), username: username.trim(), avatar_url: avatarPublicUrl, updated_at: new Date().toISOString() }; 
      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id); 
      if (updateError) throw updateError; 
      toast.success(t('profileUpdatedSuccess')); 
      await refreshProfile(); 
      setAvatarFile(null); 
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
    } catch (error) { 
      toast.error(t('operationFailed') + `: ${error.message}`); 
    } finally { 
      setFormSubmitting(false); 
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) {
      toast.error(t('errorUserEmailNotFound') || 'User email not found. Cannot send reset link.');
      // Add "errorUserEmailNotFound": "لم يتم العثور على بريد المستخدم الإلكتروني. لا يمكن إرسال رابط إعادة التعيين."
      return;
    }
    setPasswordResetLoading(true);
    try {
      // For logged-in users, Supabase recommends sending a magic link for re-authentication before password change,
      // or using the updateUser method if current password is known.
      // However, to trigger the standard "forgot password" email flow (which is often what users expect for "change password"):
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + '/update-password' // Or your specific password update page
      });
      // IMPORTANT: You'll need to handle the /update-password route and UI later if you use redirectTo.
      // For now, Supabase's default reset link will go to a Supabase-hosted page if redirectTo is not perfectly set up with your app.
      // Or, if redirectTo points to your app, it will have a #access_token=... in the URL.

      if (error) {
        throw error;
      }
      toast.success(t('passwordResetEmailSent') || 'Password reset email sent! Please check your inbox.');
      // Add "passwordResetEmailSent": "تم إرسال بريد إعادة تعيين كلمة المرور! يرجى التحقق من صندوق الوارد الخاص بك."
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast.error(t('passwordResetEmailFailed') || 'Failed to send password reset email. Please try again.');
      // Add "passwordResetEmailFailed": "فشل إرسال بريد إعادة تعيين كلمة المرور. حاول مرة أخرى."
    } finally {
      setPasswordResetLoading(false);
    }
  };
  
  if (authLoading && !profile) { return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><svg className="animate-spin h-12 w-12 text-nuzum-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>;}

  return (
    <div className="space-y-8">
      <div className="bg-nuzum-surface p-5 sm:p-6 rounded-xl shadow-card flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-bold text-nuzum-text-primary">{t('profile')}</h1><p className="text-sm text-nuzum-text-secondary mt-1">{t('manageYourProfileInfo')}</p></div>
      </div>

      <div className="max-w-2xl mx-auto bg-nuzum-surface p-6 sm:p-8 rounded-xl shadow-card">
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="flex flex-col items-center space-y-4"><div className="relative group"><div className="h-32 w-32 rounded-full bg-nuzum-bg-deep flex items-center justify-center overflow-hidden border-4 border-nuzum-border shadow-lg">{avatarPreview ? (<img src={avatarPreview} alt={t('avatarPreview')} className="h-full w-full object-cover" />) : (<FiUser className="h-16 w-16 text-nuzum-text-placeholder" />)}</div><label htmlFor="avatarUpload" className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full cursor-pointer transition-opacity duration-200" title={t('changeProfilePicture')}><FiUploadCloud className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" /></label><input type="file" id="avatarUpload" accept="image/png, image/jpeg, image/webp" onChange={handleAvatarChange} className="hidden" ref={fileInputRef}/></div>{formErrors.avatar && <p className="text-xs text-nuzum-danger">{formErrors.avatar}</p>}</div>
          <Input id="email" label={t('email')} type="email" value={user?.email || ''} disabled inputClassName="bg-nuzum-bg-deep cursor-not-allowed opacity-70" />
          <Input id="fullName" label={t('fullName')} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('fullNamePlaceholder')} error={formErrors.fullName} required leftIcon={<FiUser className="text-nuzum-text-secondary"/>}/>
          <Input id="username" label={t('username')} type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('usernamePlaceholder')} error={formErrors.username} required leftIcon={<FiEdit3 className="text-nuzum-text-secondary"/>}/>
          <div className="pt-2"><Button type="submit" variant="accent" className="w-full" isLoading={formSubmitting} disabled={formSubmitting} leftIcon={<FiSave />}>{formSubmitting ? t('saving') : t('saveChanges')}</Button></div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="max-w-2xl mx-auto bg-nuzum-surface p-6 sm:p-8 rounded-xl shadow-card">
        <h2 className="text-xl font-semibold text-nuzum-text-primary mb-4 border-b border-nuzum-border pb-3">{t('changePassword')}</h2>
        <p className="text-sm text-nuzum-text-secondary mb-5">{t('changePasswordInstruction') || 'Click the button below to send a password reset link to your email address.'}</p>
        {/* Add "changePasswordInstruction": "انقر فوق الزر أدناه لإرسال رابط إعادة تعيين كلمة المرور إلى عنوان بريدك الإلكتروني." */}
        <Button 
            onClick={handleChangePassword} 
            variant="secondary" 
            isLoading={passwordResetLoading} 
            disabled={passwordResetLoading}
            leftIcon={<FiKey />}
        >
            {passwordResetLoading ? t('sendingEmail') : t('sendResetLink')}
        </Button>
        {/* Add "sendingEmail": "جاري إرسال البريد..." */}
        {/* Add "sendResetLink": "إرسال رابط إعادة التعيين" */}
      </div>
    </div>
  );
};

export default ProfilePage;