# Treningsappen - CatDoes

Monorepo project with a Vite/React web app and an Expo mobile app.

## Project Structure
- `.` (Root/Vite): The original web application built with Vite, React, Tailwind CSS, and shadcn/ui.
- `apps/mobile`: The mobile version of the app built with React Native (Expo) and Expo Router.

## Tech Stack
### Web (`.`)
- **Framework**: Vite + React
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend**: Supabase
- **Mapping**: Mapbox GL JS

### Mobile (`apps/mobile`)
- **Framework**: Expo (React Native)
- **Routing**: Expo Router (File-based)
- **Styling**: NativeWind (Tailwind for React Native) + Gluestack UI
- **Mapping**: `react-native-maps` (with web fallback)
- **Backend**: Supabase (Shared logic in `apps/mobile/lib/supabase.ts`)

## Implementation Details (Mobile)
- **Navigation**: 6-tab bottom navigation (Hjem, Kalender, Kart, Trening, Fellesskap, Settings).
- **Authentication**: Powered by Supabase Auth with AsyncStorage persistence.
- **Data Services**: Modular services in `apps/mobile/services/` for Peak DB, Leaderboards, Workout sessions, and more.
- **Mapping**: Uses `react-native-maps` on native devices and a custom list-view fallback on web for the preview. Includes Mapbox integration for advanced layers (Terrain, Atmosphere, Boundaries).
- **Leaderboards**: Client-side aggregation of `peak_checkins` for Global, Friends, and Per-Peak views. Supports filtering by period (Month, Year, Total) and metric (Unique Peaks, Total Trips). Handles child profiles with 👶 emoji.
- **Styling**: Emerald green (`#10B981`) accent color used throughout for a consistent outdoor/fitness theme. Full Dark Mode support.

## Key Files
- `apps/mobile/app/(tabs)/map.tsx`: Native map implementation and main navigation hub for map-related features.
- `apps/mobile/components/PeakProfileSheet.tsx`: Detailed view for a specific peak with weather, feed, and leaderboard.
- `apps/mobile/components/LeaderboardView.tsx`: Global/Friends leaderboard list and filters.
- `apps/mobile/components/leaderboard/PeakLeaderboard.tsx`: Top 10 leaderboard for a specific peak.
- `apps/mobile/services/leaderboardService.ts`: Core logic for fetching and aggregating leaderboard data.
- `apps/mobile/app/(tabs)/index.tsx`: Dashboard with weekly metrics.
- `apps/mobile/app/(tabs)/calendar.tsx`: Calendar entry point.
- `apps/mobile/components/calendar/CalendarView.tsx`: Main calendar component with infinite scroll.

## Calendar Modular Structure
The calendar is implemented using a modular approach:
- **Hooks**:
  - `useCalendarData`: Fetches workouts/goals and groups them by date.
  - `useInfiniteMonths`: Manages the bidirectional infinite range of months.
- **Components**:
  - `CalendarView`: Container with `FlatList` for infinite vertical scrolling.
  - `MonthGrid`: Renders a 7xN grid for a month.
  - `CalendarDayCell`: Renders a single day with activity icons and color coding.