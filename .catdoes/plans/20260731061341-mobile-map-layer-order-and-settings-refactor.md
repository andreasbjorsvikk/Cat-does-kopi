# Context
The mobile app needs two related updates:
1. Fix the iOS map overlay bug where the Norgeskart tile layer can sit above the route line.
2. Refactor the current Settings tab into a proper nested Settings stack with a new main screen, subpages, and a connected-apps page for Apple Health and Strava.

The goal is to keep the tab bar visible, make the Settings screen match the requested structure, and make the map overlay order deterministic on iOS.

# Target & Platform
- **Target path:** `apps/mobile`
- **Framework:** Expo / React Native / Expo Router
- **Platform family:** Mobile
- **Primary target:** yes
- **Relevant skills:** `mobile-app-developer`, `eas-ios`, `eas-android`
- **Scoping constraint:** this project is registered with an **external Supabase backend** (`Produksjon Supabase`), so CatDoes Cloud tooling is not available for this task.

# Key Findings
- `apps/mobile/components/MapView/index.tsx:1033-1250` already has a style-load hook and two native map branches. The active native path uses `@rnmapbox/maps` and renders the Norgeskart raster source plus the route line in the same screen; the RN fallback uses `react-native-maps` with `UrlTile` and `Polyline` (`apps/mobile/components/MapView/index.tsx:1311-1328`).
- The current iOS error screenshot shows **Mapbox layer insertion at position 100** (`"Mapbox [error] inserting layer failed at position at(100): Index is out of range"`), which points to a **layer-ordering problem**, not a pure styling problem. Research says `zIndex` is only a convenience wrapper around layer insertion order on iOS, and large/unsafe indices can break when the referenced layer is not yet mounted.
- For `react-native-maps` on iOS, the reliable non-native fallback is to keep the tile overlay behind the polyline with explicit ordering (`UrlTile` lower, `Polyline` higher). If `shouldReplaceMapContent={true}` ever comes back into the path, the only guaranteed fix is a native iOS overlay-level patch.
- `apps/mobile/app/(tabs)/settings.tsx:1-413` is currently a single monolithic screen that mixes profile, integrations, app settings, admin controls, support, and logout. It needs to become the Settings root page only.
- `apps/mobile/app/(tabs)/_layout.tsx:1-86` currently injects a floating `ThemeToggle` into every tab. That will be redundant once the new Settings screen owns dark mode, so decide whether to keep it as a shortcut or remove it after the refactor.
- Expo Router requires a nested stack for Settings subpages. A file route (`settings.tsx`) must become a folder route (`settings/_layout.tsx` + `settings/index.tsx`) so routes like `/settings/connected-apps` stay inside the tab bar.
- Gluestack UI pieces already exist for this screen: `Avatar`/`AvatarFallbackText`, `Select`, `Switch`, `AlertDialog`, `Card`, `Heading`, `HStack`, `VStack`, `Button`, and `Text`. Use `AvatarFallbackText` before `AvatarImage` on iOS and keep combined styles wrapped with `flattenStyle` (no `style={[...]}` arrays).
- The web app already shows the desired connection-management behavior in `src/pages/SettingsPage.tsx:1090-1370`, and `src/services/appleHealthService.ts:1-242` / `src/services/stravaService.ts:1-67` show the intended backend/service shape. Mobile currently only has `apps/mobile/services/stravaService.ts` for stream fetching; it does not yet have Apple Health/connection helpers.
- `apps/mobile/app.config.ts:1-80` already includes `scheme`, `expo-web-browser`, `expo-localization`, and HealthKit entitlements, so the Settings refactor itself does not need Expo config work.

# Execution Handoff
| Phase | Owner | Notes |
| --- | --- | --- |
| Map overlay fix | `mobile-app-developer` | Adjust `apps/mobile/components/MapView/index.tsx` so route/tile ordering is deterministic on iOS and the RN fallback does not rely on brittle large zIndex values. |
| Settings route refactor + UI | `mobile-app-developer` | Move the current Settings screen into a nested stack, build the new main screen, and add placeholder subpages. |
| Connected apps integration | `mobile-app-developer` | Add Apple Health/Strava connection status and actions using the existing external Supabase backend. |
| iOS verification / rebuild | `eas-ios` | Run or verify the iOS build after the map fix and confirm the overlay bug is gone. |
| Backend work | none | No CatDoes Cloud or cloud-ops work is part of this plan. |

# Backend / Cloud Plan
- `checkBackendIntegration` reports an **external-only backend** (`Produksjon Supabase`) and **no CatDoes Cloud connection**.
- **No cloud setup/ops, SQL migrations, or type refreshes are required** for this refactor because we are not adding schema objects.
- The connected-apps page should use the existing external Supabase tables/functions only (`profiles`, `apple_health_connections`, `strava_connections`, and the existing Strava edge function).
- If the team wants a seamless mobile return after Strava auth, that is a **provider-side redirect/callback change** in the existing backend/Strava setup, not a CatDoes Cloud task.

# Implementation Steps
1. **Fix the iOS map overlay order in `apps/mobile/components/MapView/index.tsx`.**
   - Keep the current `onDidFinishLoadingStyle` gating and make the Norgeskart/routing layers mount only after the style is ready.
   - In the Mapbox path, ensure the route line is mounted after the Norgeskart raster layer and do not rely on unsafe numeric layer positions.
   - In the RN `MapView` fallback, keep `UrlTile` behind `Polyline` with small/negative ordering values only; remove the current brittle high `zIndex` usage (`zIndex={100}` on the route line) so iOS cannot try to insert a layer at an out-of-range position.
   - Why: the bug is an overlay insertion/order issue on iOS, and the current high-index approach is the least reliable part of the stack.

