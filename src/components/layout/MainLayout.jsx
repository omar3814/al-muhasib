import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { FiLogOut, FiUser, FiMenu, FiX } from 'react-icons/fi'; // Added FiMenu, FiX
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useState } from 'react'; // Added useState

const ContentHeader = ({ toggleSidebar, isSidebarOpen }) => { // Added props for mobile sidebar
  const { t } = useTranslation('common');
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { /* ... same as before ... */ const { error } = await supabase.auth.signOut(); if (error) { toast.error(t('operationFailed') + `: ${error.message}`); } else { toast.success(t('logoutSuccess')); navigate('/login'); }};

  return (
    <header className="bg-nuzum-surface shadow-card sticky top-0 z-30 border-b border-nuzum-border"> {/* z-30 to be below sidebar overlay on mobile */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button - shown only on small screens */}
          <div className="lg:hidden">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-nuzum-text-secondary hover:text-nuzum-text-primary hover:bg-nuzum-sidebar-bg focus:outline-none"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>

          {/* Spacer to push right content on larger screens if no left content in header */}
          <div className="hidden lg:flex lg:flex-1"></div>

          <div className="flex items-center space-s-4">
            <LanguageSwitcher />
            {user && (
              <div className="flex items-center space-s-3">
                {profile?.avatar_url ? ( <img className="h-8 w-8 rounded-full object-cover border-2 border-nuzum-border" src={profile.avatar_url} alt={profile.full_name || t('profile')} /> ) : ( <span className="flex items-center justify-center h-8 w-8 rounded-full bg-nuzum-border text-nuzum-text-secondary"><FiUser className="h-5 w-5" /></span> )}
                <span className="text-sm text-nuzum-text-secondary hidden md:inline">{profile?.full_name || profile?.username}</span>
                <button onClick={handleLogout} className="p-2 rounded-full text-nuzum-text-secondary hover:bg-nuzum-sidebar-bg hover:text-nuzum-text-primary focus:outline-none transition-colors" title={t('logout')}> <FiLogOut className="h-5 w-5" /> </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const MainLayout = () => {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const toggleSidebarMobile = () => setIsSidebarOpenMobile(!isSidebarOpenMobile);

  return (
    // Main container uses flex for sidebar and content layout
    <div className="h-screen flex overflow-hidden bg-nuzum-bg-deep">
      {/* Sidebar: hidden on small screens, fixed on larger screens */}
      <div className={`fixed inset-y-0 start-0 z-50 transform ${isSidebarOpenMobile ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex lg:flex-shrink-0`}>
        <Sidebar />
      </div>
      
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpenMobile && (
        <div 
          className="fixed inset-0 z-40 bg-black opacity-50 lg:hidden" 
          onClick={toggleSidebarMobile}
        ></div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto"> {/* This makes content scrollable */}
        <ContentHeader toggleSidebar={toggleSidebarMobile} isSidebarOpen={isSidebarOpenMobile} />
        {/* Padding for main content is now applied here to avoid double padding from page components */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 bg-nuzum-bg-deep"> 
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default MainLayout;