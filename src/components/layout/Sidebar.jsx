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
          fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out
          md:hidden 
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <aside 
        className={`
          w-60 md:w-64 bg-nuzum-sidebar-bg text-nuzum-text-primary flex-shrink-0 flex flex-col shadow-2xl border-e border-nuzum-border
          fixed inset-y-0 start-0 z-40 transform transition-transform duration-300 ease-in-out 
          md:sticky md:top-0 md:h-screen md:translate-x-0 /* Desktop styles: sticky and always translated in */
          
          ${i18n.dir() === 'rtl' ? 
            (isOpen ? 'translate-x-0' : 'translate-x-full') :  // RTL: slides from right
            (isOpen ? 'translate-x-0' : '-translate-x-full')    // LTR: slides from left
          }
        `}
        // For desktop, the actual "hiding" (making space) is handled by MainLayout adjusting its own margin/width
        // This `aside` for desktop will effectively always be translate-x-0 when visible
      >
        {/* Close button for mobile, positioned absolutely within the sidebar */}
        <div className="md:hidden absolute top-2 end-2 z-50"> 
            <button onClick={onClose} className="p-2 rounded-full text-nuzum-text-secondary hover:text-nuzum-text-primary hover:bg-nuzum-surface">
                <FiX size={24} />
            </button>
        </div>

        <div className="h-20 flex items-center justify-center px-4 border-b border-nuzum-border mb-4 pt-8 md:pt-0"> {/* Added padding top for mobile to not overlap X button */}
          <Link to="/" className="flex flex-col items-center text-nuzum-text-primary hover:opacity-80 py-2" onClick={onClose}>
            <img className="h-10 w-auto mb-1" src="/favicon.png" alt={t('appName')} />
            <span className="font-bold text-lg tracking-tight">{t('appName')}</span>
          </Link>
        </div>
        <nav className="flex-grow px-4 space-y-3 overflow-y-auto">
          <NavItem to="/dashboard" icon={FiGrid} labelKey="dashboard" />
          <NavItem to="/accounts" icon={FiDollarSign} labelKey="accounts" />
          <NavItem to="/materials" icon={FiBox} labelKey="materials" />
          <NavItem to="/transactions" icon={FiRepeat} labelKey="transactions" />
          <NavItem to="/debts" icon={FiList} labelKey="debts" />
        </nav>
        <div className="px-4 pt-4 pb-2 mt-auto border-t border-nuzum-border space-y-1"> 
          <p className="px-4 pt-2 pb-1 text-xs font-semibold text-nuzum-text-placeholder uppercase tracking-wider">{t('settings')}</p>
          <div className="space-y-3 ps-0">
              <NavItem to="/settings/currencies" icon={FiCreditCard} labelKey="customCurrencies" />
          </div>
          <NavItem to="/profile" icon={FiUser} labelKey="profile" />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;