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