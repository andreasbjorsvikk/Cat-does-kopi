/**
 * Weather utilities for the mobile app, matching the implementation in the web app.
 * Uses MET Norway's public icon library.
 */

/**
 * Weather utilities for the mobile app.
 * Maps WMO weather codes to standard system emojis.
 */

/**
 * Maps WMO weather codes (from Open-Meteo) to standard emojis.
 */
export const mapWmoCodeToEmoji = (code: number): string => {
  switch (code) {
    case 0: 
      return "☀️"; // Clear sky
    case 1:
    case 2: 
      return "🌤️"; // Mainly clear, partly cloudy
    case 3: 
      return "☁️"; // Overcast
    case 45:
    case 48: 
      return "🌫️"; // Fog
    case 51:
    case 53:
    case 55:
    case 56:
    case 57: 
      return "🌦️"; // Drizzle
    case 61:
    case 63:
    case 65:
    case 66:
    case 67: 
      return "🌧️"; // Rain
    case 71:
    case 73:
    case 75:
    case 77: 
      return "🌨️"; // Snow
    case 80:
    case 81:
    case 82: 
      return "🌦️"; // Rain showers
    case 85:
    case 86: 
      return "🌨️"; // Snow showers
    case 95:
    case 96:
    case 99: 
      return "⛈️"; // Thunderstorm
    default: 
      return "☁️";
  }
};

/**
 * Maps WMO weather codes to user-friendly descriptions.
 */
export const mapWmoCodeToDescription = (code: number): string => {
  switch (code) {
    case 0: return "Klart vær";
    case 1: return "Nesten klart";
    case 2: return "Delvis skyet";
    case 3: return "Overskyet";
    case 45: return "Tåke";
    case 48: return "Rimfrosttåke";
    case 51: return "Lett yr";
    case 53: return "Moderat yr";
    case 55: return "Tett yr";
    case 61: return "Lett regn";
    case 63: return "Moderat regn";
    case 65: return "Kraftig regn";
    case 71: return "Lett snøfall";
    case 73: return "Moderat snøfall";
    case 75: return "Kraftig snøfall";
    case 80: return "Lette regnbyger";
    case 81: return "Moderate regnbyger";
    case 82: return "Kraftige regnbyger";
    case 85: return "Lette snøbyger";
    case 86: return "Kraftige snøbyger";
    case 95: return "Tordenvær";
    case 96: return "Tordenvær med hagl";
    case 99: return "Kraftig tordenvær";
    default: return "Skiftende skydekke";
  }
};