-- ============================================================
-- GATHEX Invoice — FINAL Clean Schema (Ground-Zero Rebuild)
-- Single source of truth. Supersedes all previous schema files.
-- Run this ONE file top to bottom in a FRESH Supabase project's
-- SQL Editor. Do not mix with 01-05 from earlier attempts.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE theme_preference AS ENUM ('light', 'dark', 'system');
CREATE TYPE invoice_theme AS ENUM ('modern', 'classic', 'minimal', 'bold');
CREATE TYPE product_type AS ENUM ('product', 'service');

CREATE TYPE sales_doc_type AS ENUM (
  'invoice', 'quotation', 'proforma_invoice', 'credit_note',
  'debit_note', 'delivery_challan', 'purchase_order'
);

CREATE TYPE sales_doc_status AS ENUM (
  'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted',
  'partially_paid', 'paid', 'overdue', 'void', 'issued', 'applied',
  'dispatched', 'delivered', 'cancelled', 'received'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'paid', 'partially_paid', 'failed',
  'cancelled', 'refunded', 'partially_refunded', 'overdue'
);

CREATE TYPE notification_type AS ENUM ('success', 'info', 'warning', 'error');

CREATE TYPE reminder_status AS ENUM (
  'draft', 'scheduled', 'sending', 'sent', 'delivered', 'failed', 'cancelled', 'completed'
);

CREATE TYPE reminder_type AS ENUM (
  'upcoming', 'due_today', 'first_overdue', 'second_overdue', 'final', 'custom'
);

CREATE TYPE delivery_channel AS ENUM ('email', 'whatsapp', 'sms', 'in_app');

-- ============================================================
-- HELPER: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES (mirrors auth.users 1:1, uuid throughout — no text/uuid
-- mismatch, no casting needed anywhere in RLS or app code)
-- ============================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  photo_url text,
  active_business_id uuid,
  theme_preference theme_preference DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a profile row the moment someone signs up.
-- This is created FIRST, before anything depends on it, so there's
-- no window where the frontend can query a profile that doesn't exist.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BUSINESSES
-- ============================================================

CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  trade_name text,
  invoice_theme invoice_theme DEFAULT 'modern',
  gstin text,
  email text NOT NULL,
  phone text NOT NULL,
  website text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url text,
  bank_details jsonb DEFAULT '{}'::jsonb,
  upi_id text,
  pan text,
  msme_number text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_active_business
  FOREIGN KEY (active_business_id) REFERENCES businesses(id) ON DELETE SET NULL;

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_businesses_owner ON businesses(owner_uid);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL,
  company_name text,
  gstin text,
  email text,
  phone text,
  billing_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  shipping_address jsonb,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_customers_business ON customers(business_id);

-- ============================================================
-- PRODUCTS / SERVICES
-- ============================================================

CREATE TABLE products_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  type product_type NOT NULL DEFAULT 'product',
  name text NOT NULL,
  sku_code text,
  hsn_sac_code text,
  description text,
  price numeric(14,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'Pcs',
  gst_rate numeric(5,2) NOT NULL DEFAULT 0,
  cess_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_products_business ON products_services(business_id);

-- ============================================================
-- SALES DOCUMENTS (unified: invoice, quotation, proforma,
-- credit_note, debit_note, delivery_challan, purchase_order)
-- ============================================================

CREATE TABLE sales_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  doc_type sales_doc_type NOT NULL,
  doc_number text NOT NULL,
  status sales_doc_status NOT NULL DEFAULT 'draft',

  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_details jsonb NOT NULL DEFAULT '{}'::jsonb,

  vendor_name text,
  vendor_gstin text,
  vendor_email text,
  vendor_phone text,
  vendor_address jsonb,

  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  expiry_date date,
  expected_delivery date,

  vehicle_details jsonb,
  delivery_address jsonb,

  linked_invoice_id uuid REFERENCES sales_documents(id) ON DELETE SET NULL,
  reason text,
  refund_amount numeric(14,2) DEFAULT 0,
  adjustment_amount numeric(14,2) DEFAULT 0,
  gst_adjustment numeric(14,2) DEFAULT 0,

  sub_total numeric(14,2) NOT NULL DEFAULT 0,
  total_discount numeric(14,2) NOT NULL DEFAULT 0,
  total_taxable_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_cgst numeric(14,2) NOT NULL DEFAULT 0,
  total_sgst numeric(14,2) NOT NULL DEFAULT 0,
  total_igst numeric(14,2) NOT NULL DEFAULT 0,
  total_cess numeric(14,2) DEFAULT 0,
  round_off numeric(14,2) DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,

  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  amount_due numeric(14,2) NOT NULL DEFAULT 0,
  payment_upi_qr_url text,

  notes text,
  terms_conditions text,
  converted_doc_id uuid REFERENCES sales_documents(id) ON DELETE SET NULL,

  -- Public share token: generated on demand, NOT by default, so a
  -- document isn't publicly reachable until you explicitly share it.
  share_token uuid UNIQUE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (business_id, doc_type, doc_number)
);

