import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { FiLogOut, FiUser, FiMenu } from 'react-icons/fi'; // Use FiMenu for mobile toggle
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const ContentHeader = ({ onMobileMenuToggle }) => { 
  const { t } = useTranslation('common');
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { const { error } = await supabase.auth.signOut(); if (error) { toast.error(t('operationFailed') + `: ${error.message}`); } else { toast.success(t('logoutSuccess')); navigate('/login'); }};

  return (
    <header className="bg-nuzum-surface shadow-card sticky top-0 z-20 border-b border-nuzum-border">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Toggle Button - only visible on small screens */}
          <div className="md:hidden"> {/* This button ONLY shows on small screens */}
            <button
              onClick={onMobileMenuToggle}
              className="p-2 rounded-md text-nuzum-text-secondary hover:text-nuzum-text-primary hover:bg-nuzum-sidebar-bg focus:outline-none"
              aria-label={t('openSidebar')}
            >
              <FiMenu size={24} />
            </button>
          </div>

          {/* Spacer to push right items to the end when mobile menu button is not there (on desktop) */}
          <div className="hidden md:flex flex-1"></div>

          <div className="flex items-center space-s-3 sm:space-s-4">
            <LanguageSwitcher />
            {user && (
              <div className="flex items-center space-s-3">
                {profile?.avatar_url ? ( <img className="h-8 w-8 rounded-full object-cover border-2 border-nuzum-border" src={profile.avatar_url} alt={profile.full_name || t('profile')} /> ) : ( <span className="flex items-center justify-center h-8 w-8 rounded-full bg-nuzum-border text-nuzum-text-secondary"><FiUser className="h-5 w-5" /></span> )}
                <span className="text-sm text-nuzum-text-secondary hidden md:inline">{profile?.full_name || profile?.username}</span>
                <button onClick={handleLogout} className="p-2 rounded-full text-nuzum-text-secondary hover:bg-nuzum-sidebar-bg hover:text-nuzum-text-primary focus:outline-none transition-colors" title={t('logout')}><FiLogOut className="h-5 w-5" /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const MainLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(prev => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  // Effect to close mobile sidebar on route change
  useEffect(() => {
    if (isMobileSidebarOpen) { // Only if it was open (typically on mobile)
      closeMobileSidebar();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);


  return (
    <div className="h-screen flex overflow-x-hidden bg-nuzum-bg-deep">
      {/* Sidebar is always rendered. Its internal CSS classes will handle its display.
          On desktop (md+), it will be sticky and take up space.
          On mobile, it will be fixed and its visibility (slide-in/out) is controlled by isMobileSidebarOpen.
      */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} // Prop to control mobile overlay visibility
        onMobileClose={closeMobileSidebar}   // Prop to close it from within (e.g. nav link click)
      /> 
      
      {/* Main content area - flex-1 will make it take remaining space */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <ContentHeader onMobileMenuToggle={toggleMobileSidebar} /> {/* Pass toggle for mobile */}
        <div className="flex-grow p-4 sm:p-6 lg:p-8 bg-nuzum-bg-deep">
          <Outlet /> 
        </div>
      </div>
    </div>
  );
};

export default MainLayout;