import { supabase } from "../supabase/config";

export interface SubscriptionUsage {
  tier: 'free' | 'starter' | 'growth';
  displayName: string;
  invoicesUsed: number;
  invoiceLimit: number | null;
  businessesUsed: number;
  businessLimit: number;
  periodStart: string;
  features: Record<string, boolean>;
}

export const subscriptionService = {
  async getUsage(businessId: string): Promise<SubscriptionUsage> {
    try {
      const { data, error } = await supabase.rpc('get_subscription_usage', { p_business_id: businessId });
      if (error) {
        console.warn("get_subscription_usage RPC error or not deployed yet:", error);
        return {
          tier: 'free',
          displayName: 'Free Trial Plan',
          invoicesUsed: 0,
          invoiceLimit: 10,
          businessesUsed: 1,
          businessLimit: 1,
          periodStart: new Date().toISOString(),
          features: { gst_reports: true, pdf_export: true }
        };
      }
      return data as SubscriptionUsage;
    } catch (err) {
      console.error("subscriptionService.getUsage error:", err);
      return {
        tier: 'free',
        displayName: 'Free Trial Plan',
        invoicesUsed: 0,
        invoiceLimit: 10,
        businessesUsed: 1,
        businessLimit: 1,
        periodStart: new Date().toISOString(),
        features: { gst_reports: true, pdf_export: true }
      };
    }
  }
};
