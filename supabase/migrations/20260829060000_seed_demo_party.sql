-- ============================================================================
-- 20260829060000_seed_demo_party.sql
-- ============================================================================
-- Creates exactly one synthetic party row that represents the demo citizen.
-- user_id is intentionally NULL here; it will be bound to a real auth.uid()
-- at runtime via the public.bind_demo_party() RPC (migration 20260829060030).
--
-- Idempotent: ON CONFLICT (party_ref) DO NOTHING makes re-runs safe.
-- No new tables, columns, enums, or RLS policies are created.
-- ============================================================================

INSERT INTO public.parties (
    party_ref,
    display_name,
    party_type,
    is_synthetic,
    user_id
) VALUES (
    'DEMO-PARTY-001',
    'Demo Citizen',
    'individual'::public.party_type,
    TRUE,
    NULL              -- will be bound dynamically by bind_demo_party() RPC
)
ON CONFLICT (party_ref) DO NOTHING;
