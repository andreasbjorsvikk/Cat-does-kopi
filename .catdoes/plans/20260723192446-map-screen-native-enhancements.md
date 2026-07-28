# Map Screen Native Enhancements Plan

## 1. Context
Enhance the native Expo map screen at `apps/mobile/components/MapView/index.native.tsx` to match the provided screenshots: a full-screen satellite-first map with a translucent top tab bar, layer controls, 2D/3D toggle, custom peak markers with mountain symbols and labels, and a long-press add-peak modal. Remove the current `Topptur Kart` banner.

## 2. Target & Platform
- **Primary target:** `apps/mobile`
- **Framework:** Expo / React Native
- **Platform family:** mobile, native implementation file (`index.native.tsx`); web fallback is out of scope unless compile errors require shared type changes.
- **Relevant skills:** `mobile-app-developer` for app implementation; `cloud-ops` only if persistence to a backend is explicitly requested later.
- **Scoping constraint:** Implement in `apps/mobile/components/MapView/index.native.tsx`; avoid changes to root web app unless needed for reference only.

## 3. Key Findings
- `apps/mobile/app/(tabs)/map.tsx` simply re-exports `@/components/MapView`, so the native map route renders `components/MapView/index.native.tsx` directly.
- Current native map file (`apps/mobile/components/MapView/index.native.tsx`):
  - Loads peaks with `fetchPeaks()` and stores them in local state (`lines 20-44`).
  - Uses `react-native-maps` `MapView` + default `Marker` (`lines 69-82`).
  - Shows the banner to remove in `nativeHeaderContainer`/`nativeHeaderCard` (`lines 85-95`, styles at `lines 131-132`).
  - Uses style arrays in multiple places (`lines 56, 99`), which the implementation should avoid in new/changed code by using `flattenStyle`.
  - Has an existing selected-peak bottom sheet (`lines 98-122`) that should remain unless intentionally superseded.
- `apps/mobile/services/peakDbService.ts`:
  - Defines `Peak`, `DbPeak`, `MOCK_PEAKS`, `dbPeakToLegacy()`, and `fetchPeaks()`.
  - No `addPeak`/insert function exists. `fetchPeaks()` reads `peaks_db` via Supabase and falls back to mock data (`lines 132-151`).
  - For this task, plan local UI state for newly added peaks unless the parent/user confirms backend persistence.
- Existing web reference:
  - `src/components/map/MapSubTabs.tsx` defines the desired tab ids: `kart`, `topper`, `feed`, `lederliste`, `ar`, but it is a DOM component and cannot be reused directly in React Native.
  - Use it as a label/state model only.
- Gluestack UI components are available under `apps/mobile/components/ui/*`; modal exports `Modal`, `ModalBackdrop`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalCloseButton`.
- Knowledge/web research:
  - Gluestack `Button` requires nested `ButtonText`; `Input` requires nested `InputField`.
  - `react-native-maps` supports `mapType` values including `standard`, `satellite`, `hybrid`, and `terrain` (terrain support is provider/platform dependent, especially Android/Google Maps).
  - 2-finger tilt is controlled with `pitchEnabled`; rotation with `rotateEnabled`; 3D buildings where supported with `showsBuildings`.
  - Programmatic tilt can use `mapRef.current?.animateToViewingAngle(angle)`.
  - Long press uses `onLongPress={(event) => event.nativeEvent.coordinate}`.
  - Custom marker labels are best rendered by passing a custom React Native view as `Marker` children.
- Provided screenshots indicate:
  - Top tab bar should sit near top over the map, rounded, translucent/light, with active `Kart` as a white pill.
  - Existing `Topptur Kart` banner should be removed.
  - Controls are small rounded square overlays; satellite map is the visual default.

## 4. Execution Handoff
1. **mobile-app-developer** owns all app UI/state changes in `apps/mobile/components/MapView/index.native.tsx`.
2. **cloud-ops** is not needed for the requested UI/local-state implementation. Use only if the scope changes to persist added peaks to `peaks_db`.
3. Do not assign build or implementation work to `planner`.

## 5. Backend / Cloud Plan
- `checkBackendIntegration` was called because the task asked to inspect `peakDbService.ts` for adding peaks and persistence might affect sequencing.
- Result: **No CatDoes Cloud backend configured** in this environment, even though the app has Supabase client/service files.
- Recommended for this task: **No backend/Cloud work required**. Implement long-press add-peak as UI + local state only:
  - Create a temporary `Peak` object with `id` like `local-${Date.now()}`.
  - Use long-press coordinates for `latitude`/`longitude`.
  - Use modal fields for `name` and `heightMoh` (`Moh`).
  - Fill optional display fields with safe local defaults (`area`, `municipality`, `county`, `description`, `imageUrl: null`, `isPublished: true`).
- If the user later requires persistence:
  - First register/connect backend appropriately (Cloud setup only if user opts into CatDoes Cloud; external provider registration if they already use external Supabase).
  - Add a service function in `apps/mobile/services/peakDbService.ts` only after backend ownership is clarified.
  - For CatDoes Cloud, route schema/grants/RLS/type refresh to `cloud-ops`; do not hand-write generated database types.

## 6. Implementation Steps
1. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Update imports.
   - Add `useRef`, possibly `useMemo`.
   - Add React Native imports needed for controls/modal: `Platform` if necessary, `TextInput` only if not using Gluestack, `KeyboardAvoidingView` if modal keyboard behavior is needed.
   - Import `MapType` if available from `react-native-maps`, or define a local union type (`"standard" | "satellite" | "terrain"`).
   - Import `Mountain`, `Map`, `Layers`, `Box`/`Cuboid` or suitable lucide icons from `lucide-react-native`; do not use emoji.
   - Import Gluestack modal/input/button components:
     - `Modal`, `ModalBackdrop`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`
     - `Input`, `InputField`
     - `Button`, `ButtonText`
   - Import `flattenStyle` from `@/utils/flatten-style` if combining style objects.
   **Why:** Supports new controls and avoids web-breaking style arrays even in changed native component.

2. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Add robust local state types/constants near the component top.
   - Define `type TopTab = "kart" | "topper" | "feed" | "lederliste" | "ar"` and tab config with labels `Kart`, `Topper`, `Feed`, `Lederliste`, `AR`.
   - Define `type MapLayer = "standard" | "satellite" | "terrain"` with labels `Standard`, `Satellite`, `Terrain`.
   - State:
     - `activeTab`, default `"kart"`.
     - `mapType`, default `"satellite"`.
     - `is3DEnabled`, default `true`.
     - `pendingPeakCoordinate`, `showAddPeakModal`, `newPeakName`, `newPeakMoh`.
   - Add a `mapRef = useRef<MapView | null>(null)`.
   **Why:** Keeps map settings explicit, typed, and easy to extend.

3. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Configure `MapView` props.
   - Add `ref={mapRef}`.
   - Add `mapType={mapType}` with default satellite.
   - Add `pitchEnabled={is3DEnabled}`, `rotateEnabled={true}`, `showsBuildings={is3DEnabled}`.
   - Add `onLongPress={handleMapLongPress}`.
   - Add `onMapReady` that applies default tilt if `is3DEnabled`, e.g. `mapRef.current?.animateToViewingAngle(45)` in a safe `try/catch` or guarded call.
   - Add an effect watching `is3DEnabled` to animate viewing angle to `45` when enabling 3D and `0` when switching to 2D.
   **Why:** Enables layer selection and two-finger 3D tilt per `react-native-maps` capabilities.

4. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Replace default markers with custom peak marker children.
   - For each `Peak`, render `<Marker coordinate=... onPress=... anchor={{ x: 0.5, y: 0.5 }}>` with custom child view.
   - Child view should contain:
     - Circular/pill marker background (`#10B981` or white/neutral for contrast) with a `Mountain` lucide icon using explicit `color` prop.
     - Peak name text underneath, centered, with small font, semi-bold, white/dark text with shadow or outlined background for satellite readability.
     - Optionally include `heightMoh` under the name if it fits; requirement only asks for names underneath.
   - Keep `title`/`description` optional; custom children may suppress native callouts, so the existing bottom sheet should be opened via `onPress`.
   **Why:** Meets symbol + label requirement and avoids relying on native default pin rendering.

5. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Remove the `Topptur Kart` banner.
   - Delete the `nativeHeaderContainer` JSX block (`Card` with `Compass`, `Heading`, subtitle).
   - Remove now-unused imports (`Card`, `Compass`, possibly `VStack`/`HStack` only if no longer used elsewhere).
   - Remove `nativeHeaderContainer` and `nativeHeaderCard` styles if unused.
   **Why:** Required by task and screenshot 2 explicitly says to remove the top box.

6. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Add top tabs overlay.
   - Add an absolutely positioned top container (`top: 48-60`, `left/right: 16`, `zIndex` above map).
   - Render tabs from config in a horizontal rounded container.
   - Use `TouchableOpacity` or Gluestack `Pressable`; avoid function-style `Pressable` style.
   - Active tab should have a light/white rounded pill; inactive labels muted gray, matching screenshot.
   - If `activeTab !== "kart"`, either:
     - show a lightweight placeholder panel below tabs for `Topper`, `Feed`, `Lederliste`, `AR` saying content is coming/handled elsewhere, or
     - keep map visible while only highlighting the selected tab. Prefer placeholder only if product expects distinct tabs now.
   **Why:** Implements requested top tabs without changing Expo Router bottom tabs.

7. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Add map controls overlay for layers and 2D/3D.
   - Add a left/top control row under tabs:
     - `2D`/`3D` toggle button text reflects current state; pressing toggles `is3DEnabled`.
     - Layer selector button with `Layers`/`Map` icon; pressing cycles `standard -> satellite -> terrain -> standard` or opens a small local menu with all three choices.
   - Prefer explicit menu with three choices if space allows; screenshot shows a layer button, but requirement says selection among all three.
   - Display selected layer label in the menu; satellite is selected by default.
   **Why:** Exposes layer and 3D settings in robust, user-visible controls.

8. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Implement long-press add-peak flow.
   - `handleMapLongPress(event)` stores `event.nativeEvent.coordinate`, clears form fields, closes selected peak bottom sheet if open, and opens modal.
   - Modal fields:
     - `Name` / `Navn` text input.
     - `Moh` numeric input (`keyboardType="numeric"`).
   - Add Cancel and Add buttons with Gluestack `Button` + `ButtonText`.
   - Validate: trimmed name required; Moh parses to a finite non-negative integer/number. Disable Add or show inline error text when invalid.
   - On Add: append a local `Peak` to `peaks` state and close modal.
   **Why:** Meets add modal requirement without unsupported backend persistence.

9. **Target:** `apps/mobile`  
   **File:** `components/MapView/index.native.tsx`  
   **Change:** Styling cleanup and platform safety.
   - Replace changed style arrays with `flattenStyle([ ... ])`; at minimum avoid introducing any new `style={[...]}`.
   - Remove any `lineHeight` if introduced; do not use it.
   - Use explicit icon colors for `lucide-react-native`.
   - Ensure overlays have `zIndex`/`elevation` so they remain tappable above `MapView` on Android.
   **Why:** Complies with mobile implementation guardrails and keeps controls reliable.

## 7. Files to Modify/Create
- Modify: `apps/mobile/components/MapView/index.native.tsx`
- No new files expected.
- No generated files expected.

## 8. Non-file Operations
- None for the UI/local-state scope.
- No package install needed: `react-native-maps`, `lucide-react-native`, and Gluestack UI components are already present in `apps/mobile/package.json`.
- No Cloud approvals or migrations needed unless persistence is added later.

## 9. Verification
- Static checks from `apps/mobile`:
  - `npm run typecheck`
  - `npm run lint`
- Manual native runtime checks on iOS and/or Android Expo dev build/simulator:
  1. Open bottom tab `Kart`; the `Topptur Kart` banner is gone.
  2. Top tabs render as `Kart`, `Topper`, `Feed`, `Lederliste`, `AR`; `Kart` is active by default.
  3. Map starts in satellite mode.
  4. Layer selector can choose Standard, Satellite, Terrain; selected map type updates the map. Note if `terrain` is platform/provider-limited.
  5. 3D is enabled by default: two-finger tilt works; toggling to 2D flattens/disables pitch; toggling back re-enables tilt.
  6. Peak markers show mountain icons with peak names underneath; tapping a marker still opens the selected-peak bottom sheet.
  7. Long-pressing the map opens Add Peak modal; entering Name and Moh and tapping Add creates a new marker at the pressed coordinate.
  8. Modal Cancel closes without adding a marker; invalid/empty inputs cannot create a peak.
- Code audit before handoff:
  - Grep changed file for `style={[` and remove/replace with `flattenStyle`.
  - Grep changed file for `lineHeight` and remove if present.

## 10. Open Questions / Assumptions
- Assumption: adding a peak is **local UI state only** for now. There is no add function in `peakDbService.ts`, and backend integration is not configured in CatDoes for this project.
- Assumption: top tabs only need UI state in this task; full `Topper`, `Feed`, `Lederliste`, and `AR` content is not requested beyond tab implementation.
- `react-native-maps` `terrain` and 3D building/tilt behavior vary by provider/platform. Implementation should degrade gracefully if terrain is unsupported on a device.
- Screenshots show extra controls like zoom/location/dark-mode; these are not part of the requested scope and should not be added unless separately requested.