2. **Convert the Settings tab into a nested Expo Router stack.**
   - Rename/move `apps/mobile/app/(tabs)/settings.tsx` to `apps/mobile/app/(tabs)/settings/index.tsx`.
   - Add `apps/mobile/app/(tabs)/settings/_layout.tsx` with a `Stack`, `initialRouteName: "index"`, and safe-area handling so Settings subpages stay inside the tab bar.
   - Keep the tab registration in `apps/mobile/app/(tabs)/_layout.tsx` pointed at `settings`.
   - Why: Expo Router needs a folder route to host subpages like `/settings/connected-apps` while preserving tab navigation.

3. **Build the new main Settings screen in `apps/mobile/app/(tabs)/settings/index.tsx`.**
   - Add a top profile header with avatar + name using the existing `useAuth()` profile data.
   - Add a `Profilinnstillinger` row, a dark mode switch wired to the existing NativeWind color-scheme toggle, and a language `Select` with `Norsk` / `Engelsk` options.
   - Persist the language choice locally (store `no` / `en` in AsyncStorage) and initialize from the saved value or device locale.
   - Render the menu rows that navigate to `connected-apps`, `appearance`, `preferences`, `privacy`, `training`, `notifications`, and `help-support`.
   - Keep the content scrollable and place the logout action in a bottom footer zone with a confirmation dialog.
   - Refresh profile data on focus so avatar/name updates are reflected immediately.

4. **Implement the real connected-apps page in `apps/mobile/app/(tabs)/settings/connected-apps.tsx`.**
   - Add Apple Health and Strava cards, connection status, and actions.
   - Create `apps/mobile/services/appleHealthService.ts` by porting the web service’s connection/state helpers (get connection, connect/disconnect, toggle settings, source-priority helpers as needed).
   - Extend `apps/mobile/services/stravaService.ts` with the connection-management methods required by the page (`getAuthUrl`, `getStatus`, `disconnect`, and any sync action you decide to expose).
   - Use `useFocusEffect` so returning from an external auth/browser flow refreshes the connection state.
   - Show Apple Health only on iOS (or clearly label it as iPhone-only), and keep Strava as the primary connect/disconnect action.

5. **Add placeholder Settings subpages for the remaining menu items.**
   - Create `apps/mobile/app/(tabs)/settings/profile.tsx`, `appearance.tsx`, `preferences.tsx`, `privacy.tsx`, `training.tsx`, `notifications.tsx`, and `help-support.tsx`.
   - Each screen should use a small shared shell pattern: back button, title, short explanatory text, and a “coming soon” card.
   - Why: the main menu needs working navigation targets immediately, even if most of the pages are placeholders for now.

# Files to Modify/Create
- `apps/mobile/components/MapView/index.tsx`
- `apps/mobile/app/(tabs)/settings.tsx` → replace with folder route (`delete` / move to `index.tsx`)
- `apps/mobile/app/(tabs)/settings/_layout.tsx`
- `apps/mobile/app/(tabs)/settings/index.tsx`
- `apps/mobile/app/(tabs)/settings/profile.tsx`
- `apps/mobile/app/(tabs)/settings/connected-apps.tsx`
- `apps/mobile/app/(tabs)/settings/appearance.tsx`
- `apps/mobile/app/(tabs)/settings/preferences.tsx`
- `apps/mobile/app/(tabs)/settings/privacy.tsx`
- `apps/mobile/app/(tabs)/settings/training.tsx`
- `apps/mobile/app/(tabs)/settings/notifications.tsx`
- `apps/mobile/app/(tabs)/settings/help-support.tsx`
- `apps/mobile/services/appleHealthService.ts`
- `apps/mobile/services/stravaService.ts`
- `apps/mobile/app/(tabs)/_layout.tsx` *(only if the floating ThemeToggle is retired after the Settings refactor)*

# Non-file Operations
- No CatDoes Cloud operations.
- No Supabase migrations or type refreshes.
- No package installs expected; the required Expo packages are already present.
- iOS rebuild / dev-client verification is required for the map fix.
- If a seamless Strava return-to-app flow is requested later, the external backend/Strava callback configuration must be updated outside this repo.

# Verification
- Run `npm run typecheck` in `apps/mobile`.
- Run `npm run lint` in `apps/mobile`.
- Launch the iOS build (`npm run ios` or a dev-client on a physical iPhone) and verify:
  - Norgeskart no longer covers the route line.
  - The iOS console does not show the `position at(100)` / layer insertion error.
  - Opening Settings shows the new profile header, dark-mode toggle, language select, and menu rows.
  - `/settings/connected-apps` keeps the tab bar visible and refreshes connection state when focus returns.
  - Logout signs the user out and the app returns to the login flow.
- Directly open `/settings/appearance`, `/settings/privacy`, etc. to confirm each placeholder route resolves correctly.

# Open Questions / Assumptions
- I assumed the language dropdown is **preference persistence only** for this refactor; a full mobile translation layer is out of scope unless you want it now.
- I assumed `Profilinnstillinger` is a lightweight entry point/placeholder rather than a full profile-edit form.
- I assumed the floating ThemeToggle can stay for now; if you want Settings to be the only theme control, remove it from `apps/mobile/app/(tabs)/_layout.tsx`.
- I assumed the connected-apps page should use the existing external Supabase backend and current Strava auth flow; if you want a seamless in-app return after Strava auth, that requires a provider-side callback change.
- If the map bug still reproduces after deterministic layer ordering, the fallback plan is a native iOS `react-native-maps` patch (outside this repo scope for this pass).