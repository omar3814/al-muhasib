import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { FiLogOut, FiUser, FiLogIn, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../common/LanguageSwitcher';

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

  return (
    <nav className="bg-navy-light shadow-lg sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center text-accent-blue hover:opacity-80 transition-opacity">
              <img className="h-8 w-auto me-2" src="/favicon.png" alt={t('appName')} />
              <span className="font-bold text-xl">
                {t('appName')}
              </span>
            </Link>
            {user && (
              <div className="hidden md:block">
                <div className="ms-10 flex items-baseline space-s-4">
                  <Link to="/dashboard" className="text-text-secondary-dark hover:text-text-primary-dark px-3 py-2 rounded-md text-sm font-medium">{t('dashboard')}</Link>
                  <Link to="/accounts" className="text-text-secondary-dark hover:text-text-primary-dark px-3 py-2 rounded-md text-sm font-medium">{t('accounts')}</Link>
                  <Link to="/materials" className="text-text-secondary-dark hover:text-text-primary-dark px-3 py-2 rounded-md text-sm font-medium">{t('materials')}</Link>
                  <Link to="/transactions" className="text-text-secondary-dark hover:text-text-primary-dark px-3 py-2 rounded-md text-sm font-medium">{t('transactions')}</Link>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <LanguageSwitcher />
            {user ? (
              <div className="ms-3 relative flex items-center">
                {profile?.avatar_url && (
                  <img className="h-8 w-8 rounded-full me-2 object-cover border-2 border-slate-blue" src={profile.avatar_url} alt={profile.username || 'User'} />
                )}
                <span className="text-text-secondary-dark me-3 hidden sm:inline">{profile?.full_name || profile?.username || user.email}</span>
                <Link to="/profile" className="p-1 rounded-full text-text-secondary-dark hover:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-light focus:ring-white" title={t('profile')}>
                  <FiUser className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="ms-3 p-1 rounded-full text-text-secondary-dark hover:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-light focus:ring-white"
                  title={t('logout')}
                >
                  <FiLogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="space-s-2">
                <Link to="/login" className="text-text-secondary-dark hover:text-text-primary-dark px-3 py-2 rounded-md text-sm font-medium inline-flex items-center">
                  <FiLogIn className="me-1 h-4 w-4" /> {t('login')}
                </Link>
                <Link to="/signup" className="bg-accent-blue text-white hover:bg-blue-500 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center">
                  <FiUserPlus className="me-1 h-4 w-4" /> {t('signup')}
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