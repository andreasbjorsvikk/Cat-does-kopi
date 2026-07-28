# Del 1 — Lesende audit av Lovable Cloud (ingen endringer)

Målprosjekt (nytt, tomt Supabase): `vfsnejcybqbiidettofo`. Brukes IKKE i Del 1 — kun notert for Del 2.

Alt under er kun `SELECT`-spørringer mot Cloud-databasen + lesing av kode/config. Ingen freeze, ingen revoke, ingen sletting av webhook, ingen kodeendringer, ingen migrations.

## 1.2 Auth-schema-introspeksjon
- Tell rader i: `auth.users`, `auth.identities`, `auth.sessions`, `auth.refresh_tokens`, `auth.mfa_factors`, `auth.mfa_challenges`, `auth.mfa_amr_claims`, `auth.one_time_tokens`, `auth.flow_state`, `auth.saml_providers`, `auth.saml_relay_states`, `auth.sso_providers`, `auth.sso_domains`, `auth.instances`.
- Hent kolonneliste for `auth.users` og `auth.identities` (for å vite eksakt hvilke felt som må med i dump/restore).
- Sjekk `instance_id`-fordeling i `auth.users` og `auth.identities`, og innhold i `auth.instances`. Avgjør om FK-relasjonen krever spesialbehandling.
- List provider-fordeling i `auth.identities` (forventet kun `email` siden ingen Google/Apple).

## 1.3 Public-schema pre-flight
- For hver tabell i listen (apple_health_connections, challenge_participants, challenges, child_profiles, child_shared_access, community_notifications, daily_health_metrics, friendships, goals, health_events, hiking_record_shares, hiking_records, notification_preferences, peak_checkins, peak_suggestions, peaks_db, primary_goal_periods, profiles, shared_hiking_entries, strava_connections, user_roles, workout_sessions, workout_streams): radantall + største tabellstørrelse.
- List alle FKs mellom `public`-tabeller og til `auth.users` (for restore-rekkefølge og for å bekrefte at ingen tabell peker på auth-objekter vi ikke migrerer).
- List alle triggers i `public` (navn, tabell, funksjon) — kartlegg hvilke som må deaktiveres via `session_replication_role=replica` under restore.
- List alle sequences i `public` + deres nåværende `last_value` (for `setval` etter restore).
- List alle enums, extensions og security-definer-funksjoner i `public`.

## 1.4 Storage-audit
- List buckets (`avatars`, `peak-images`) med public/private-flag, radantall i `storage.objects` per bucket, totalstørrelse per bucket.
- Sjekk om det finnes RLS-policies på `storage.objects` som må gjenskapes.

## 1.5 Edge Functions & webhook-kartlegging
- Les kildekoden til alle edge functions i `supabase/functions/` for å identifisere hvilke som skriver til DB (kandidater for kill-switch i Del 2).
- Bekreft Strava webhook-callback URL og hvilken funksjon den treffer.
- List alle secrets funksjonene bruker (allerede kjent liste, verifiseres mot koden).

## 1.6 Klient-audit (for Del 2-planlegging)
- Bekreft at `src/integrations/supabase/client.ts`, `.env` og `supabase/config.toml` er de eneste stedene project-URL/anon-key ligger hardkodet.
- Sjekk om noen frontend-kall bruker service-role-nøkkel (skal ikke skje).

## Leveranse etter Del 1
En rapport med:
- Radantall-tabell for alle relevante schemas.
- Auth-funn (instance_id-strategi, kolonner som må med i dump).
- Trigger-/sequence-/FK-liste som styrer restore-rekkefølge.
- Storage-oversikt (antall filer, størrelse).
- Konkret oppdatert Del 2-plan basert på faktiske funn — inkludert om kill-switch faktisk trengs eller om `REVOKE` + webhook-sletting er nok.

## Hva som IKKE skjer i Del 1
- Ingen `REVOKE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, `DELETE`.
- Ingen deploy/pause/sletting av edge functions.
- Ingen sletting av Strava webhook.
- Ingen kodeendringer, ingen git-branch, ingen migration.
- Det nye Supabase-prosjektet (`vfsnejcybqbiidettofo`) røres ikke.

Si "godkjent" så kjører jeg 1.2–1.6 og leverer rapporten.