CREATE TRIGGER trg_sales_documents_updated_at
  BEFORE UPDATE ON sales_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_sales_docs_business ON sales_documents(business_id);
CREATE INDEX idx_sales_docs_type_status ON sales_documents(business_id, doc_type, status);
CREATE INDEX idx_sales_docs_customer ON sales_documents(customer_id);
CREATE INDEX idx_sales_docs_share_token ON sales_documents(share_token) WHERE share_token IS NOT NULL;

CREATE TABLE document_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products_services(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  hsn_sac_code text,
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  price numeric(14,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'Pcs',
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  gst_rate numeric(5,2) NOT NULL DEFAULT 0,
  cgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  sgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  igst_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX idx_document_items_document ON document_items(document_id);

CREATE TABLE document_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  document_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  document_type sales_doc_type NOT NULL,
  document_number text NOT NULL,
  action text NOT NULL,
  description text,
  user_id uuid NOT NULL REFERENCES profiles(id),
  user_name text NOT NULL DEFAULT 'Partner',
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_activities_document ON document_activities(document_id);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  category text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT current_date,
  gst_paid numeric(14,2) DEFAULT 0,
  gstin_of_supplier text,
  payment_method text NOT NULL DEFAULT 'cash',
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_business ON expenses(business_id);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  method_type text NOT NULL,
  display_name text NOT NULL,
  description text,
  icon text,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  invoice_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_date date NOT NULL DEFAULT current_date,
  payment_method text NOT NULL,
  payment_type text,
  status payment_status NOT NULL DEFAULT 'paid',
  transaction_id text,
  reference_number text,
  notes text,
  recorded_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_payments_business ON payments(business_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  method_type text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  transaction_id text,
  reference_number text,
  bank_name text,
  cheque_details jsonb,
  card_details jsonb,
  wallet_name text,
  offline_details jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES payment_transactions(id) ON DELETE SET NULL,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  action text NOT NULL,
  description text,
  previous_status text,
  new_status text,
  performed_by uuid REFERENCES profiles(id),
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE upi_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  primary_upi_id text NOT NULL,
  account_holder_name text NOT NULL,
  bank_name text,
  merchant_name text NOT NULL,
  merchant_code text,
  default_currency text NOT NULL DEFAULT 'INR',
  qr_display_size int NOT NULL DEFAULT 200,
  enable_upi_payments boolean NOT NULL DEFAULT true,
  default_upi_note_format text,
  secondary_upi_ids text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_upi_configs_updated_at
  BEFORE UPDATE ON upi_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RECEIPTS
-- ============================================================

CREATE TABLE payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  receipt_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'paid',
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  business_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  share_token uuid UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, receipt_number)
);

CREATE TRIGGER trg_payment_receipts_updated_at
  BEFORE UPDATE ON payment_receipts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_payment_receipts_business ON payment_receipts(business_id);
CREATE INDEX idx_payment_receipts_token ON payment_receipts(share_token);

CREATE TABLE receipt_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES payment_receipts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  action text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  performed_by text NOT NULL DEFAULT 'business',
  device text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE receipt_email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES payment_receipts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  status text NOT NULL,
  error_message text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- REMINDERS
-- ============================================================

CREATE TABLE reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  enable_automatic_reminders boolean NOT NULL DEFAULT true,
  reminder_frequency text NOT NULL DEFAULT 'daily',
  working_days_only boolean NOT NULL DEFAULT true,
  business_hours_only boolean NOT NULL DEFAULT true,
  max_attempts int NOT NULL DEFAULT 3,
  default_email_template_id uuid,
  default_sender_name text,
  default_reply_to_email text,
  enabled_reminder_types jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reminder_settings_updated_at
  BEFORE UPDATE ON reminder_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE reminder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL,
  type text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reminder_templates_updated_at
  BEFORE UPDATE ON reminder_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE reminder_settings
  ADD CONSTRAINT fk_reminder_settings_template
  FOREIGN KEY (default_email_template_id) REFERENCES reminder_templates(id) ON DELETE SET NULL;

CREATE TABLE payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  invoice_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id),
  reminder_type reminder_type NOT NULL,
  delivery_channel delivery_channel NOT NULL,
  status reminder_status NOT NULL DEFAULT 'draft',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  outstanding_amount numeric(14,2) NOT NULL DEFAULT 0,
  due_date date,
  last_sent_at timestamptz,
  next_scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payment_reminders_updated_at
  BEFORE UPDATE ON payment_reminders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_payment_reminders_business ON payment_reminders(business_id);

