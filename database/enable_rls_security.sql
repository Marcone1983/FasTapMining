-- 🔐 CRITICAL SECURITY FIX: Enable Row Level Security on ALL tables
-- Execute this SQL in Supabase SQL Editor IMMEDIATELY
--
-- ⚠️ WARNING: This will block all direct client access to tables
-- Only backend with service_role_key will be able to access data
--
-- Date: 2026-01-27
-- Issue: All tables exposed without RLS protection

-- ============================================================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viabtc_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifetime_access_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "migrations_policy" ON public.migrations;
DROP POLICY IF EXISTS "system_config_policy" ON public.system_config;
DROP POLICY IF EXISTS "mining_sessions_policy" ON public.mining_sessions;
DROP POLICY IF EXISTS "transactions_policy" ON public.transactions;
DROP POLICY IF EXISTS "viabtc_earnings_policy" ON public.viabtc_earnings;
DROP POLICY IF EXISTS "platform_fees_policy" ON public.platform_fees;
DROP POLICY IF EXISTS "lifetime_access_payments_policy" ON public.lifetime_access_payments;
DROP POLICY IF EXISTS "marketplace_purchases_policy" ON public.marketplace_purchases;
DROP POLICY IF EXISTS "referrals_policy" ON public.referrals;
DROP POLICY IF EXISTS "users_policy" ON public.users;

-- ============================================================================
-- STEP 3: CREATE RESTRICTIVE POLICIES
-- ============================================================================
-- Since this is a Telegram bot (not a web app with Supabase Auth),
-- we BLOCK all direct client access. Only backend with service_role_key
-- can access data.
--
-- This means:
-- ✅ Backend API (using service_role_key) = FULL ACCESS
-- ❌ Direct client access (using anon_key) = NO ACCESS
-- ============================================================================

-- Block all direct access to migrations (backend only)
CREATE POLICY "migrations_backend_only" ON public.migrations
  FOR ALL
  USING (false); -- Deny all access (service_role bypasses this)

-- Block all direct access to system_config (backend only)
CREATE POLICY "system_config_backend_only" ON public.system_config
  FOR ALL
  USING (false);

-- Block all direct access to mining_sessions (backend only)
CREATE POLICY "mining_sessions_backend_only" ON public.mining_sessions
  FOR ALL
  USING (false);

-- Block all direct access to transactions (backend only)
CREATE POLICY "transactions_backend_only" ON public.transactions
  FOR ALL
  USING (false);

-- Block all direct access to viabtc_earnings (backend only)
CREATE POLICY "viabtc_earnings_backend_only" ON public.viabtc_earnings
  FOR ALL
  USING (false);

-- Block all direct access to platform_fees (backend only)
CREATE POLICY "platform_fees_backend_only" ON public.platform_fees
  FOR ALL
  USING (false);

-- Block all direct access to lifetime_access_payments (backend only)
CREATE POLICY "lifetime_access_payments_backend_only" ON public.lifetime_access_payments
  FOR ALL
  USING (false);

-- Block all direct access to marketplace_purchases (backend only)
CREATE POLICY "marketplace_purchases_backend_only" ON public.marketplace_purchases
  FOR ALL
  USING (false);

-- Block all direct access to referrals (backend only)
CREATE POLICY "referrals_backend_only" ON public.referrals
  FOR ALL
  USING (false);

-- Block all direct access to users (backend only)
CREATE POLICY "users_backend_only" ON public.users
  FOR ALL
  USING (false);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify RLS is enabled:

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should show rls_enabled = true for all tables

-- Verify policies exist:
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- ✅ RESULT AFTER APPLYING THIS SQL:
-- ============================================================================
-- ✅ All tables have RLS enabled
-- ✅ Direct client access (anon_key) is BLOCKED on all tables
-- ✅ Backend API (service_role_key) still has FULL ACCESS
-- ✅ Security linter errors will be RESOLVED
-- ============================================================================
