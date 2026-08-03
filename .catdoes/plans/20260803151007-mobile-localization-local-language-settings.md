## 1. Context
The Expo mobile app currently has hardcoded Norwegian copy in many routes and components, while the web app already has a translation catalog in `src/i18n/translations.ts`. The requested change is a user-selectable local language setting in the mobile app, defaulting to `no` and switchable to `en` from Settings, with UI text, dates, and numbers localized while backend data and stored workout/activity enum values remain Norwegian and unchanged.

## 2. Outcome Contract
- Add a local language preference to `apps/mobile` with a default of `no` and a Settings toggle to switch to `en`.
- Mirror the exact keys and English values from root `src/i18n/translations.ts` so mobile copy stays aligned with the Lovable web app.
- Localize all visible mobile UI: tabs, settings, auth screens, calendar, map, training, community, peak/profile sheets, dialogs, errors, and empty states.
- Format dates and numbers with `nb-NO` when language is `no` and `en-US` when language is `en`.
- Keep stored backend enum values and payloads Norwegian; localization must be display-only.
- Preserve compatibility with the shared Supabase backend and the web app.
- No backend schema changes, migrations, RLS, auth config, or Cloud operations are part of this work.
- Done means the language survives app restart, the UI switches end-to-end, fallback works (`en -> no -> key`), and backend compatibility is proven at runtime.

## 3. Target & Bootstrap State
- **Target path:** `apps/mobile`
- **Framework/family:** Expo / React Native / Expo Router
- **Primary target:** yes
- **Readiness:** resolved; no bootstrap or target-context refresh is needed before implementation.
- **Relevant skills available:** `mobile-app-developer`, `eas-android`, `eas-ios`, `google-play-checklist`, `app-store-checklist`, `web-release`, `website-to-app`, `watch-maintenance`
- **Exact parent action needed before delegation:** approve this plan, then hand off the `apps/mobile` implementation to `mobile-app-developer`. No Cloud/bootstrap step is required because this is client-only.

## 4. Key Findings
- Root web catalog `src/i18n/translations.ts` already contains `no` and `en` keys for navigation, settings, months, weekdays, activity types, metrics, and common copy; `src/i18n/useTranslation.ts` already uses the fallback pattern `translations[lang]?.[key] || translations.no[key] || key` and maps locales to `en-US` / `nb-NO`.
- Mobile settings UI in `apps/mobile/app/(tabs)/settings/index.tsx` currently uses local `