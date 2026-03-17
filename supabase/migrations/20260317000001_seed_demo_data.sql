-- Seed demo data: admin, 5 members, past ateliers, 10 reservations
-- Uses fixed UUIDs for reproducibility

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fixed UUIDs for demo users
DO $$
DECLARE
  admin_id   UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  member1_id UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
  member2_id UUID := 'bbbbbbbb-0000-0000-0000-000000000002';
  member3_id UUID := 'bbbbbbbb-0000-0000-0000-000000000003';
  member4_id UUID := 'bbbbbbbb-0000-0000-0000-000000000004';
  member5_id UUID := 'bbbbbbbb-0000-0000-0000-000000000005';
BEGIN

  -- ==========================================
  -- STEP 1: Insert auth users
  -- (trigger on_auth_user_created auto-creates profiles)
  -- ==========================================

  -- Admin
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    admin_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@cocooningclub.fr',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '{"first_name":"Admin","last_name":"Club"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now() - interval '90 days', now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Member 1 - Marie Dupont
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    member1_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'marie.dupont@email.com',
    crypt('Membre123!', gen_salt('bf')),
    now(),
    '{"first_name":"Marie","last_name":"Dupont"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now() - interval '60 days', now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Member 2 - Sophie Martin
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    member2_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'sophie.martin@email.com',
    crypt('Membre123!', gen_salt('bf')),
    now(),
    '{"first_name":"Sophie","last_name":"Martin"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now() - interval '55 days', now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Member 3 - Julie Bernard
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    member3_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'julie.bernard@email.com',
    crypt('Membre123!', gen_salt('bf')),
    now(),
    '{"first_name":"Julie","last_name":"Bernard"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now() - interval '45 days', now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Member 4 - Emma Petit
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    member4_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'emma.petit@email.com',
    crypt('Membre123!', gen_salt('bf')),
    now(),
    '{"first_name":"Emma","last_name":"Petit"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now() - interval '40 days', now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Member 5 - Clara Leroy
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    member5_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'clara.leroy@email.com',
    crypt('Membre123!', gen_salt('bf')),
    now(),
    '{"first_name":"Clara","last_name":"Leroy"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now() - interval '35 days', now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- ==========================================
  -- STEP 2: Update profiles with full data
  -- (trigger may have set basic fields; here we complete them)
  -- ==========================================

  INSERT INTO public.profiles (id, email, first_name, last_name, phone, role, status, created_at)
  VALUES
    (admin_id,   'admin@cocooningclub.fr',    'Admin',  'Club',    '01 23 45 67 89', 'admin',  'actif', now() - interval '90 days'),
    (member1_id, 'marie.dupont@email.com',    'Marie',  'Dupont',  '06 12 34 56 78', 'membre', 'actif', now() - interval '60 days'),
    (member2_id, 'sophie.martin@email.com',   'Sophie', 'Martin',  '06 23 45 67 89', 'membre', 'actif', now() - interval '55 days'),
    (member3_id, 'julie.bernard@email.com',   'Julie',  'Bernard', '06 34 56 78 90', 'membre', 'actif', now() - interval '45 days'),
    (member4_id, 'emma.petit@email.com',      'Emma',   'Petit',   '06 45 67 89 01', 'membre', 'actif', now() - interval '40 days'),
    (member5_id, 'clara.leroy@email.com',     'Clara',  'Leroy',   '06 56 78 90 12', 'membre', 'inactif', now() - interval '35 days')
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name,
    phone      = EXCLUDED.phone,
    role       = EXCLUDED.role,
    status     = EXCLUDED.status;

  -- ==========================================
  -- STEP 3: Add past ateliers for demo
  -- ==========================================

  INSERT INTO public.ateliers (title, description, date, time, location, capacity, type, price)
  VALUES
    ('Initiation Broderie',       'Découvrez les points de broderie traditionnels dans une ambiance chaleureuse.',   '2026-01-18', '14h – 17h', 'Gagny',    10, 'textile',   'Gratuit'),
    ('Atelier Encens & Huiles',   'Fabriquez vos propres encens naturels et huiles aromatiques maison.',             '2026-02-08', '10h – 13h', 'Chelles',   8, 'bien-etre', 'Gratuit'),
    ('Yoga Créatif & Mandala',    'Séance de yoga douce suivie d''une initiation au dessin de mandalas.',            '2026-03-01', '09h – 12h', 'Le Raincy', 12,'bien-etre', 'Gratuit')
  ON CONFLICT DO NOTHING;

  -- ==========================================
  -- STEP 4: Insert 10 reservations (varied statuses)
  -- ==========================================

  -- Past reservations
  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member1_id, id, 'presente', now() - interval '50 days' FROM public.ateliers WHERE title = 'Initiation Broderie'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member2_id, id, 'presente', now() - interval '50 days' FROM public.ateliers WHERE title = 'Initiation Broderie'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member3_id, id, 'presente', now() - interval '30 days' FROM public.ateliers WHERE title = 'Atelier Encens & Huiles'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member4_id, id, 'absente',  now() - interval '30 days' FROM public.ateliers WHERE title = 'Atelier Encens & Huiles'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member5_id, id, 'presente', now() - interval '16 days' FROM public.ateliers WHERE title = 'Yoga Créatif & Mandala'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member1_id, id, 'annulee',  now() - interval '20 days' FROM public.ateliers WHERE title = 'Yoga Créatif & Mandala'
  ON CONFLICT DO NOTHING;

  -- Upcoming reservations
  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member2_id, id, 'confirmee', now() - interval '5 days' FROM public.ateliers WHERE title = 'Atelier Bougies Parfumées'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member3_id, id, 'confirmee', now() - interval '4 days' FROM public.ateliers WHERE title = 'Atelier Bougies Parfumées'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member4_id, id, 'confirmee', now() - interval '3 days' FROM public.ateliers WHERE title = 'Aquarelle & Détente'
  ON CONFLICT DO NOTHING;

  INSERT INTO public.reservations (member_id, atelier_id, status, created_at)
  SELECT member5_id, id, 'confirmee', now() - interval '2 days' FROM public.ateliers WHERE title = 'Macramé Mural'
  ON CONFLICT DO NOTHING;

END $$;
