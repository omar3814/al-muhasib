import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; // Ensure i18n is available
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { FiDollarSign, FiArchive, FiRepeat, FiTrendingUp, FiTrendingDown, FiAlertCircle } from 'react-icons/fi';
import { formatCurrency, getCurrencyDisplay } from '../utils/currencies';

const StatCard = ({ title, value, icon, color = 'text-accent-blue', description }) => (
  <div className="bg-navy-light p-6 rounded-xl shadow-lg flex items-start space-s-4 h-full">
    <div className={`p-3 rounded-lg bg-slate-blue ${color} mt-1`}>
      {React.cloneElement(icon, { className: "h-6 w-6" })}
    </div>
    <div className="flex-1">
      <p className="text-sm text-text-secondary-dark font-medium">{title}</p>
      <p className="text-2xl font-semibold text-text-primary-dark whitespace-nowrap overflow-hidden text-ellipsis">{value}</p>
      {description && <p className="text-xs text-text-secondary-dark mt-1">{description}</p>}
    </div>
  </div>
);

const DashboardPage = () => {
  const { t, i18n } = useTranslation('common'); // Destructure i18n here
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalAccountBalance: {},
    totalMaterialsValue: {},
    recentTransactionsCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) {
        setLoading(false); // Stop loading if no user
        return;
    }
    setLoading(true);
    setError('');

    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('balance, currency')
        .eq('user_id', user.id);
      if (accountsError) throw accountsError;

      let totalBalanceByCurrency = {};
      if (accounts) {
        accounts.forEach(acc => {
          totalBalanceByCurrency[acc.currency] = (totalBalanceByCurrency[acc.currency] || 0) + parseFloat(acc.balance);
        });
      }
      
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('price_per_unit, quantity, currency')
        .eq('user_id', user.id);
      if (materialsError) throw materialsError;
      
      let totalMaterialsValueByCurrency = {};
      if (materials) {
        materials.forEach(mat => {
            const value = parseFloat(mat.price_per_unit) * mat.quantity;
            totalMaterialsValueByCurrency[mat.currency] = (totalMaterialsValueByCurrency[mat.currency] || 0) + value;
        });
      }

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, date, type, amount, currency, notes, accounts(name)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);
      if (transactionsError) throw transactionsError;
      
      setStats({
        totalAccountBalance: totalBalanceByCurrency,
        totalMaterialsValue: totalMaterialsValueByCurrency,
        recentTransactionsCount: transactionsData?.length || 0,
      });
      setRecentTransactions(transactionsData || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err.message);
      setError(t('errorFetchingDashboard'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !error) { // Added !error condition
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
         <svg className="animate-spin h-10 w-10 text-accent-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-10 bg-navy-light rounded-xl shadow-lg">
        <FiAlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-400">{error}</p>
        <Button onClick={fetchData} className="mt-4" variant="secondary">
          {t('retry')}
        </Button>
      </div>
    );
  }
  
  const userName = profile?.full_name || profile?.username || user?.email || t('guest');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary-dark mb-1">
          {t('welcomeMessage', { name: userName })}
        </h1>
        <p className="text-text-secondary-dark">
          {t('dashboardOverviewSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(stats.totalAccountBalance).length > 0 ? (
          Object.entries(stats.totalAccountBalance).map(([currency, balance]) => (
            <StatCard 
              key={`balance-${currency}`}
              title={`${t('totalBalance')} (${getCurrencyDisplay(currency, t, 'name')})`}
              value={formatCurrency(balance, currency, t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}
              icon={<FiDollarSign />}
            />
          ))
        ) : (
          <StatCard 
            title={t('totalBalance')}
            value={formatCurrency(0, 'JOD', t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}
            icon={<FiDollarSign />}
            description={t('noAccountsYet')}
          />
        )}
        
        {Object.keys(stats.totalMaterialsValue).length > 0 ? (
          Object.entries(stats.totalMaterialsValue).map(([currency, value]) => (
            <StatCard
              key={`materials-${currency}`}
              title={`${t('totalInventoryValue')} (${getCurrencyDisplay(currency, t, 'name')})`}
              value={formatCurrency(value, currency, t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}
              icon={<FiArchive />}
              color="text-green-400"
            />
          ))
        ): (
          <StatCard 
            title={t('totalInventoryValue')}
            value={formatCurrency(0, 'JOD', t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}
            icon={<FiArchive />}
            color="text-green-400"
            description={t('noMaterialsYet')}
          />
        )}
        
        <StatCard
          title={t('recentTransactionsCount')}
          value={stats.recentTransactionsCount}
          icon={<FiRepeat />}
          color="text-purple-400"
          description={t('last5Transactions')}
        />
      </div>

      <div className="bg-navy-light p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-text-primary-dark">{t('recentTransactions')}</h2>
          <Link to="/transactions" className="text-sm font-medium text-accent-blue hover:underline">
              {t('viewAll')} {t('transactions')}
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <ul className="divide-y divide-slate-blue">
            {recentTransactions.map(tx => (
              <li key={tx.id} className="py-4 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? <FiTrendingUp className="inline me-2 align-middle h-5 w-5"/> : <FiTrendingDown className="inline me-2 align-middle h-5 w-5"/>}
                    {tx.notes || (tx.accounts ? `${t(tx.type)} - ${tx.accounts.name}` : t(tx.type))}
                  </p>
                  <p className="text-xs text-text-secondary-dark mt-1">
                    {new Date(tx.date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    <span className="font-mono text-xs">{tx.accounts?.name || t('unknownAccount')}</span>
                  </p>
                </div>
                <p className={`font-semibold text-lg ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'} ps-2 text-right`}>
                  {formatCurrency(tx.amount, tx.currency, t, i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : undefined)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-secondary-dark py-4 text-center">{t('noRecentTransactions')}</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;