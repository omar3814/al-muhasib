import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { FiUser, FiUploadCloud, FiSave, FiMail, FiEdit3 } from 'react-icons/fi';

const ProfilePage = () => {
  const { t } = useTranslation('common');
  const { user, profile, refreshProfile } = useAuth(); // Use refreshProfile from context
  
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  // const [email, setEmail] = useState(''); // Email is not typically changed by user directly

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setAvatarPreview(profile.avatar_url || null);
    }
    // if (user) {
    //   setEmail(user.email || '');
    // }
  }, [profile, user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for avatars
        setFormErrors(prev => ({ ...prev, avatar: t('imageSizeTooLargeAvatar') || 'Avatar image too large (max 2MB).' }));
        // Add "imageSizeTooLargeAvatar": "صورة الملف الشخصي كبيرة جدا (الحد الأقصى 2 ميجابايت)."
        setAvatarFile(null);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFormErrors(prev => ({ ...prev, avatar: t('invalidImageTypeAvatar') || 'Invalid image type (JPG, PNG, WEBP).' }));
        // Add "invalidImageTypeAvatar": "نوع صورة غير صالح (JPG, PNG, WEBP)."
        setAvatarFile(null);
        return;
      }
      setFormErrors(prev => ({ ...prev, avatar: '' }));
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const validateProfileForm = () => {
    const errors = {};
    if (!fullName.trim()) errors.fullName = t('requiredField');
    if (!username.trim()) errors.username = t('requiredField');
    else if (username.trim().length < 3) errors.username = t('usernameTooShort') || 'Username must be at least 3 characters.';
    // Add "usernameTooShort": "اسم المستخدم يجب أن يكون 3 أحرف على الأقل."
    // Potentially add username availability check if desired (more complex)
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!validateProfileForm() || !user) return;

    setLoading(true);
    let avatarPublicUrl = profile?.avatar_url; // Keep existing if no new one

    try {
      // 1. Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatar-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`; // Path in 'avatars' bucket

        // If there was an old avatar, delete it first
        if (profile?.avatar_url) {
            const oldAvatarPath = profile.avatar_url.substring(profile.avatar_url.lastIndexOf(user.id + '/'));
            if(oldAvatarPath){
                await supabase.storage.from('avatars').remove([oldAvatarPath]);
            }
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true }); // Upsert true to overwrite if same path somehow exists

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarPublicUrl = urlData?.publicUrl;
      }

      // 2. Update profile table in database
      const updates = {
        full_name: fullName.trim(),
        username: username.trim(),
        avatar_url: avatarPublicUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(t('profileUpdatedSuccess') || 'Profile updated successfully!');
      // Add "profileUpdatedSuccess": "تم تحديث الملف الشخصي بنجاح!"
      await refreshProfile(); // Refresh profile in AuthContext
      setAvatarFile(null); // Clear the file input after successful upload

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('operationFailed') + `: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  if (!profile && !user) { // Still waiting for auth context to load
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <FiUser className="animate-pulse h-10 w-10 text-accent-blue" />
      </div>
    );
  }


  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary-dark mb-8">{t('profile')}</h1>
      <div className="max-w-2xl mx-auto bg-navy-light p-6 sm:p-8 rounded-xl shadow-2xl">
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <div className="h-32 w-32 rounded-full bg-navy-deep flex items-center justify-center overflow-hidden border-4 border-slate-blue shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={t('avatarPreview') || "Avatar Preview"} className="h-full w-full object-cover" />
                  // Add "avatarPreview": "معاينة الصورة الرمزية"
                ) : (
                  <FiUser className="h-16 w-16 text-slate-blue" />
                )}
              </div>
              <label 
                htmlFor="avatarUpload" 
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full cursor-pointer transition-opacity duration-200"
                title={t('changeProfilePicture') || "Change profile picture"}
                // Add "changeProfilePicture": "تغيير صورة الملف الشخصي"
              >
                <FiUploadCloud className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </label>
              <input
                type="file"
                id="avatarUpload"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleAvatarChange}
                className="hidden"
                ref={fileInputRef}
              />
            </div>
             {formErrors.avatar && <p className="text-xs text-red-400">{formErrors.avatar}</p>}
          </div>

          <Input
            id="email"
            label={t('email')}
            type="email"
            value={user?.email || ''}
            disabled // Email usually not changed by user directly from profile form
            inputClassName="bg-navy-deep cursor-not-allowed" // More distinct disabled style
          />
          <Input
            id="fullName"
            label={t('fullName')}
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('fullNamePlaceholder')}
            error={formErrors.fullName}
            required
            leftIcon={<FiUser className="text-text-secondary-dark"/>}
          />
          <Input
            id="username"
            label={t('username')}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('usernamePlaceholder') || "Choose a unique username"}
            error={formErrors.username}
            required
            leftIcon={<FiEdit3 className="text-text-secondary-dark"/>}
            // Add "usernamePlaceholder": "اختر اسم مستخدم فريد"
          />
          
          {/* Password change could be a separate form/modal for better UX */}
          {/* <Button type="button" variant="outline" className="w-full">
            {t('changePassword') || "Change Password"}
          </Button> */}
          {/* Add "changePassword": "تغيير كلمة المرور" */}


          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full" isLoading={loading} disabled={loading} leftIcon={<FiSave />}>
              {loading ? t('saving') : t('saveChanges')}
            </Button>
            {/* Add "saving": "جاري الحفظ..." */}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;