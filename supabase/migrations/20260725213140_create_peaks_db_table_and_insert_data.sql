DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  -- 1. Create peaks_db table if missing
  CREATE TABLE IF NOT EXISTS public.peaks_db (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_no text NOT NULL,
    elevation_moh integer NOT NULL,
    area text NOT NULL,
    municipality text,
    county text,
    description_no text,
    image_url text,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    is_published boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    route_start_lat double precision,
    route_start_lng double precision,
    route_geojson jsonb,
    route_distance_m double precision,
    route_duration_s double precision,
    route_status text,
    route_waypoints jsonb
  );

  -- 2. Data API visibility
  REVOKE ALL ON public.peaks_db FROM public, anon;
  GRANT SELECT ON public.peaks_db TO anon, authenticated;
  GRANT INSERT, UPDATE, DELETE ON public.peaks_db TO authenticated;
  GRANT ALL ON public.peaks_db TO service_role;

  -- 3. RLS for peaks_db
  ALTER TABLE public.peaks_db ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'peaks_db' AND policyname = 'Peaks are viewable by everyone') THEN
    CREATE POLICY "Peaks are viewable by everyone" ON public.peaks_db FOR SELECT USING (is_published = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'peaks_db' AND policyname = 'Authenticated users can insert peaks') THEN
    CREATE POLICY "Authenticated users can insert peaks" ON public.peaks_db FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'peaks_db' AND policyname = 'Users can update their own peaks') THEN
    CREATE POLICY "Users can update their own peaks" ON public.peaks_db FOR UPDATE TO authenticated USING (auth.uid() = created_by);
  END IF;

  -- 4. Create User in auth.users (if not exists)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sprek.bruker@treningsappen.no') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, 
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'sprek.bruker@treningsappen.no',
      crypt('Trening2026!', gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Sprek Bruker","username":"sprek_bruker"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- 5. Insert Identity (for login to work)
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (v_user_id, v_user_id, format('{"sub":"%s","email":"%s"}', v_user_id::text, 'sprek.bruker@treningsappen.no')::jsonb, 'email', now(), now(), now(), v_user_id::text);

    -- 6. Insert Profile
    INSERT INTO public.profiles (id, username, created_at, updated_at)
    VALUES (v_user_id, 'sprek_bruker', now(), now())
    ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
  END IF;

  -- 7. Insert Peaks
  INSERT INTO public.peaks_db (name_no, elevation_moh, area, municipality, county, latitude, longitude, description_no)
  VALUES 
    ('Galdhøpiggen', 2469, 'Jotunheimen', 'Lom', 'Innlandet', 61.6365, 8.3124, 'Norges høyeste fjell.'),
    ('Glittertind', 2465, 'Jotunheimen', 'Lom', 'Innlandet', 61.6511, 8.5574, 'Norges nest høyeste fjell.'),
    ('Store Skagastølstind', 2405, 'Jotunheimen', 'Luster', 'Vestland', 61.4633, 7.8717, 'En klassiker i Jotunheimen.');

END $$;