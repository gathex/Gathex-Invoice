import { supabase } from "../supabase/config";
import { AdminActionLog, AdminOverviewStats, AdminRole, AdminUserListItem, SignupGrowthData } from "../types/admin";

export const adminService = {
  async getOverviewStats(): Promise<AdminOverviewStats> {
    try {
      const { data, error } = await supabase.rpc('admin_get_overview_stats');
      if (error) throw error;
      return data as AdminOverviewStats;
    } catch (err) {
      console.warn("RPC admin_get_overview_stats call failed, falling back to direct table queries:", err);
      return await this.fallbackOverviewStats();
    }
  },

  async getSignupGrowth(months = 6): Promise<SignupGrowthData[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_signup_growth', { p_months: months });
      if (error) throw error;
      return (data || []) as SignupGrowthData[];
    } catch (err) {
      console.warn("RPC admin_get_signup_growth call failed, falling back to client-calculated growth:", err);
      return await this.fallbackSignupGrowth(months);
    }
  },

  async listUsers(search?: string, limit = 50, offset = 0): Promise<AdminUserListItem[]> {
    try {
      const { data, error } = await supabase.rpc('admin_list_users', { 
        p_search: search ?? null, 
        p_limit: limit, 
        p_offset: offset 
      });
      if (error) throw error;
      return (data || []) as AdminUserListItem[];
    } catch (err) {
      console.warn("RPC admin_list_users call failed, falling back to direct table queries:", err);
      return await this.fallbackListUsers(search, limit, offset);
    }
  },

  async setSuspension(userId: string, suspended: boolean, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('admin_set_suspension', { 
      p_user_id: userId, 
      p_suspended: suspended, 
      p_reason: reason ?? null 
    });
    if (error) {
      console.warn("RPC admin_set_suspension failed, attempting direct profile update:", error);
      const { error: directErr } = await supabase
        .from('profiles')
        .update({ 
          is_suspended: suspended, 
          suspended_reason: suspended ? reason : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (directErr) throw directErr;
    }
  },

  async setTier(userId: string, tier: 'free' | 'starter' | 'growth'): Promise<void> {
    const { error } = await supabase.rpc('admin_set_subscription_tier', { 
      p_user_id: userId, 
      p_tier: tier 
    });
    if (error) {
      console.warn("RPC admin_set_subscription_tier failed, attempting direct profile update:", error);
      const { error: directErr } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: tier,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      if (directErr) throw directErr;
    }
  },

  async grantRole(userId: string, role: 'super_admin' | 'admin' | 'support'): Promise<void> {
    const { error } = await supabase.rpc('admin_grant_role', { 
      p_user_id: userId, 
      p_role: role 
    });
    if (error) {
      console.warn("RPC admin_grant_role failed, attempting direct admin_users upsert:", error);
      const { error: directErr } = await supabase
        .from('admin_users')
        .upsert({ id: userId, role: role, updated_at: new Date().toISOString() });
      if (directErr) throw directErr;
    }
  },

  async revokeRole(userId: string): Promise<void> {
    const { error } = await supabase.rpc('admin_revoke_role', { 
      p_user_id: userId 
    });
    if (error) {
      console.warn("RPC admin_revoke_role failed, attempting direct delete:", error);
      const { error: directErr } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', userId);
      if (directErr) throw directErr;
    }
  },

  async getActionLogs(limit = 50): Promise<AdminActionLog[]> {
    try {
      const { data, error } = await supabase
        .from('admin_action_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as AdminActionLog[];
    } catch (err) {
      console.warn("Error fetching action logs:", err);
      return [];
    }
  },

  // Fallback implementations if RPCs have not been executed on DB yet
  async fallbackOverviewStats(): Promise<AdminOverviewStats> {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: businesses } = await supabase.from('businesses').select('*').eq('is_archived', false);
    const { data: invoices } = await supabase.from('sales_documents').select('*').eq('is_archived', false);

    const totalUsers = profiles?.length || 0;
    const totalBusinesses = businesses?.length || 0;
    const totalInvoices = invoices?.length || 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const activeThisMonth = profiles?.filter(p => new Date(p.created_at) >= startOfMonth).length || 0;
    
    const totalRevenue = invoices
      ?.filter(i => i.payment_status === 'paid')
      .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0;

    let freeCount = 0;
    let starterCount = 0;
    let growthCount = 0;

    profiles?.forEach(p => {
      const tier = p.subscription_tier || 'free';
      if (tier === 'starter') starterCount++;
      else if (tier === 'growth') growthCount++;
      else freeCount++;
    });

    const estimatedMrr = (starterCount * 499) + (growthCount * 1499);

    return {
      total_users: totalUsers,
      total_businesses: totalBusinesses,
      active_this_month: activeThisMonth,
      total_invoices: totalInvoices,
      total_revenue: totalRevenue,
      estimated_mrr: estimatedMrr,
      tier_breakdown: {
        free: freeCount,
        starter: starterCount,
        growth: growthCount
      }
    };
  },

  async fallbackSignupGrowth(months = 6): Promise<SignupGrowthData[]> {
    const { data: profiles } = await supabase.from('profiles').select('created_at');
    const monthlyCounts: Record<string, number> = {};

    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyCounts[label] = 0;
    }

    profiles?.forEach(p => {
      if (p.created_at) {
        const d = new Date(p.created_at);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyCounts[label] !== undefined) {
          monthlyCounts[label]++;
        }
      }
    });

    return Object.entries(monthlyCounts).map(([month, count]) => ({ month, count }));
  },

  async fallbackListUsers(search?: string, limit = 50, offset = 0): Promise<AdminUserListItem[]> {
    let query = supabase.from('profiles').select('*');
    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
    }
    const { data: profiles, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;

    const { data: adminUsers } = await supabase.from('admin_users').select('*');
    const adminMap = new Map<string, string>();
    adminUsers?.forEach(a => adminMap.set(a.id, a.role));

    const { data: businesses } = await supabase.from('businesses').select('owner_uid, phone').eq('is_archived', false);
    const bizCountMap = new Map<string, number>();
    const phoneMap = new Map<string, string>();
    businesses?.forEach(b => {
      bizCountMap.set(b.owner_uid, (bizCountMap.get(b.owner_uid) || 0) + 1);
      if (b.phone && !phoneMap.has(b.owner_uid)) phoneMap.set(b.owner_uid, b.phone);
    });

    const { data: invoices } = await supabase.from('sales_documents').select('owner_uid').eq('is_archived', false);
    const invoiceCountMap = new Map<string, number>();
    invoices?.forEach(i => {
      invoiceCountMap.set(i.owner_uid, (invoiceCountMap.get(i.owner_uid) || 0) + 1);
    });

    return (profiles || []).map(p => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      photo_url: p.photo_url,
      subscription_tier: p.subscription_tier || 'free',
      is_suspended: !!p.is_suspended,
      suspended_reason: p.suspended_reason || null,
      created_at: p.created_at,
      admin_role: (adminMap.get(p.id) as AdminRole) || null,
      businesses_count: bizCountMap.get(p.id) || 0,
      invoices_count: invoiceCountMap.get(p.id) || 0,
      phone: phoneMap.get(p.id) || null
    }));
  }
};
