-- ============================================================
-- GATHEX Invoice — 11_subscription_limits.sql
-- Subscription Plans, Period Tracking, Usage RPC & Hard Triggers
-- ============================================================

-- 1. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY, -- 'free', 'starter', 'growth'
  display_name text NOT NULL,
  monthly_price_inr numeric NOT NULL DEFAULT 0,
  max_invoices_per_month integer, -- NULL = unlimited
  max_businesses integer NOT NULL DEFAULT 1,
  max_customers integer, -- NULL = unlimited
  max_products integer, -- NULL = unlimited
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed subscription plans (matching pricing tier specs)
INSERT INTO public.subscription_plans 
  (id, display_name, monthly_price_inr, max_invoices_per_month, max_businesses, max_customers, max_products, features)
VALUES
  ('free', 'Free Trial Plan', 0, 10, 1, 20, 20, '{"gst_reports": true, "pdf_export": true, "email_reminders": false}'::jsonb),
  ('starter', 'Starter Plan', 499, 100, 2, 500, 500, '{"gst_reports": true, "pdf_export": true, "email_reminders": true}'::jsonb),
  ('growth', 'Growth Plan', 999, NULL, 5, NULL, NULL, '{"gst_reports": true, "pdf_export": true, "email_reminders": true, "multi_business": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_inr = EXCLUDED.monthly_price_inr,
  max_invoices_per_month = EXCLUDED.max_invoices_per_month,
  max_businesses = EXCLUDED.max_businesses,
  max_customers = EXCLUDED.max_customers,
  max_products = EXCLUDED.max_products,
  features = EXCLUDED.features;

-- 2. Add period start and status columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_period_start timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- 3. Function to get subscription usage for a business
CREATE OR REPLACE FUNCTION public.get_subscription_usage(p_business_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
  v_tier text;
  v_period_start timestamptz;
  v_plan record;
  v_invoices_used integer := 0;
  v_businesses_used integer := 0;
  v_start_of_month timestamptz;
BEGIN
  -- Get business owner
  SELECT owner_uid INTO v_owner_id 
  FROM public.businesses 
  WHERE id = p_business_id;

  IF v_owner_id IS NULL THEN
    v_owner_id := auth.uid();
  END IF;

  -- Get profile subscription tier & period start
  SELECT 
    COALESCE(subscription_tier, 'free'),
    COALESCE(subscription_period_start, date_trunc('month', now()))
  INTO v_tier, v_period_start
  FROM public.profiles
  WHERE id = v_owner_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_period_start := date_trunc('month', now());
  END IF;

  -- Get plan limits
  SELECT * INTO v_plan 
  FROM public.subscription_plans 
  WHERE id = v_tier;

  IF v_plan.id IS NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = 'free';
  END IF;

  v_start_of_month := date_trunc('month', now());
  IF v_period_start < v_start_of_month THEN
    v_period_start := v_start_of_month;
  END IF;

  -- Count invoices created in current period for this business
  SELECT COUNT(*)::integer INTO v_invoices_used
  FROM public.sales_documents
  WHERE business_id = p_business_id
    AND doc_type = 'invoice'
    AND status != 'void'
    AND created_at >= v_period_start;

  -- Count total businesses owned by user
  SELECT COUNT(*)::integer INTO v_businesses_used
  FROM public.businesses
  WHERE owner_uid = v_owner_id
    AND is_archived = false;

  RETURN json_build_object(
    'tier', v_plan.id,
    'displayName', v_plan.display_name,
    'invoicesUsed', v_invoices_used,
    'invoiceLimit', v_plan.max_invoices_per_month,
    'businessesUsed', v_businesses_used,
    'businessLimit', v_plan.max_businesses,
    'periodStart', v_period_start,
    'features', v_plan.features
  );
END;
$$;

-- 4. Triggers for Hard Enforcement

-- Trigger 4A: Enforce Invoice Limit on sales_documents
CREATE OR REPLACE FUNCTION public.enforce_invoice_subscription_limit()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_tier text;
  v_period_start timestamptz;
  v_max_invoices integer;
  v_plan_name text;
  v_current_count integer;
  v_start_of_month timestamptz;
BEGIN
  IF NEW.doc_type != 'invoice' THEN
    RETURN NEW;
  END IF;

  SELECT owner_uid INTO v_owner_id 
  FROM public.businesses 
  WHERE id = NEW.business_id;

  IF v_owner_id IS NULL THEN
    v_owner_id := NEW.owner_uid;
  END IF;

  SELECT 
    COALESCE(p.subscription_tier, 'free'),
    COALESCE(p.subscription_period_start, date_trunc('month', now())),
    sp.max_invoices_per_month,
    sp.display_name
  INTO v_tier, v_period_start, v_max_invoices, v_plan_name
  FROM public.profiles p
  LEFT JOIN public.subscription_plans sp ON sp.id = COALESCE(p.subscription_tier, 'free')
  WHERE p.id = v_owner_id;

  IF v_max_invoices IS NULL THEN
    RETURN NEW;
  END IF;

  v_start_of_month := date_trunc('month', now());
  IF v_period_start < v_start_of_month THEN
    v_period_start := v_start_of_month;
  END IF;

  SELECT COUNT(*)::integer INTO v_current_count
  FROM public.sales_documents
  WHERE business_id = NEW.business_id
    AND doc_type = 'invoice'
    AND status != 'void'
    AND created_at >= v_period_start;

  IF v_current_count >= v_max_invoices THEN
    RAISE EXCEPTION 'SUBSCRIPTION_LIMIT_EXCEEDED: You have reached your monthly invoice limit of % for the % plan.', v_max_invoices, v_plan_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_invoice_limit ON public.sales_documents;
CREATE TRIGGER trg_enforce_invoice_limit
  BEFORE INSERT ON public.sales_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_subscription_limit();

-- Trigger 4B: Enforce Business Limit on businesses
CREATE OR REPLACE FUNCTION public.enforce_business_subscription_limit()
RETURNS trigger AS $$
DECLARE
  v_tier text;
  v_max_biz integer;
  v_plan_name text;
  v_current_count integer;
BEGIN
  SELECT 
    COALESCE(p.subscription_tier, 'free'),
    sp.max_businesses,
    sp.display_name
  INTO v_tier, v_max_biz, v_plan_name
  FROM public.profiles p
  LEFT JOIN public.subscription_plans sp ON sp.id = COALESCE(p.subscription_tier, 'free')
  WHERE p.id = NEW.owner_uid;

  IF v_max_biz IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_current_count
    FROM public.businesses
    WHERE owner_uid = NEW.owner_uid
      AND is_archived = false;

    IF v_current_count >= v_max_biz THEN
      RAISE EXCEPTION 'SUBSCRIPTION_LIMIT_EXCEEDED: You have reached your maximum business limit of % for the % plan.', v_max_biz, v_plan_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_business_limit ON public.businesses;
CREATE TRIGGER trg_enforce_business_limit
  BEFORE INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_subscription_limit();
