-- Phase 2: core SIH26016 land-acquisition domain model (schema only, no business logic).
-- Geometry convention: ALL geometry columns are stored in EPSG:4326 (WGS84 lon/lat).
-- Incoming government data in other CRS (e.g. EPSG:32643 / 7755) must be normalized
-- with ST_Transform(geom, 4326) BEFORE insert. Area maths in later phases must project
-- to a metric CRS (e.g. ST_Transform(geom, 32643)) or use geography casts.

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ---------- enums ----------
CREATE TYPE public.project_status AS ENUM ('draft','planned','active','on_hold','completed','cancelled');
CREATE TYPE public.parcel_status AS ENUM ('active','superseded','disputed');
CREATE TYPE public.party_type AS ENUM ('individual','joint','company','trust','government','religious','unknown');
CREATE TYPE public.interest_type AS ENUM ('owner','co_owner','tenant','lessee','mortgagee','occupant','easement','other');
CREATE TYPE public.verification_status AS ENUM ('unverified','pending','verified','disputed');
CREATE TYPE public.acquisition_method AS ENUM ('lara_2013','negotiated_purchase','consent_award','state_highway_act','national_highway_act','other');
CREATE TYPE public.case_status AS ENUM ('open','in_progress','on_hold','closed','withdrawn');
CREATE TYPE public.case_priority AS ENUM ('low','normal','high','critical');
CREATE TYPE public.workflow_stage AS ENUM (
  'identification','preliminary_notification','survey','objection','hearing',
  'declaration','award','compensation','possession','completed'
);

-- ---------- shared updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- ---------- PROJECT ----------
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  authority TEXT,
  state TEXT NOT NULL,
  districts TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'draft',
  is_synthetic BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- ALIGNMENT ----------
CREATE TABLE public.alignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_ref TEXT NOT NULL,
  name TEXT,
  geom extensions.geometry(MultiLineString, 4326),
  start_chainage_m NUMERIC(12,2),
  end_chainage_m NUMERIC(12,2),
  source_crs TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_ref)
);
CREATE INDEX idx_alignments_geom ON public.alignments USING GIST (geom);
CREATE INDEX idx_alignments_project ON public.alignments(project_id);
CREATE TRIGGER trg_alignments_updated_at BEFORE UPDATE ON public.alignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- PARCEL (project-independent land identity) ----------
CREATE TABLE public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_ref TEXT NOT NULL UNIQUE,
  survey_no TEXT,
  gat_no TEXT,
  khasra_no TEXT,
  village TEXT NOT NULL,
  tehsil TEXT,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  total_area_sqm NUMERIC(14,2),
  land_use TEXT,
  geom extensions.geometry(MultiPolygon, 4326),
  source_crs TEXT,
  source_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.parcel_status NOT NULL DEFAULT 'active',
  is_synthetic BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parcels_geom ON public.parcels USING GIST (geom);
CREATE INDEX idx_parcels_admin ON public.parcels(state, district, village);
CREATE TRIGGER trg_parcels_updated_at BEFORE UPDATE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- PROJECT <-> PARCEL (many-to-many over time) ----------
CREATE TABLE public.project_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  affected_area_sqm NUMERIC(14,2),
  inclusion_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, parcel_id)
);
CREATE INDEX idx_project_parcels_parcel ON public.project_parcels(parcel_id);
CREATE TRIGGER trg_project_parcels_updated_at BEFORE UPDATE ON public.project_parcels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- PARTY (synthetic identities only in this phase) ----------
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_ref TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  party_type public.party_type NOT NULL DEFAULT 'individual',
  contact JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  is_synthetic BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_parties_updated_at BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- OWNERSHIP / LAND INTEREST ----------
CREATE TABLE public.land_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
  interest_type public.interest_type NOT NULL DEFAULT 'owner',
  share_numerator INTEGER,
  share_denominator INTEGER CHECK (share_denominator IS NULL OR share_denominator > 0),
  record_ref TEXT,
  verification public.verification_status NOT NULL DEFAULT 'unverified',
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);
CREATE INDEX idx_land_interests_parcel ON public.land_interests(parcel_id);
CREATE INDEX idx_land_interests_party ON public.land_interests(party_id);
CREATE TRIGGER trg_land_interests_updated_at BEFORE UPDATE ON public.land_interests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- ACQUISITION CASE ----------
CREATE TABLE public.acquisition_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE RESTRICT,
  method public.acquisition_method NOT NULL DEFAULT 'lara_2013',
  current_stage public.workflow_stage NOT NULL DEFAULT 'identification',
  status public.case_status NOT NULL DEFAULT 'open',
  priority public.case_priority NOT NULL DEFAULT 'normal',
  responsible_office TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, parcel_id)
);
CREATE INDEX idx_cases_project ON public.acquisition_cases(project_id);
CREATE INDEX idx_cases_parcel ON public.acquisition_cases(parcel_id);
CREATE INDEX idx_cases_stage_status ON public.acquisition_cases(current_stage, status);
CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON public.acquisition_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- WORKFLOW EVENTS (append-only history) ----------
CREATE TABLE public.case_workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.acquisition_cases(id) ON DELETE CASCADE,
  stage public.workflow_stage NOT NULL,
  event_type TEXT NOT NULL,
  action TEXT,
  from_stage public.workflow_stage,
  to_stage public.workflow_stage,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label TEXT,
  remarks TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_case_time ON public.case_workflow_events(case_id, occurred_at DESC);