CREATE TABLE reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reminder_id uuid REFERENCES payment_reminders(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES sales_documents(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id),
  action text NOT NULL,
  channel text NOT NULL,
  description text,
  recipient text,
  performed_by text,
  error_message text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scheduled_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  invoice_id uuid NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  reminder_type reminder_type NOT NULL,
  channel delivery_channel NOT NULL,
  scheduled_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  template_id uuid REFERENCES reminder_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reminder_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reminder_id uuid REFERENCES payment_reminders(id) ON DELETE SET NULL,
  channel delivery_channel NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL,
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BUSINESS SETTINGS (1:1 config sub-tables)
-- ============================================================

CREATE TABLE business_settings (
  business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  invoice_reminders boolean NOT NULL DEFAULT true,
  sms_alerts boolean NOT NULL DEFAULT false,
  marketing_emails boolean NOT NULL DEFAULT false,
  auto_save_drafts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE branding_settings (
  business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  logo_url text,
  invoice_logo_url text,
  primary_color text NOT NULL DEFAULT '#4f46e5',
  secondary_color text NOT NULL DEFAULT '#0f172a',
  theme_selection text NOT NULL DEFAULT 'light',
  invoice_theme invoice_theme DEFAULT 'modern',
  invoice_accent_color text NOT NULL DEFAULT '#4f46e5',
  invoice_footer_text text NOT NULL DEFAULT 'Thank you for doing business with us!',
  authorized_signature_url text,
  company_stamp_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_settings (
  business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  bank_name text DEFAULT '',
  account_holder text DEFAULT '',
  account_number text DEFAULT '',
  ifsc text DEFAULT '',
  branch text DEFAULT '',
  upi_id text DEFAULT '',
  upi_qr_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoice_preferences (
  business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  prefix text NOT NULL DEFAULT 'INV',
  suffix text DEFAULT '',
  starting_number int NOT NULL DEFAULT 1,
  auto_increment boolean NOT NULL DEFAULT true,
  financial_year_reset boolean NOT NULL DEFAULT true,
  default_due_days int NOT NULL DEFAULT 15,
  default_gst_rate numeric(5,2) NOT NULL DEFAULT 18,
  default_currency text NOT NULL DEFAULT 'INR',
  decimal_precision int NOT NULL DEFAULT 2,
  round_off boolean NOT NULL DEFAULT true,
  paper_size text NOT NULL DEFAULT 'A4',
  template_selection text NOT NULL DEFAULT 'modern',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tax_settings (
  business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  gst_enabled boolean NOT NULL DEFAULT true,
  cgst_rate numeric(5,2) NOT NULL DEFAULT 9,
  sgst_rate numeric(5,2) NOT NULL DEFAULT 9,
  igst_rate numeric(5,2) NOT NULL DEFAULT 18,
  tax_inclusive_pricing boolean NOT NULL DEFAULT false,
  gstin_validation_status text NOT NULL DEFAULT 'unverified',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE storage_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_uid uuid NOT NULL REFERENCES profiles(id),
  asset_type text NOT NULL CHECK (asset_type IN ('logo', 'signature', 'stamp', 'document')),
  name text NOT NULL,
  url text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  mime_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_assets_business ON storage_assets(business_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_owner ON notifications(owner_uid, is_read);

-- ============================================================
-- RLS HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_business_member(target_business_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = target_business_id AND b.owner_uid = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_edit_business(target_business_id uuid)
RETURNS boolean AS $$
  SELECT is_business_member(target_business_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: ENABLE + POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses_owner" ON businesses FOR ALL USING (owner_uid = auth.uid()) WITH CHECK (owner_uid = auth.uid());

-- Generic pattern for all business-scoped tables:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_rw" ON customers FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE products_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_rw" ON products_services FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE sales_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_docs_rw" ON sales_documents FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_items_rw" ON document_items FOR ALL USING (
  EXISTS (SELECT 1 FROM sales_documents d WHERE d.id = document_id AND can_edit_business(d.business_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM sales_documents d WHERE d.id = document_id AND can_edit_business(d.business_id))
);

ALTER TABLE document_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_activities_rw" ON document_activities FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_rw" ON expenses FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_methods_rw" ON payment_methods FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_rw" ON payments FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_transactions_rw" ON payment_transactions FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE payment_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_attachments_rw" ON payment_attachments FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_audit_logs_r" ON payment_audit_logs FOR SELECT USING (can_edit_business(business_id));

ALTER TABLE upi_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upi_configs_rw" ON upi_configs FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_receipts_rw" ON payment_receipts FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE receipt_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipt_logs_rw" ON receipt_logs FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE receipt_email_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipt_email_history_rw" ON receipt_email_history FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminder_settings_rw" ON reminder_settings FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminder_templates_rw" ON reminder_templates FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_reminders_rw" ON payment_reminders FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminder_logs_rw" ON reminder_logs FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_reminders_rw" ON scheduled_reminders FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE reminder_delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminder_delivery_logs_rw" ON reminder_delivery_logs FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_settings_rw" ON business_settings FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branding_settings_rw" ON branding_settings FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_settings_rw" ON payment_settings FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE invoice_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_preferences_rw" ON invoice_preferences FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_settings_rw" ON tax_settings FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE storage_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "storage_assets_rw" ON storage_assets FOR ALL USING (can_edit_business(business_id)) WITH CHECK (can_edit_business(business_id));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (owner_uid = auth.uid()) WITH CHECK (owner_uid = auth.uid());

-- ============================================================
-- PUBLIC ACCESS: SECURITY DEFINER RPCs, TOKEN-ONLY FROM DAY ONE
-- No raw-id fallbacks. Bank details/PAN never exposed publicly.
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_document(p_token uuid)
RETURNS jsonb AS $$
  SELECT to_jsonb(d.*) - 'owner_uid' FROM sales_documents d WHERE d.share_token = p_token;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_public_document_items(p_token uuid)
RETURNS jsonb AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(i.*)), '[]'::jsonb)
  FROM document_items i
  JOIN sales_documents d ON d.id = i.document_id
  WHERE d.share_token = p_token;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_public_business_details(p_token uuid)
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'id', b.id, 'name', b.name, 'tradeName', b.trade_name, 'gstin', b.gstin,
    'email', b.email, 'phone', b.phone, 'website', b.website, 'address', b.address,
    'logoUrl', b.logo_url, 'upiId', b.upi_id, 'invoiceTheme', b.invoice_theme
  )
  FROM businesses b
  JOIN sales_documents d ON d.business_id = b.id
  WHERE d.share_token = p_token
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_public_receipt(p_token uuid)
RETURNS jsonb AS $$
  SELECT to_jsonb(r.*) - 'user_id' FROM payment_receipts r WHERE r.share_token = p_token;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_public_document(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_public_document_items(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_public_business_details(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_public_receipt(uuid) TO anon;

-- ============================================================
-- END OF FINAL SCHEMA
-- ============================================================
