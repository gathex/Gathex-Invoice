import { supabase } from "../supabase/config";
import { Customer } from "../types";

export function mapCustomerRow(row: any): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    ownerUid: row.owner_uid,
    name: row.name,
    companyName: row.company_name || "",
    gstin: row.gstin || "",
    email: row.email || "",
    phone: row.phone || "",
    billingAddress: row.billing_address || {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India"
    },
    shippingAddress: row.shipping_address,
    isArchived: !!row.is_archived,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
  };
}

export const customerService = {
  subscribeToCustomers(
    ownerUid: string,
    businessId: string,
    onNext: (customers: Customer[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', businessId)
          .order('name', { ascending: true });

        if (error) {
          if (onError) onError(error);
          else console.error("Error fetching customers:", error);
          return;
        }

        const list = (data || []).map(mapCustomerRow);
        onNext(list);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchCustomers();

    const channelName = `customers-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createCustomer(
    ownerUid: string,
    businessId: string,
    customerData: Omit<Customer, "id" | "businessId" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const payload = {
      business_id: businessId,
      owner_uid: ownerUid,
      name: customerData.name,
      company_name: customerData.companyName || null,
      gstin: customerData.gstin || null,
      email: customerData.email || null,
      phone: customerData.phone || null,
      billing_address: customerData.billingAddress || {},
      shipping_address: customerData.shippingAddress || null,
      is_archived: customerData.isArchived ?? false
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      throw error;
    }

    return data.id;
  },

  cleanFirestoreData(obj: any): any {
    return obj;
  },

  async updateCustomer(
    customerId: string,
    customerData: Partial<Omit<Customer, "id" | "businessId" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const payload: any = {};
    if (customerData.name !== undefined) payload.name = customerData.name;
    if (customerData.companyName !== undefined) payload.company_name = customerData.companyName;
    if (customerData.gstin !== undefined) payload.gstin = customerData.gstin;
    if (customerData.email !== undefined) payload.email = customerData.email;
    if (customerData.phone !== undefined) payload.phone = customerData.phone;
    if (customerData.billingAddress !== undefined) payload.billing_address = customerData.billingAddress;
    if (customerData.shippingAddress !== undefined) payload.shipping_address = customerData.shippingAddress;
    if (customerData.isArchived !== undefined) payload.is_archived = customerData.isArchived;

    const { error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', customerId);

    if (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }
  },

  async toggleArchiveCustomer(customerId: string, isCurrentlyArchived: boolean): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ is_archived: !isCurrentlyArchived })
      .eq('id', customerId);

    if (error) {
      console.error("Error toggling archive status:", error);
      throw error;
    }
  }
};
