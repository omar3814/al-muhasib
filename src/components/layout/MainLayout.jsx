import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { FiLogOut, FiUser, FiMenu, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const ContentHeader = ({ onToggleSidebar, sidebarOpen }) => {
  const { t, i18n } = useTranslation('common');
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { /* ... same ... */ const { error } = await supabase.auth.signOut(); if (error) { toast.error(t('operationFailed') + `: ${error.message}`); } else { toast.success(t('logoutSuccess')); navigate('/login'); }};

  return (
    <header className="bg-nuzum-surface shadow-card sticky top-0 z-30 border-b border-nuzum-border">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div>
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md text-nuzum-text-secondary hover:text-nuzum-text-primary hover:bg-nuzum-sidebar-bg focus:outline-none"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? 
                (i18n.dir() === 'rtl' ? <FiChevronsRight size={22} /> : <FiChevronsLeft size={22} />) :
                (i18n.dir() === 'rtl' ? <FiChevronsLeft size={22} /> : <FiChevronsRight size={22} />)
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebarOnMobile = () => { if (window.innerWidth < 768) setSidebarOpen(false); };

  useEffect(() => { const handleResize = () => { if (window.innerWidth >= 768) setSidebarOpen(true); else setSidebarOpen(false); }; handleResize(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
  useEffect(() => { if (window.innerWidth < 768 && sidebarOpen) closeSidebarOnMobile(); }, [location.pathname, sidebarOpen]); // sidebarOpen added to dependency

  return (
    <div className="h-screen flex overflow-hidden bg-nuzum-bg-deep">
      {/* Conditionally render Sidebar for desktop based on sidebarOpen or always render and control via classes */}
      {/* Approach 1: Conditional rendering for desktop (simpler if transitions are not paramount for desktop hide) */}
      {/* <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-60 md:w-64' : 'w-0'} md:block`}>
        {sidebarOpen && <Sidebar isOpen={sidebarOpen} onClose={closeSidebarOnMobile} />}
      </div> */}

      {/* Approach 2: Always render, use translate and margin for desktop (better for transitions) */}
      <div className={`
        flex-shrink-0 
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-60 md:w-64' : 'w-0 md:w-0'} 
        overflow-hidden 
        relative /* Needed for fixed/sticky sidebar within */
      `}>
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebarOnMobile} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto"> {/* Removed conditional margin, sidebar presence handles width */}
        <ContentHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-nuzum-bg-deep overflow-y-auto">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default MainLayout;