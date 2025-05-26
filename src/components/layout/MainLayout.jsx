import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Make sure useTranslation is imported
import LanguageSwitcher from '../common/LanguageSwitcher';
import { FiLogOut, FiUser, FiMenu, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const ContentHeader = ({ onToggleSidebar, sidebarOpen }) => {
  const { t, i18n } = useTranslation('common'); // i18n is correctly destructured here
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { const { error } = await supabase.auth.signOut(); if (error) { toast.error(t('operationFailed') + `: ${error.message}`); } else { toast.success(t('logoutSuccess')); navigate('/login'); }};

  return (
    <header className="bg-nuzum-surface shadow-card sticky top-0 z-20 border-b border-nuzum-border">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div>
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md text-nuzum-text-secondary hover:text-nuzum-text-primary hover:bg-nuzum-sidebar-bg focus:outline-none md:me-2"
              aria-label={sidebarOpen ? t('closeSidebar') : t('openSidebar')}
            >
              {sidebarOpen ? 
                (i18n.dir() === 'rtl' ? <FiChevronsRight size={24} /> : <FiChevronsLeft size={24} />) :
                (i18n.dir() === 'rtl' ? <FiChevronsLeft size={24} /> : <FiChevronsRight size={24} />)
              }
            </button>
          </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); 
  const location = useLocation();
  const { i18n } = useTranslation('common'); // Destructure i18n here for MainLayout's scope

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // No automatic opening on resize to desktop if user explicitly closed it,
        // unless we add more complex logic to remember preference.
        // For now, if resizing to desktop, and it's not open, it stays closed.
        // If it *was* open (e.g. user just opened it), it remains open.
        // Or, to always default to open on desktop resize:
        // setSidebarOpen(true);
      } else {
        setSidebarOpen(false); 
      }
    };
    // Initial check for mobile
    if (window.innerWidth < 768) {
        setSidebarOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Removed sidebarOpen from deps to avoid loop with setSidebarOpen

  useEffect(() => {
    if (window.innerWidth < 768 && sidebarOpen) {
      setSidebarOpen(false); 
    }
  }, [location.pathname, sidebarOpen]);


  return (
    <div className="h-screen flex overflow-x-hidden bg-nuzum-bg-deep">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /> 
      
      <div 
        className={`
          flex-1 flex flex-col 
          transition-all duration-300 ease-in-out
          overflow-y-auto 
          ${sidebarOpen ? (i18n.dir() === 'rtl' ? 'md:mr-60 lg:md:mr-64' : 'md:ml-60 lg:md:ml-64') : (i18n.dir() === 'rtl' ? 'md:mr-0' : 'md:ml-0')}
        `}
      >
        <ContentHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <div className="flex-grow p-4 sm:p-6 lg:p-8 bg-nuzum-bg-deep">
          <Outlet /> 
        </div>
      </div>
    </div>
  );
};

export default MainLayout;