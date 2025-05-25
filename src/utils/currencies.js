// src/utils/currencies.js
export const CURRENCIES = [
  { code: 'JOD', name_key: 'jod', symbol: 'د.أ' },      // Jordanian Dinar
  { code: 'USD', name_key: 'usd', symbol: '$' },        // US Dollar
  { code: 'TRY', name_key: 'try', symbol: '₺' },        // Turkish Lira
  { code: 'SAR', name_key: 'sar', symbol: 'ر.س' },      // Saudi Riyal
  { code: 'AED', name_key: 'aed', symbol: 'د.إ' },      // UAE Dirham
  { code: 'EUR', name_key: 'eur', symbol: '€' },        // Euro
];

// Find JOD as the default, or fallback to the first currency if JOD isn't listed (though it is).
export const DEFAULT_CURRENCY = CURRENCIES.find(c => c.code === 'JOD') || CURRENCIES[0];

// Gets the localized name or symbol of a currency.
// `t` is the translation function from i18next.
export function getCurrencyDisplay(code, t, type = 'symbol') { // type can be 'symbol' or 'name'
  const currency = CURRENCIES.find(c => c.code === code);
  if (!currency) return code; // Fallback to code if not found

  if (type === 'name' && t) {
    return t(currency.name_key); // Assumes keys like 'jod', 'usd' exist in common.json
  }
  return currency.symbol;
}

// Formats a number as currency according to locale and currency code.
// `t` is the translation function for fallback.
// `locale` can be detected or set (e.g., 'ar-JO' for Jordanian Arabic).
export function formatCurrency(amount, currencyCode, t, locale = 'ar') {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) {
    // Return empty string or some placeholder if amount is not a valid number
    return '';
  }

  try {
    // Intl.NumberFormat is powerful for localized currency formatting.
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol', // Options: 'symbol', 'code', 'name'
      // minimumFractionDigits: 2, // Ensure two decimal places
      // maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (e) {
    // Fallback if Intl.NumberFormat fails (e.g., unsupported currency code/locale combo)
    console.warn(`Intl.NumberFormat failed for ${currencyCode} with locale ${locale}:`, e);
    const symbol = getCurrencyDisplay(currencyCode, t, 'symbol');
    return `${numericAmount.toFixed(2)} ${symbol}`;
  }
}