-- ---------- citizen visibility helpers (security definer) ----------
CREATE OR REPLACE FUNCTION public.citizen_can_see_parcel(_parcel_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.land_interests li
    JOIN public.parties p ON p.id = li.party_id
    WHERE li.parcel_id = _parcel_id AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.citizen_can_see_case(_case_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.acquisition_cases c
    JOIN public.land_interests li ON li.parcel_id = c.parcel_id
    JOIN public.parties p ON p.id = li.party_id
    WHERE c.id = _case_id AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.citizen_can_see_project(_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.acquisition_cases c
    JOIN public.land_interests li ON li.parcel_id = c.parcel_id
    JOIN public.parties p ON p.id = li.party_id
    WHERE c.project_id = _project_id AND p.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.citizen_can_see_parcel(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.citizen_can_see_case(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.citizen_can_see_project(uuid) FROM PUBLIC, anon;

-- ---------- GRANTS ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.alignments, public.parcels,
  public.project_parcels, public.parties, public.land_interests, public.acquisition_cases TO authenticated;
GRANT SELECT, INSERT ON public.case_workflow_events TO authenticated;
GRANT ALL ON public.projects, public.alignments, public.parcels, public.project_parcels,
  public.parties, public.land_interests, public.acquisition_cases, public.case_workflow_events TO service_role;

-- ---------- RLS ----------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_workflow_events ENABLE ROW LEVEL SECURITY;

-- projects
CREATE POLICY "officer_ministry_read_projects" ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'ministry'));
CREATE POLICY "citizen_read_own_projects" ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'citizen') AND public.citizen_can_see_project(id));
CREATE POLICY "officer_write_projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer'));
CREATE POLICY "officer_update_projects" ON public.projects FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'officer')) WITH CHECK (public.has_role(auth.uid(),'officer'));

-- alignments
CREATE POLICY "officer_ministry_read_alignments" ON public.alignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'ministry'));
CREATE POLICY "officer_write_alignments" ON public.alignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer'));
CREATE POLICY "officer_update_alignments" ON public.alignments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'officer')) WITH CHECK (public.has_role(auth.uid(),'officer'));

-- parcels
CREATE POLICY "officer_ministry_read_parcels" ON public.parcels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'ministry'));
CREATE POLICY "citizen_read_own_parcels" ON public.parcels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'citizen') AND public.citizen_can_see_parcel(id));
CREATE POLICY "officer_write_parcels" ON public.parcels FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer'));
CREATE POLICY "officer_update_parcels" ON public.parcels FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'officer')) WITH CHECK (public.has_role(auth.uid(),'officer'));

-- project_parcels
CREATE POLICY "officer_ministry_read_project_parcels" ON public.project_parcels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'ministry'));
CREATE POLICY "citizen_read_own_project_parcels" ON public.project_parcels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'citizen') AND public.citizen_can_see_parcel(parcel_id));
CREATE POLICY "officer_write_project_parcels" ON public.project_parcels FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer'));

-- parties: officers/ministry read; a citizen sees only their own party record
CREATE POLICY "officer_ministry_read_parties" ON public.parties FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'ministry'));
CREATE POLICY "citizen_read_own_party" ON public.parties FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "officer_write_parties" ON public.parties FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer'));
CREATE POLICY "officer_update_parties" ON public.parties FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'officer')) WITH CHECK (public.has_role(auth.uid(),'officer'));

-- land_interests
CREATE POLICY "officer_ministry_read_interests" ON public.land_interests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'ministry'));
CREATE POLICY "citizen_read_own_interests" ON public.land_interests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'citizen') AND EXISTS (
    SELECT 1 FROM public.parties p WHERE p.id = land_interests.party_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "officer_write_interests" ON public.land_interests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer'));
CREATE POLICY "officer_update_interests" ON public.land_interests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'officer')) WITH CHECK (public.has_role(auth.uid(),'officer'));

-- acquisition_cases
CREATE POLICY "officer_ministry_read_cases" ON public.acquisition_cases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'ministry'));
CREATE POLICY "citizen_read_own_cases" ON public.acquisition_cases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'citizen') AND public.citizen_can_see_parcel(parcel_id));
CREATE POLICY "officer_write_cases" ON public.acquisition_cases FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer'));
CREATE POLICY "officer_update_cases" ON public.acquisition_cases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'officer')) WITH CHECK (public.has_role(auth.uid(),'officer'));

-- workflow events: append-only, no update/delete grant to any app role
CREATE POLICY "officer_ministry_read_events" ON public.case_workflow_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'ministry'));
CREATE POLICY "citizen_read_own_events" ON public.case_workflow_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'citizen') AND public.citizen_can_see_case(case_id));
CREATE POLICY "officer_insert_events" ON public.case_workflow_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer') AND actor_user_id = auth.uid());