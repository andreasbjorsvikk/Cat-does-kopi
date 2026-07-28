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
- **Data Services**: Modular services in `apps/mobile/services/` for Peak DB, Workout sessions, and more.
- **Mapping**: Uses `react-native-maps` on native devices and a custom list-view fallback on web for the preview.
- **Styling**: Emerald green (`#10B981`) accent color used throughout for a consistent outdoor/fitness theme.

## Key Files
- `apps/mobile/app/(tabs)/_layout.tsx`: Main navigation structure.
- `apps/mobile/lib/supabase.ts`: Supabase client configuration.
- `apps/mobile/app/(tabs)/map.tsx`: Native map implementation.
- `apps/mobile/app/(tabs)/index.tsx`: Dashboard with weekly metrics.
- `apps/mobile/app/(tabs)/calendar.tsx`: Calendar entry point.
- `apps/mobile/components/calendar/CalendarView.tsx`: Main calendar component with infinite scroll.
- `apps/mobile/components/calendar/MonthGrid.tsx`: Monthly grid view.
- `apps/mobile/components/calendar/CalendarDayCell.tsx`: Individual day cell.

## Calendar Modular Structure
The calendar is implemented using a modular approach:
- **Hooks**:
  - `useCalendarData`: Fetches workouts/goals and groups them by date.
  - `useInfiniteMonths`: Manages the bidirectional infinite range of months.
- **Components**:
  - `CalendarView`: Container with `FlatList` for infinite vertical scrolling.
  - `MonthGrid`: Renders a 7xN grid for a month.
  - `CalendarDayCell`: Renders a single day with activity icons and color coding.