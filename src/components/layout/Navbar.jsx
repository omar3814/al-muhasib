import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { FiLogOut, FiUser, FiLogIn, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../common/LanguageSwitcher'; // Assuming this is still desired

const Navbar = () => {
  const { t } = useTranslation('common');
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t('operationFailed') + `: ${error.message}`);
    } else {
      toast.success(t('logoutSuccess'));
      navigate('/login');
    }
  };

  // The "Personal Accountant" image has a very minimal top area, if any.
  // This Navbar will be styled to be a simple bar.
  // The image has "Lorem Ipsum" and buttons directly.
  // For an app, we usually need persistent navigation.

  return (
    <nav className="bg-pa-dark-bg border-b border-pa-dark-border shadow-subtle-dark sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: App Name/Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center hover:opacity-75 transition-opacity">
              <img className="h-8 w-auto me-3" src="/favicon.png" alt={t('appName')} />
              <span className="font-semibold text-xl text-pa-text-primary">
                {t('appName')}
              </span>
            </Link>
          </div>

          {/* Center: Navigation Links (only if user is logged in) */}
          {user && (
            <div className="hidden md:flex items-baseline space-x-4"> {/* Using space-x for LTR/RTL auto */}
              <Link to="/dashboard" className="text-pa-text-secondary hover:text-pa-text-primary px-3 py-2 rounded-md text-sm font-medium">{t('dashboard')}</Link>
              <Link to="/accounts" className="text-pa-text-secondary hover:text-pa-text-primary px-3 py-2 rounded-md text-sm font-medium">{t('accounts')}</Link>
              <Link to="/materials" className="text-pa-text-secondary hover:text-pa-text-primary px-3 py-2 rounded-md text-sm font-medium">{t('materials')}</Link>
              <Link to="/transactions" className="text-pa-text-secondary hover:text-pa-text-primary px-3 py-2 rounded-md text-sm font-medium">{t('transactions')}</Link>
            </div>
          )}

          {/* Right side: Language Switcher & User/Auth Links */}
          <div className="flex items-center">
            <LanguageSwitcher />
            {user ? (
              <div className="ms-3 relative flex items-center">
                {profile?.avatar_url && (
                  <img className="h-8 w-8 rounded-full me-2 object-cover border-2 border-pa-dark-border" src={profile.avatar_url} alt={profile.username || 'User'} />
                )}
                {/* <span className="text-pa-text-secondary me-3 hidden sm:inline">{profile?.full_name || profile?.username || user.email}</span> */}
                <Link 
                  to="/profile" 
                  className="p-2 rounded-full text-pa-text-secondary hover:bg-pa-dark-surface hover:text-pa-text-primary" 
                  title={t('profile')}
                >
                  <FiUser className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="ms-2 p-2 rounded-full text-pa-text-secondary hover:bg-pa-dark-surface hover:text-pa-text-primary"
                  title={t('logout')}
                >
                  <FiLogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="ms-3 space-x-2 flex"> {/* Using space-x */}
                <Link to="/login" className="text-pa-text-secondary hover:text-pa-text-primary px-3 py-2 rounded-md text-sm font-medium hover:bg-pa-dark-surface">
                  {t('login')}
                </Link>
                <Link 
                    to="/signup" 
                    className="bg-pa-button-bg text-pa-text-primary hover:bg-pa-button-hover-bg px-4 py-2 rounded-lg text-sm font-medium shadow-subtle-dark"
                    // This button style needs to be decided. The image shows light buttons with dark text, OR dark buttons with light text
                    // Let's try a button style closer to the image's placeholder dark buttons for signup.
                    // className="bg-pa-dark-surface text-pa-text-primary hover:opacity-80 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {t('signup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;