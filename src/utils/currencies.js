import { supabase } from '../lib/supabaseClient';

const FALLBACK_PREDEFINED_CURRENCIES = [
  { id: 'global-usd', code: 'USD', name_key: 'usd', symbol: '$', is_custom: false, user_id: null },
  { id: 'global-eur', code: 'EUR', name_key: 'eur', symbol: '€', is_custom: false, user_id: null },
  { id: 'global-jod', code: 'JOD', name_key: 'jod', symbol: 'د.أ', is_custom: false, user_id: null },
  { id: 'global-try', code: 'TRY', name_key: 'try', symbol: '₺', is_custom: false, user_id: null },
  { id: 'global-sar', code: 'SAR', name_key: 'sar', symbol: 'ر.س', is_custom: false, user_id: null },
  { id: 'global-aed', code: 'AED', name_key: 'aed', symbol: 'د.إ', is_custom: false, user_id: null },
  { id: 'global-egp', code: 'EGP', name_key: 'egp', symbol: 'ج.م', is_custom: false, user_id: null },
  { id: 'global-gbp', code: 'GBP', name_key: 'gbp', symbol: '£', is_custom: false, user_id: null },
];

let allCurrenciesCache = null;
let lastFetchedForUserId = null;

export async function getAllCurrenciesForUser(userId) {
  if (allCurrenciesCache && lastFetchedForUserId === userId) {
    return allCurrenciesCache;
  }

  try {
    let globalCurrencies = [];
    let userCustomCurrencies = [];

    const { data: globalData, error: globalError } = await supabase
      .from('currencies')
      .select('*')
      .eq('is_custom', false)
      .is('user_id', null)
      .order('code', { ascending: true });

    if (globalError) {
      console.error("Error fetching global currencies from DB:", globalError);
      globalCurrencies = [...FALLBACK_PREDEFINED_CURRENCIES.filter(c => !c.is_custom)];
    } else {
      globalCurrencies = globalData || [];
      FALLBACK_PREDEFINED_CURRENCIES.forEach(fbCurr => {
        if (!globalCurrencies.find(dbCurr => dbCurr.code === fbCurr.code && !dbCurr.is_custom)) {
          globalCurrencies.push(fbCurr);
        }
      });
    }
    
    if (userId) {
      const { data: customData, error: customError } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_custom', true)
        .eq('user_id', userId)
        .order('code', { ascending: true });
      if (customError) {
        console.error(`Error fetching custom currencies for user ${userId}:`, customError);
      } else {
        userCustomCurrencies = customData || [];
      }
    }
    
    const combinedMap = new Map();
    // Add DB fetched global currencies first
    globalCurrencies.forEach(curr => combinedMap.set(curr.code, curr)); 
    // Add user custom currencies, potentially overwriting a global one if user defined a custom with same code (though UI should prevent this)
    userCustomCurrencies.forEach(curr => combinedMap.set(curr.code, curr)); // Use code as key for simplicity here for user too

    const combined = Array.from(combinedMap.values());
    combined.sort((a, b) => {
        // Prioritize JOD, USD, EUR then sort alphabetically by code
        const prioritized = ['JOD', 'USD', 'EUR'];
        const aPrio = prioritized.indexOf(a.code);
        const bPrio = prioritized.indexOf(b.code);

        if (aPrio !== -1 && bPrio !== -1) return aPrio - bPrio;
        if (aPrio !== -1) return -1;
        if (bPrio !== -1) return 1;
        return a.code.localeCompare(b.code);
    });


    allCurrenciesCache = combined;
    lastFetchedForUserId = userId;
    return allCurrenciesCache;

  } catch (e) {
    console.error("Exception fetching all currencies:", e);
    allCurrenciesCache = [...FALLBACK_PREDEFINED_CURRENCIES];
    lastFetchedForUserId = null;
    return allCurrenciesCache;
  }
}

export function clearCurrencyCache() {
    allCurrenciesCache = null;
    lastFetchedForUserId = null;
}

export const HARDCODED_DEFAULT_CURRENCY = FALLBACK_PREDEFINED_CURRENCIES.find(c => c.code === 'JOD') || FALLBACK_PREDEFINED_CURRENCIES[0];

export function getCurrencyDisplayInfo(code, currenciesList = [], t) {
  const currency = currenciesList.find(c => c.code === code);
  if (currency) {
    const name = currency.is_custom ? currency.name : (t ? t(currency.name_key || currency.code.toLowerCase(), currency.name) : currency.name);
    return { symbol: currency.symbol, name: name, code: currency.code, id: currency.id }; // Added id
  }
  const fallback = FALLBACK_PREDEFINED_CURRENCIES.find(c => c.code === code);
  if (fallback) {
    return { symbol: fallback.symbol, name: (t ? t(fallback.name_key, fallback.name) : fallback.name), code: fallback.code, id: fallback.id };
  }
  return { symbol: code, name: code, code: code, id: code }; // Fallback id to code
}

export function formatCurrency(amount, currencyCode, t, currenciesList = [], locale = 'ar') {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return '';
  const currencyInfo = getCurrencyDisplayInfo(currencyCode, currenciesList, t);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyInfo.code, 
      currencyDisplay: 'symbol', 
    }).format(numericAmount);
  } catch (e) {
    // Fallback if Intl.NumberFormat fails for the code (e.g. custom code)
    return `${numericAmount.toFixed(2)} ${currencyInfo.symbol}`;
  }
}