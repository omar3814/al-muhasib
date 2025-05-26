import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { FiKey, FiSave } from 'react-icons/fi';

const UpdatePasswordPage = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tokenProcessed, setTokenProcessed] = useState(false);

  useEffect(() => {
    // Supabase client handles the access_token from URL fragment automatically
    // when onAuthStateChange is triggered by it.
    // We just need to provide the UI for the new password.
    // If the user is here due to a recovery link, a session will be established
    // via the onAuthStateChange listener in AuthContext, which includes the access_token.
    // So, supabase.auth.updateUser should work if the session is valid from the token.
    
    // This effect checks if the user was redirected here with a recovery token
    // Supabase client should automatically handle the session if type=recovery
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // console.log("Password recovery event, session should be active with recovery token");
        setTokenProcessed(true); // Allow showing the form
      } else if (event === "SIGNED_IN" && location.hash.includes("type=recovery")) {
        // Alternative check if session is established and URL indicates recovery
        setTokenProcessed(true);
      } else if (event === "USER_UPDATED") {
        // This might fire after password update
      }
    });

    // Check immediately if the URL hash indicates a recovery flow
    if (location.hash.includes("type=recovery") && !tokenProcessed) {
        // The AuthProvider should handle session creation from the token.
        // We just show the form.
        setTokenProcessed(true);
    }


    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, [location.hash, tokenProcessed]);


  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword.length < 6) {
      setError(t('passwordLengthError'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setMessage(t('passwordUpdatedSuccessfully') || 'Password updated successfully! You can now log in.');
      // Add "passwordUpdatedSuccessfully": "تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول."
      toast.success(t('passwordUpdatedSuccessfully'));
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/login'), 3000); // Redirect to login after a delay

    } catch (err) {
      console.error("Error updating password:", err);
      setError(err.message || t('passwordUpdateFailed') || 'Failed to update password.');
      // Add "passwordUpdateFailed": "فشل تحديث كلمة المرور."
      toast.error(err.message || t('passwordUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // If not from a recovery link, or token already used/invalid, redirect or show message
  // For simplicity, we'll assume if they land here, they should see the form.
  // Supabase's updateUser will fail if the session isn't valid for recovery.

  return (
    <div className="min-h-screen flex items-center justify-center bg-nuzum-bg-deep p-4 py-12">
      <div className="max-w-md w-full bg-nuzum-surface p-8 rounded-xl shadow-card space-y-6">
        <div className="text-center">
          <FiKey className="mx-auto h-12 w-12 text-nuzum-accent-primary mb-3" />
          <h2 className="text-3xl font-bold text-nuzum-text-primary">{t('setNewPassword') || 'Set New Password'}</h2>
          {/* Add "setNewPassword": "تعيين كلمة مرور جديدة" */}
        </div>
        
        {message && <p className="text-nuzum-success text-center py-2">{message}</p>}
        
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <Input
            id="newPassword"
            label={t('newPassword') || 'New Password'}
            // Add "newPassword": "كلمة المرور الجديدة"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="********"
            required
          />
          <Input
            id="confirmNewPassword"
            label={t('confirmNewPassword') || 'Confirm New Password'}
            // Add "confirmNewPassword": "تأكيد كلمة المرور الجديدة"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="********"
            required
          />
          {error && <p className="text-sm text-nuzum-danger text-center py-2">{error}</p>}
          <Button type="submit" variant="accent" isLoading={loading} disabled={loading} className="w-full !mt-6" leftIcon={<FiSave/>}>
            {loading ? t('saving') : t('updatePassword')}
          </Button>
          {/* Add "updatePassword": "تحديث كلمة المرور" */}
        </form>
         <p className="text-center text-sm text-nuzum-text-secondary pt-4">
            <Link to="/login" className="font-medium text-nuzum-accent-primary hover:underline">
                {t('backToLogin') || 'Back to Login'}
            </Link>
            {/* Add "backToLogin": "العودة إلى تسجيل الدخول" */}
        </p>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;