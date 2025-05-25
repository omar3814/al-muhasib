// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { FiUserPlus, FiMail, FiLock, FiUser } from 'react-icons/fi'; // Icons for inputs

const SignupPage = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(''); // For general form errors

  // Input specific errors
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validateField = (name, value) => {
    let errorMsg = '';
    switch (name) {
      case 'fullName':
        if (!value.trim()) errorMsg = t('requiredField');
        break;
      case 'email':
        if (!value.trim()) errorMsg = t('requiredField');
        else if (!/\S+@\S+\.\S+/.test(value)) errorMsg = t('invalidEmail');
        break;
      case 'password':
        if (!value) errorMsg = t('requiredField');
        else if (value.length < 6) errorMsg = t('passwordLengthError');
        break;
      case 'confirmPassword':
        if (!value) errorMsg = t('requiredField');
        else if (value !== password) errorMsg = t('passwordsDoNotMatch');
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: errorMsg }));
    return errorMsg === ''; // Return true if valid
  };

  const handleInputChange = (e, fieldName) => {
    const { value } = e.target;
    if (fieldName === 'fullName') setFullName(value);
    if (fieldName === 'email') setEmail(value);
    if (fieldName === 'password') setPassword(value);
    if (fieldName === 'confirmPassword') setConfirmPassword(value);
    
    // Validate on change after initial interaction (or on blur)
    validateField(fieldName, value);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate all fields on submit
    const isFullNameValid = validateField('fullName', fullName);
    const isEmailValid = validateField('email', email);
    const isPasswordValid = validateField('password', password);
    const isConfirmPasswordValid = validateField('confirmPassword', confirmPassword);

    if (!isFullNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      setFormError(t('fillRequiredFieldsError') || 'Please correct the errors in the form.');
      // Add "fillRequiredFieldsError": "يرجى تصحيح الأخطاء في النموذج." to common.json
      return;
    }
    
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(), // Pass full_name to be used by handle_new_user trigger
                                    // and for email templates if needed.
        }
      }
    });

    if (signUpError) {
      setFormError(signUpError.message);
      toast.error(t('signupError') + (signUpError.message.includes('User already registered') ? ': ' + t('emailAlreadyRegistered') : ''));
      // Add "emailAlreadyRegistered": "هذا البريد الإلكتروني مسجل بالفعل." to common.json
    } else if (data.user) {
      // The handle_new_user trigger in Supabase should create the profile row.
      // We passed full_name in options.data.
      
      // Check if email confirmation is required
      if (data.session === null && data.user.identities && data.user.identities.length > 0) {
         // Email confirmation is likely required.
         toast.success(t('signupSuccessConfirmEmail') || 'Signup successful! Please check your email to confirm your account.');
         // Add "signupSuccessConfirmEmail": "تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد حسابك."
         navigate('/login'); // Navigate to login, user needs to confirm email
      } else {
        // Auto-login or no email confirmation needed
        toast.success(t('operationSuccessful'));
        // AuthProvider will pick up the session, App.jsx logic will redirect to /dashboard
      }
    } else {
        // Should not happen if no error and no user, but as a fallback
        setFormError(t('signupFailedUnknown') || 'Signup failed due to an unknown error.');
        toast.error(t('signupFailedUnknown') || 'Signup failed due to an unknown error.');
        // Add "signupFailedUnknown": "فشل إنشاء الحساب بسبب خطأ غير معروف." to common.json
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-deep p-4 py-12">
      <div className="max-w-md w-full bg-navy-light p-8 rounded-xl shadow-2xl space-y-6">
        <div className="text-center">
          <FiUserPlus className="mx-auto h-12 w-12 text-accent-blue mb-3" />
          <h2 className="text-3xl font-bold text-text-primary-dark">{t('signup')}</h2>
          <p className="mt-2 text-sm text-text-secondary-dark">{t('tagline')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            id="fullName"
            label={t('fullName')}
            type="text"
            value={fullName}
            onChange={(e) => handleInputChange(e, 'fullName')}
            onBlur={(e) => validateField('fullName', e.target.value)}
            placeholder={t('fullNamePlaceholder') || 'Enter your full name'}
            error={errors.fullName}
            required
            // leftIcon={<FiUser className="text-text-secondary-dark" />} // Example of icon with input
          />
          {/* Add "fullNamePlaceholder": "ادخل اسمك الكامل" to common.json */}

          <Input
            id="email"
            label={t('email')}
            type="email"
            value={email}
            onChange={(e) => handleInputChange(e, 'email')}
            onBlur={(e) => validateField('email', e.target.value)}
            placeholder="your@email.com"
            error={errors.email}
            required
          />
          <Input
            id="password"
            label={t('password')}
            type="password"
            value={password}
            onChange={(e) => handleInputChange(e, 'password')}
            onBlur={(e) => validateField('password', e.target.value)}
            placeholder="********"
            error={errors.password}
            required
          />
          <Input
            id="confirmPassword"
            label={t('confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => handleInputChange(e, 'confirmPassword')}
            onBlur={(e) => validateField('confirmPassword', e.target.value)}
            placeholder="********"
            error={errors.confirmPassword}
            required
          />

          {formError && <p className="text-sm text-red-400 text-center py-2">{formError}</p>}

          <Button type="submit" isLoading={loading} disabled={loading} className="w-full !mt-6" variant="primary">
            {loading ? t('loading') : t('signup')}
          </Button>
        </form>
        <p className="text-center text-sm text-text-secondary-dark pt-4">
          {t('alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-medium text-accent-blue hover:underline">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;