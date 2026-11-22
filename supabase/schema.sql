-- ============================================================================
-- Khushdil Ayurvedic Clinic (v3.1) — Supabase Postgres + Storage + RLS Schema
-- Run this SQL in the Supabase SQL Editor to provision the full backend.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADMINS (Owner & Staff accounts linked to auth.users)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  two_step_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Helper functions for strict RLS enforcement
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND role = 'owner'
  );
$$;

-- 2. VISITORS (Anonymous browser ID only; never store full IP addresses)
CREATE TABLE IF NOT EXISTS public.visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_source TEXT NOT NULL DEFAULT 'direct',
  first_utm_source TEXT,
  first_utm_medium TEXT,
  first_utm_campaign TEXT,
  first_utm_content TEXT,
  first_fbclid TEXT,
  first_gclid TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  browser TEXT,
  language TEXT,
  approx_city TEXT,
  approx_state TEXT,
  visit_count INTEGER NOT NULL DEFAULT 1
);

-- 3. SESSIONS
CREATE TABLE IF NOT EXISTS public.sessions (
  session_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES public.visitors(visitor_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 1,
  referrer TEXT,
  source_label TEXT NOT NULL DEFAULT 'direct',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  fbclid TEXT,
  gclid TEXT
);

-- 4. EVENTS (First-party telemetry — health concerns are NEVER stored here)
CREATE TABLE IF NOT EXISTS public.events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES public.visitors(visitor_id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  section_id TEXT,
  label TEXT,
  numeric_value NUMERIC,
  path TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name ON public.events(event_name);

-- 5. INQUIRIES (Health details strictly readable by authenticated admins only)
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_phone TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  concern TEXT,
  duration TEXT,
  visit_mode TEXT,
  preferred_time TEXT,
  quiz_dosha TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('form', 'quiz_whatsapp', 'whatsapp_tap', 'call_tap')),
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Booked', 'Visited', 'Closed', 'Not interested')),
  first_source TEXT NOT NULL DEFAULT 'direct',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  fbclid TEXT,
  gclid TEXT,
  visitor_id TEXT,
  follow_up_date DATE,
  notes TEXT DEFAULT '',
  duplicate_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inquiries_phone ON public.inquiries(patient_phone);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

-- 6. INQUIRY HISTORY (Every status change and note is logged)
CREATE TABLE IF NOT EXISTS public.inquiry_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PHOTOS (Fixed slot system with 3 WebP widths + original + consent check)
CREATE TABLE IF NOT EXISTS public.photos (
  slot_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  target_width INTEGER NOT NULL,
  target_height INTEGER NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  url_480 TEXT NOT NULL DEFAULT '',
  url_960 TEXT NOT NULL DEFAULT '',
  url_1920 TEXT NOT NULL DEFAULT '',
  url_original TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  focal_x INTEGER NOT NULL DEFAULT 50 CHECK (focal_x BETWEEN 0 AND 100),
  focal_y INTEGER NOT NULL DEFAULT 50 CHECK (focal_y BETWEEN 0 AND 100),
  has_patient_face BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_standin BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CONTENT ITEMS & VERSION HISTORY
CREATE TABLE IF NOT EXISTS public.content_items (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  edited_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  detail TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. FAQ ITEMS
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AD SPEND (Owner only)
CREATE TABLE IF NOT EXISTS public.ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  amount_inr NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (month_key, channel)
);

-- 12. SETTINGS (Owner only write; public safe subset via view/RPC)
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) ON EVERY TABLE
-- ============================================================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Public INSERT only for telemetry and inquiries
CREATE POLICY "Public insert visitors" ON public.visitors FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Public insert sessions" ON public.sessions FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Public insert events" ON public.events FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Public insert inquiries" ON public.inquiries FOR INSERT TO anon, authenticated WITH CHECK (TRUE);

-- Public READ only for published photos, content, reviews, FAQs
CREATE POLICY "Public read published photos" ON public.photos
  FOR SELECT TO anon, authenticated
  USING (is_published = TRUE AND (has_patient_face = FALSE OR consent_given = TRUE));

CREATE POLICY "Public read content" ON public.content_items FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_published = TRUE);
CREATE POLICY "Public read faqs" ON public.faq_items FOR SELECT TO anon, authenticated USING (is_published = TRUE);

-- Staff + Owner policies (Inquiries + Photos)
CREATE POLICY "Admin read inquiries" ON public.inquiries FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admin update inquiries" ON public.inquiries FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin insert inquiry history" ON public.inquiry_history FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin read inquiry history" ON public.inquiry_history FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admin manage photos" ON public.photos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Owner-only policies (Visitors, Sessions, Events, Ad Spend, Content, Settings, Admins)
CREATE POLICY "Owner read visitors" ON public.visitors FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owner read sessions" ON public.sessions FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owner read events" ON public.events FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "Owner manage ad_spend" ON public.ad_spend FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner manage content" ON public.content_items FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner manage content versions" ON public.content_versions FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner manage reviews" ON public.reviews FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner manage faqs" ON public.faq_items FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner manage settings" ON public.settings FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner manage admins" ON public.admins FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner delete patient data" ON public.inquiries FOR DELETE TO authenticated USING (public.is_owner());

-- ============================================================================
-- STORAGE BUCKET: site-photos (Public read, Admin-only upload/delete)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-photos',
  'site-photos',
  TRUE,
  10485760,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read site-photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'site-photos');

CREATE POLICY "Admin write site-photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-photos' AND public.is_admin());

CREATE POLICY "Admin update site-photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-photos' AND public.is_admin());

CREATE POLICY "Admin delete site-photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-photos' AND public.is_admin());
