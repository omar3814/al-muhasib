import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiBox, FiRepeat, FiDollarSign, FiUser, FiCreditCard, FiList, FiX } from 'react-icons/fi';

const Sidebar = ({ isMobileOpen, onMobileClose }) => { 
  const { t, i18n } = useTranslation('common');

  const navCardBase = `flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ease-out transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-nuzum-sidebar-bg focus:ring-nuzum-accent-primary group`;
  const getNavLinkClasses = (isActive) => `${navCardBase} ${isActive ? 'bg-nuzum-accent-primary text-nuzum-accent-primary-content border border-transparent shadow-md scale-105' : 'bg-nuzum-surface text-nuzum-text-secondary border border-nuzum-border shadow-sm hover:bg-nuzum-border hover:text-nuzum-text-primary hover:-translate-y-px active:scale-98'}`;
  const getIconClasses = (isActive) => `me-2 h-5 w-5 transition-colors ${isActive ? 'text-nuzum-accent-primary-content' : 'text-nuzum-text-placeholder group-hover:text-nuzum-accent-primary'}`;

  const NavItem = ({ to, icon: Icon, labelKey }) => (
    <NavLink 
      to={to} 
      onClick={onMobileClose}
      className={({isActive}) => getNavLinkClasses(isActive)}
    >
      {({isActive}) => (<><Icon className={getIconClasses(isActive)} /><span>{t(labelKey)}</span></>)}
    </NavLink>
  );

  return (
    <>
      {isMobileOpen && ( <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={onMobileClose} aria-hidden="true" ></div> )}
      <aside 
        className={`
          w-60 bg-nuzum-sidebar-bg text-nuzum-text-primary flex-shrink-0 flex flex-col shadow-xl 
          transform transition-transform duration-300 ease-in-out
          md:w-64 md:sticky md:top-0 md:h-screen md:border-e md:border-nuzum-border md:translate-x-0
          fixed inset-y-0 start-0 z-40 
          ${i18n.dir() === 'rtl' ? (isMobileOpen ? 'translate-x-0' : 'translate-x-full') : (isMobileOpen ? 'translate-x-0' : '-translate-x-full')}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-nuzum-border mb-2 sticky top-0 bg-nuzum-sidebar-bg z-10">
          <Link to="/" className="flex items-center text-nuzum-text-primary hover:opacity-80" onClick={onMobileClose}>
            {/* Updated Logo Image and Size */}
            <img 
              className="h-10 w-auto me-2 md:h-12" /* Base height h-10, md:h-12 for slightly larger on desktop */
              src="/nuzum-logo.png"  /* CHANGE THIS if your logo file is named differently in /public */
              alt={t('appName')} 
            />
            <span className="font-bold text-lg md:text-xl tracking-tight">{t('appName')}</span>
          </Link>
          <button 
            onClick={onMobileClose} 
            className="md:hidden p-2 rounded-full text-nuzum-text-secondary hover:text-nuzum-text-primary hover:bg-nuzum-surface"
            aria-label={t('closeSidebar')}
          >
            <FiX size={22} />
          </button>
        </div>
        
        <nav className="flex-grow px-3 space-y-2 overflow-y-auto pb-4">
          <NavItem to="/dashboard" icon={FiGrid} labelKey="dashboard" />
          <NavItem to="/accounts" icon={FiDollarSign} labelKey="accounts" />
          <NavItem to="/materials" icon={FiBox} labelKey="materials" />
          <NavItem to="/transactions" icon={FiRepeat} labelKey="transactions" />
          <NavItem to="/debts" icon={FiList} labelKey="debts" />
        </nav>
        
        <div className="px-3 pt-3 pb-2 mt-auto border-t border-nuzum-border space-y-1 sticky bottom-0 bg-nuzum-sidebar-bg z-10"> 
          <p className="px-1 pt-2 pb-1 text-xs font-semibold text-nuzum-text-placeholder uppercase tracking-wider">{t('settings')}</p>
          <div className="space-y-2 ps-0">
              <NavItem to="/settings/currencies" icon={FiCreditCard} labelKey="customCurrencies" />
          </div>
          <NavItem to="/profile" icon={FiUser} labelKey="profile" />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;