import { Language } from '../i18n/translations';

/**
 * Formats a date based on the current language
 */
export const formatDate = (
  date: Date | string | number,
  lang: Language,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
) => {
  const d = new Date(date);
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';
  return new Intl.DateTimeFormat(locale, options).format(d);
};

/**
 * Formats a number based on the current language
 */
export const formatNumber = (
  num: number,
  lang: Language,
  options?: Intl.NumberFormatOptions
) => {
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';
  return new Intl.NumberFormat(locale, options).format(num);
};

/**
 * Returns the locale string for the current language
 */
export const getLocale = (lang: Language) => {
  return lang === 'no' ? 'nb-NO' : 'en-US';
};