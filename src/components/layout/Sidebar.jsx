import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiBox, FiRepeat, FiDollarSign, FiUser, FiCreditCard } from 'react-icons/fi';

const Sidebar = () => {
  const { t } = useTranslation('common');

  const navCardBase = `flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ease-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nuzum-sidebar-bg focus:ring-nuzum-accent-primary group`;
  
  const getNavLinkClasses = (isActive) => 
    `${navCardBase} ${isActive 
      ? 'bg-nuzum-accent-primary text-nuzum-accent-primary-content border border-transparent shadow-lg scale-105' 
      : 'bg-nuzum-surface text-nuzum-text-secondary border border-nuzum-border shadow-subtle hover:bg-nuzum-border hover:text-nuzum-text-primary hover:border-nuzum-text-secondary hover:-translate-y-0.5 hover:shadow-card active:scale-95 active:bg-nuzum-border'
    }`;
  
  const getIconClasses = (isActive) => 
    `me-3 h-5 w-5 transition-colors duration-200 ease-out ${isActive ? 'text-nuzum-accent-primary-content' : 'text-nuzum-text-placeholder group-hover:text-nuzum-accent-primary'}`;

  const NavItem = ({ to, icon: Icon, labelKey }) => {
    return (
      <NavLink to={to} className={({isActive}) => getNavLinkClasses(isActive)}>
        {({isActive}) => ( // Use the render prop pattern for NavLink children
          <>
            <Icon className={getIconClasses(isActive)} />
            <span>{t(labelKey)}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="w-60 md:w-64 bg-nuzum-sidebar-bg text-nuzum-text-primary flex-shrink-0 flex flex-col shadow-2xl border-e border-nuzum-border">
      <div className="h-20 flex items-center justify-center px-4 border-b border-nuzum-border mb-4">
        <Link to="/" className="flex flex-col items-center text-nuzum-text-primary hover:opacity-80 py-2">
          <img className="h-10 w-auto mb-1" src="/favicon.png" alt={t('appName')} />
          <span className="font-bold text-lg tracking-tight">{t('appName')}</span>
        </Link>
      </div>
      <nav className="flex-grow px-4 space-y-3 overflow-y-auto">
        <NavItem to="/dashboard" icon={FiGrid} labelKey="dashboard" />
        <NavItem to="/accounts" icon={FiDollarSign} labelKey="accounts" />
        <NavItem to="/materials" icon={FiBox} labelKey="materials" />
        <NavItem to="/transactions" icon={FiRepeat} labelKey="transactions" />
      </nav>
      <div className="px-4 pt-4 pb-2 mt-auto border-t border-nuzum-border space-y-1"> 
        <p className="px-4 pt-2 pb-1 text-xs font-semibold text-nuzum-text-placeholder uppercase tracking-wider">{t('settings')}</p>
        <div className="space-y-3 ps-0">
            <NavItem to="/settings/currencies" icon={FiCreditCard} labelKey="customCurrencies" />
        </div>
        <NavItem to="/profile" icon={FiUser} labelKey="profile" />
      </div>
    </aside>
  );
};

export default Sidebar;