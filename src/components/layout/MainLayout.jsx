import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom'; // Removed Link as it wasn't used directly
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

  const handleLogout = async () => { const { error } = await supabase.auth.signOut(); if (error) { toast.error(t('operationFailed') + `: ${error.message}`); } else { toast.success(t('logoutSuccess')); navigate('/login'); }};

  return (
    <header className="bg-nuzum-surface shadow-card sticky top-0 z-20 border-b border-nuzum-border"> {/* z-index adjusted if needed */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Sidebar Toggle Button */}
          <div>
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md text-nuzum-text-secondary hover:text-nuzum-text-primary hover:bg-nuzum-sidebar-bg focus:outline-none md:me-2" // Added md:me-2 for spacing when sidebar is static
              aria-label={sidebarOpen ? t('closeSidebar') : t('openSidebar')}
              // Add "closeSidebar": "إغلاق الشريط الجانبي" and "openSidebar": "فتح الشريط الجانبي" to translations
            >
              {sidebarOpen && i18n.dir() === 'ltr' && <FiChevronsLeft size={24} />}
              {sidebarOpen && i18n.dir() === 'rtl' && <FiChevronsRight size={24} />}
              {!sidebarOpen && i18n.dir() === 'ltr' && <FiChevronsRight size={24} />}
              {!sidebarOpen && i18n.dir() === 'rtl' && <FiChevronsLeft size={24} />}
            </button>
          </div>
          
          {/* Right Aligned Items */}
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
  // Default sidebar to closed on small screens, open on larger screens (md breakpoint: 768px)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => { // Renamed from closeSidebarOnMobile for clarity
    setSidebarOpen(false);
  };

  // Effect to handle initial sidebar state and window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true); // Open by default on desktop
      } else {
        setSidebarOpen(false); // Closed by default on mobile
      }
    };
    // Set initial state
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to close mobile sidebar on route change
  useEffect(() => {
    if (window.innerWidth < 768 && sidebarOpen) {
      setSidebarOpen(false); // Close it if it was open on mobile and route changed
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Only depend on location.pathname


  return (
    <div className="h-screen flex overflow-x-hidden bg-nuzum-bg-deep"> {/* overflow-x-hidden on parent */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /> {/* Pass setSidebarOpen(false) directly for close actions */}
      
      {/* Main content area */}
      <div 
        className={`
          flex-1 flex flex-col 
          transition-all duration-300 ease-in-out
          overflow-y-auto  /* Allow content to scroll */
          ${sidebarOpen ? 'md:ms-60 lg:ms-64' : 'md:ms-0'} 
          ${sidebarOpen ? 'rtl:md:me-60 rtl:lg:me-64' : 'rtl:md:me-0'}
        `}
      >
        <ContentHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <div className="flex-grow p-4 sm:p-6 lg:p-8 bg-nuzum-bg-deep"> {/* This div now ensures padding is consistent */}
          <Outlet /> 
        </div>
      </div>
    </div>
  );
};

export default MainLayout;