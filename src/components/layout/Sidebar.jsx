import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiBox, FiRepeat, FiDollarSign, FiUser, FiCreditCard, FiList, FiX } from 'react-icons/fi';

const Sidebar = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation('common');

  const navCardBase = `flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ease-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nuzum-sidebar-bg focus:ring-nuzum-accent-primary group`;
  const getNavLinkClasses = (isActive) => `${navCardBase} ${isActive ? 'bg-nuzum-accent-primary text-nuzum-accent-primary-content border border-transparent shadow-lg scale-105' : 'bg-nuzum-surface text-nuzum-text-secondary border border-nuzum-border shadow-subtle hover:bg-nuzum-border hover:text-nuzum-text-primary hover:border-nuzum-text-secondary hover:-translate-y-0.5 hover:shadow-card active:scale-95 active:bg-nuzum-border'}`;
  const getIconClasses = (isActive) => `me-3 h-5 w-5 transition-colors duration-200 ease-out ${isActive ? 'text-nuzum-accent-primary-content' : 'text-nuzum-text-secondary group-hover:text-nuzum-text-primary'}`;

  const NavItem = ({ to, icon: Icon, labelKey }) => (
    <NavLink to={to} onClick={onClose} className={({isActive}) => getNavLinkClasses(isActive)}>
      {({isActive}) => (<><Icon className={getIconClasses(isActive)} /><span>{t(labelKey)}</span></>)}
    </NavLink>
  );

  return (
    <>
      {/* Overlay for mobile when sidebar is open */}
      <div 
        className={`
          fixed inset-0 z-30 bg-black bg-opacity-75 transition-opacity duration-300 ease-in-out
          md:hidden  {/* Hidden on medium screens and up */}
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <aside 
        className={`
          w-60 bg-nuzum-sidebar-bg text-nuzum-text-primary flex-shrink-0 flex flex-col shadow-2xl 
          fixed inset-y-0 start-0 z-40 transform transition-transform duration-300 ease-in-out 
          md:sticky md:top-0 md:h-screen md:border-e md:border-nuzum-border {/* Desktop: sticky, part of flow */}
          md:w-64 {/* Ensure desktop width */}
          
          ${i18n.dir() === 'rtl' ? 
            (isOpen ? 'translate-x-0' : 'translate-x-full') : 
            (isOpen ? 'translate-x-0' : '-translate-x-full')
          }
          
          md:translate-x-0 /* On desktop, always ensure it's not translated off-screen if it's part of layout */
          ${ i18n.dir() === 'rtl' ? 'md:translate-x-0' : ''}
        `}
      >
        {/* Close button for mobile, positioned absolutely within the sidebar */}
        <div className="md:hidden flex justify-end p-1 absolute top-1 end-1 z-50"> 
            {isOpen && ( // Only show X button if sidebar is open
                 <button 
                    onClick={onClose} 
                    className="p-2 rounded-full text-nuzum-text-secondary hover:text-nuzum-text-primary hover:bg-nuzum-surface active:bg-nuzum-border"
                    aria-label={t('closeSidebar')}
                 >
                    <FiX size={24} />
                </button>
            )}
        </div>

        <div className="h-20 flex items-center justify-center px-4 border-b border-nuzum-border mb-2 md:mb-4 pt-8 md:pt-0">
          <Link to="/" className="flex flex-col items-center text-nuzum-text-primary hover:opacity-80 py-2" onClick={onClose}>
            <img className="h-8 md:h-10 w-auto mb-1" src="/favicon.png" alt={t('appName')} />
            <span className="font-bold text-md md:text-lg tracking-tight">{t('appName')}</span>
          </Link>
        </div>
        <nav className="flex-grow px-3 md:px-4 space-y-2 md:space-y-3 overflow-y-auto">
          <NavItem to="/dashboard" icon={FiGrid} labelKey="dashboard" />
          <NavItem to="/accounts" icon={FiDollarSign} labelKey="accounts" />
          <NavItem to="/materials" icon={FiBox} labelKey="materials" />
          <NavItem to="/transactions" icon={FiRepeat} labelKey="transactions" />
          <NavItem to="/debts" icon={FiList} labelKey="debts" />
        </nav>
        <div className="px-3 md:px-4 pt-3 md:pt-4 pb-2 mt-auto border-t border-nuzum-border space-y-1"> 
          <p className="px-4 pt-2 pb-1 text-xs font-semibold text-nuzum-text-placeholder uppercase tracking-wider">{t('settings')}</p>
          <div className="space-y-2 md:space-y-3 ps-0">
              <NavItem to="/settings/currencies" icon={FiCreditCard} labelKey="customCurrencies" />
          </div>
          <NavItem to="/profile" icon={FiUser} labelKey="profile" />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;