/**
 * Weather utilities for the mobile app, matching the implementation in the web app.
 * Uses MET Norway's public icon library.
 */

export const MET_ICON_BASE_URL = 'https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/';

/**
 * Maps WMO weather codes (from Open-Meteo) to MET Norway symbol names.
 */
export const mapWmoCodeToSymbol = (code: number): string => {
  if (code === 0) return 'clearsky_day';
  if ([1, 2].includes(code)) return 'fair_day';
  if (code === 3) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'lightrain';
  if ([61, 63, 65, 66, 67].includes(code)) return 'rain';
  if ([71, 73, 75, 77].includes(code)) return 'snow';
  if ([80, 81, 82].includes(code)) return 'rainshowers_day';
  if ([85, 86].includes(code)) return 'snowshowers_day';
  if ([95, 96, 99].includes(code)) return 'heavyrainandthunder';
  return 'cloudy';
};

/**
 * Gets the full URL for a MET Norway weather icon.
 */
export const getWeatherIconUrl = (symbol: string): string => {
  // Ensure we use the _day variant if specified by user preference, 
  // but many symbols from MET API already include _day or _night.
  // The user requested to use _day variants for this app.
  
  let normalizedSymbol = symbol;
  
  // If the symbol doesn't have a period suffix and it's one that usually has it, 
  // add _day as per user request.
  const needsSuffix = ['clearsky', 'fair', 'rainshowers', 'snowshowers', 'rainandthunder', 'snowandthunder'].includes(symbol);
  if (needsSuffix && !symbol.includes('_')) {
    normalizedSymbol = `${symbol}_day`;
  }
  
  return `${MET_ICON_BASE_URL}${normalizedSymbol}.svg`;
};