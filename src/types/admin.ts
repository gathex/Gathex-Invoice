export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminOverviewStats {
  total_users: number;
  total_businesses: number;
  active_this_month: number;
  total_invoices: number;
  total_revenue: number;
  estimated_mrr: number;
  tier_breakdown: {
    free: number;
    starter: number;
    growth: number;
  };
}

export interface SignupGrowthData {
  month: string;
  count: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  subscription_tier: 'free' | 'starter' | 'growth' | string;
  is_suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
  admin_role: AdminRole | null;
  businesses_count: number;
  invoices_count: number;
  phone: string | null;
}

export interface AdminActionLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
  admin_email?: string;
  target_email?: string;
}
