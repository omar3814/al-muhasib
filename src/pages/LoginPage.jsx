// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { FiLogIn, FiMail, FiLock } from 'react-icons/fi';

const LoginPage = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Determine where to redirect after login
  // If login page was accessed directly, 'from' might not be in state.
  const from = location.state?.from?.pathname || '/dashboard';

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const validateField = (name, value) => {
    let errorMsg = '';
    switch (name) {
      case 'email':
        if (!value.trim()) errorMsg = t('requiredField');
        else if (!/\S+@\S+\.\S+/.test(value)) errorMsg = t('invalidEmail');
        break;
      case 'password':
        if (!value) errorMsg = t('requiredField');
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: errorMsg }));
    return errorMsg === '';
  };
  
  const handleInputChange = (e, fieldName) => {
    const { value } = e.target;
    if (fieldName === 'email') setEmail(value);
    if (fieldName === 'password') setPassword(value);
    validateField(fieldName, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const isEmailValid = validateField('email', email);
    const isPasswordValid = validateField('password', password);

    if (!isEmailValid || !isPasswordValid) {
      setFormError(t('fillRequiredFieldsError'));
      return;
    }
    
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // More specific error messages can be good
      if (signInError.message === "Invalid login credentials") {
        setFormError(t('invalidLoginCredentials') || 'Invalid email or password.');
        // Add "invalidLoginCredentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة." to common.json
      } else if (signInError.message.includes("Email not confirmed")) {
        setFormError(t('emailNotConfirmedError') || 'Please confirm your email address first.');
        // Add "emailNotConfirmedError": "يرجى تأكيد عنوان بريدك الإلكتروني أولاً." to common.json
      }
      else {
        setFormError(signInError.message);
      }
      toast.error(t('loginError'));
    } else {
      toast.success(t('operationSuccessful'));
      // AuthProvider handles user state. App.jsx handles redirection for logged-in users.
      // Navigate to the 'from' location or dashboard.
      navigate(from, { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-deep p-4 py-12">
      <div className="max-w-md w-full bg-navy-light p-8 rounded-xl shadow-2xl space-y-6">
        <div className="text-center">
          <FiLogIn className="mx-auto h-12 w-12 text-accent-blue mb-3" />
          <h2 className="text-3xl font-bold text-text-primary-dark">{t('login')}</h2>
          <p className="mt-2 text-sm text-text-secondary-dark">{t('tagline')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

          {formError && <p className="text-sm text-red-400 text-center py-2">{formError}</p>}
          
          {/* Optional: Forgot password link */}
          {/* <div className="text-sm text-right">
            <Link to="/forgot-password" className="font-medium text-accent-blue hover:underline">
              {t('forgotPassword') || 'Forgot password?'}
            </Link>
          </div> */}

          <Button type="submit" isLoading={loading} disabled={loading} className="w-full !mt-6" variant="primary">
            {loading ? t('loading') : t('login')}
          </Button>
        </form>
        <p className="text-center text-sm text-text-secondary-dark pt-4">
          {t('dontHaveAccount')}{' '}
          <Link to="/signup" className="font-medium text-accent-blue hover:underline">
            {t('signup')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;