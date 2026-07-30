/**
 * Weather utilities for the mobile app, matching the implementation in the web app.
 * Uses MET Norway's public icon library.
 */

export const MET_ICON_BASE_URL = 'https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/';

/**
 * Maps WMO weather codes (from Open-Meteo) to MET Norway symbol names.
 * Implementation based on instructions from Lovable for 100% consistency.
 */
export const mapWmoCodeToSymbol = (code: number): string => {
  switch (code) {
    case 0: return "clearsky_day";
    case 1:
    case 2: return "fair_day";
    case 3: return "cloudy";
    case 45:
    case 48: return "fog";
    case 51:
    case 53:
    case 55:
    case 56:
    case 57: return "lightrain";
    case 61:
    case 63:
    case 65:
    case 66:
    case 67: return "rain";
    case 71:
    case 73:
    case 75:
    case 77: return "snow";
    case 80:
    case 81:
    case 82: return "rainshowers_day";
    case 85:
    case 86: return "snowshowers_day";
    case 95:
    case 96:
    case 99: return "heavyrainandthunder";
    default: return "cloudy";
  }
};

/**
 * Gets the full URL for a MET Norway weather icon.
 */
export const getWeatherIconUrl = (symbol: string): string => {
  return `${MET_ICON_BASE_URL}${symbol}.svg`;
};