-- ============================================================
-- GATHEX Invoice — Super Admin Portal Database Migration (12_admin_portal.sql)
-- Multi-Admin RLS Policies, RPC Functions, & Audit Logging
-- ============================================================

-- Step 1: Create Admin Role Enum
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'support');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Ensure profiles table has subscription_tier and suspension columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Step 3: Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on admin_users
CREATE OR REPLACE FUNCTION set_admin_users_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION set_admin_users_updated_at();

-- Step 4: Create admin_action_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON public.admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target_user_id ON public.admin_action_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);

-- ============================================================
-- BOOTSTRAP SUPER ADMIN
-- BEFORE RUNNING: Edit the email below to match your actual account email if different!
-- ============================================================
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'kesavkumar077@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.admin_users (id, role)
    VALUES (v_user_id, 'super_admin'::admin_role)
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin'::admin_role;
  END IF;
END $$;

-- ============================================================
-- HELPER FUNCTIONS FOR SECURITY DEFINER ADMIN CHECKS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_admin_role(p_user_id uuid DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  IF p_user_id IS NULL THEN RETURN null; END IF;
  SELECT role::text INTO v_role FROM public.admin_users WHERE id = p_user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES FOR ADMIN ACCESS
-- Enable RLS on admin_users and admin_action_logs
-- ============================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- admin_users policies
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users" ON public.admin_users
  FOR SELECT USING (public.is_admin(auth.uid()));

-- admin_action_logs policies
DROP POLICY IF EXISTS "Admins can view admin_action_logs" ON public.admin_action_logs;
CREATE POLICY "Admins can view admin_action_logs" ON public.admin_action_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Read-only RLS policy for Admins across profiles, businesses, customers, sales_documents
DROP POLICY IF EXISTS "Admins have read access to profiles" ON public.profiles;
CREATE POLICY "Admins have read access to profiles" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have read access to businesses" ON public.businesses;
CREATE POLICY "Admins have read access to businesses" ON public.businesses
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have read access to customers" ON public.customers;
CREATE POLICY "Admins have read access to customers" ON public.customers
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have read access to sales_documents" ON public.sales_documents;
CREATE POLICY "Admins have read access to sales_documents" ON public.sales_documents
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================
-- RPC FUNCTIONS FOR SUPER ADMIN PORTAL
-- ============================================================

-- 1. Overview Stats RPC
CREATE OR REPLACE FUNCTION public.admin_get_overview_stats()
RETURNS jsonb AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_total_users int;
  v_total_businesses int;
  v_active_this_month int;
  v_total_invoices int;
  v_total_revenue numeric;
  v_free_count int;
  v_starter_count int;
  v_growth_count int;
  v_estimated_mrr numeric;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Not authorized: Admin privileges required';
  END IF;

  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_total_businesses FROM public.businesses WHERE is_archived = false;
  
  -- Users created or updated in the current month
  SELECT count(*) INTO v_active_this_month 
  FROM public.profiles 
  WHERE created_at >= date_trunc('month', now());

  SELECT count(*) INTO v_total_invoices 
  FROM public.sales_documents 
  WHERE is_archived = false;

  SELECT COALESCE(sum(total_amount), 0) INTO v_total_revenue 
  FROM public.sales_documents 
  WHERE payment_status = 'paid' AND is_archived = false;

  SELECT count(*) INTO v_free_count FROM public.profiles WHERE COALESCE(subscription_tier, 'free') = 'free';
  SELECT count(*) INTO v_starter_count FROM public.profiles WHERE subscription_tier = 'starter';
  SELECT count(*) INTO v_growth_count FROM public.profiles WHERE subscription_tier = 'growth';

  -- MRR estimation (Starter = ₹499/mo, Growth = ₹1499/mo)
  v_estimated_mrr := (v_starter_count * 499) + (v_growth_count * 1499);

  v_result := jsonb_build_object(
    'total_users', v_total_users,
    'total_businesses', v_total_businesses,
    'active_this_month', v_active_this_month,
    'total_invoices', v_total_invoices,
    'total_revenue', v_total_revenue,
    'estimated_mrr', v_estimated_mrr,
    'tier_breakdown', jsonb_build_object(
      'free', v_free_count,
      'starter', v_starter_count,
      'growth', v_growth_count
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Signup Growth RPC
CREATE OR REPLACE FUNCTION public.admin_get_signup_growth(p_months int DEFAULT 6)
RETURNS jsonb AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Not authorized: Admin privileges required';
  END IF;

  SELECT jsonb_agg(month_data ORDER BY month_date ASC)
  INTO v_result
  FROM (
    SELECT 
      to_char(d.m, 'Mon YYYY') as month,
      d.m as month_date,
      count(p.id) as count
    FROM generate_series(
      date_trunc('month', now()) - ((p_months - 1) || ' month')::interval,
      date_trunc('month', now()),
      '1 month'::interval
    ) d(m)
    LEFT JOIN public.profiles p ON date_trunc('month', p.created_at) = d.m
    GROUP BY d.m
  ) month_data;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. List Users RPC
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_users jsonb;
BEGIN
  IF NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Not authorized: Admin privileges required';
  END IF;

  SELECT jsonb_agg(user_row)
  INTO v_users
  FROM (
    SELECT 
      p.id,
      p.email,
      p.display_name,
      p.photo_url,
      COALESCE(p.subscription_tier, 'free') as subscription_tier,
      COALESCE(p.is_suspended, false) as is_suspended,
      p.suspended_reason,
      p.created_at,
      au.role::text as admin_role,
      (SELECT count(*) FROM public.businesses b WHERE b.owner_uid = p.id AND b.is_archived = false) as businesses_count,
      (SELECT count(*) FROM public.sales_documents s WHERE s.owner_uid = p.id AND s.is_archived = false) as invoices_count,
      (SELECT phone FROM public.businesses b WHERE b.owner_uid = p.id LIMIT 1) as phone
    FROM public.profiles p
    LEFT JOIN public.admin_users au ON au.id = p.id
    WHERE (
      p_search IS NULL 
      OR p_search = '' 
      OR p.email ILIKE '%' || p_search || '%' 
      OR p.display_name ILIKE '%' || p_search || '%'
    )
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) user_row;

  RETURN COALESCE(v_users, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Set Suspension RPC
CREATE OR REPLACE FUNCTION public.admin_set_suspension(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
BEGIN
  v_caller_role := public.get_admin_role(v_caller_id);
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not authorized: Admin privileges required';
  END IF;

  UPDATE public.profiles
  SET 
    is_suspended = p_suspended,
    suspended_reason = CASE WHEN p_suspended THEN p_reason ELSE NULL END,
    updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, details)
  VALUES (
    v_caller_id,
    CASE WHEN p_suspended THEN 'USER_SUSPENDED' ELSE 'USER_UNSUSPENDED' END,
    p_user_id,
    jsonb_build_object('suspended', p_suspended, 'reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Set Subscription Tier RPC
CREATE OR REPLACE FUNCTION public.admin_set_subscription_tier(
  p_user_id uuid,
  p_tier text
)
RETURNS void AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
BEGIN
  v_caller_role := public.get_admin_role(v_caller_id);
  IF v_caller_role IS NULL OR v_caller_role = 'support' THEN
    RAISE EXCEPTION 'Not authorized: Admin or Super Admin privileges required';
  END IF;

  IF p_tier NOT IN ('free', 'starter', 'growth') THEN
    RAISE EXCEPTION 'Invalid tier: Must be free, starter, or growth';
  END IF;

  UPDATE public.profiles
  SET 
    subscription_tier = p_tier,
    updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, details)
  VALUES (
    v_caller_id,
    'TIER_CHANGED',
    p_user_id,
    jsonb_build_object('new_tier', p_tier)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant Role RPC
CREATE OR REPLACE FUNCTION public.admin_grant_role(
  p_user_id uuid,
  p_role text
)
RETURNS void AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
BEGIN
  v_caller_role := public.get_admin_role(v_caller_id);
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Not authorized: Only Super Admins can grant admin roles';
  END IF;

  IF p_role NOT IN ('super_admin', 'admin', 'support') THEN
    RAISE EXCEPTION 'Invalid role: Must be super_admin, admin, or support';
  END IF;

  INSERT INTO public.admin_users (id, role)
  VALUES (p_user_id, p_role::admin_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, details)
  VALUES (
    v_caller_id,
    'ADMIN_ROLE_GRANTED',
    p_user_id,
    jsonb_build_object('granted_role', p_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Revoke Role RPC
CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  p_user_id uuid
)
RETURNS void AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
BEGIN
  v_caller_role := public.get_admin_role(v_caller_id);
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Not authorized: Only Super Admins can revoke admin roles';
  END IF;

  DELETE FROM public.admin_users WHERE id = p_user_id;

  INSERT INTO public.admin_action_logs (admin_id, action, target_user_id, details)
  VALUES (
    v_caller_id,
    'ADMIN_ROLE_REVOKED',
    p_user_id,
    jsonb_build_object('revoked', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
