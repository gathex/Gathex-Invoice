import { supabase } from "../supabase/config";
import { ProductService } from "../types";

export const productService = {
  async getProducts(ownerUid: string, businessId: string): Promise<ProductService[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId);

    if (error) {
      console.error("Error fetching products:", error);
      throw error;
    }

    return (data || []).map(d => ({
      id: d.id,
      businessId: d.business_id,
      ownerUid: d.owner_uid,
      type: d.type,
      name: d.name,
      skuCode: d.sku_code || undefined,
      hsnSacCode: d.hsn_sac_code || undefined,
      description: d.description || undefined,
      price: Number(d.price || 0),
      unit: d.unit || "Pcs",
      gstRate: Number(d.gst_rate || 0),
      cessRate: Number(d.cess_rate || 0),
      createdAt: d.created_at ? new Date(d.created_at) : new Date(),
      updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
    }));
  },

  subscribeToProducts(
    ownerUid: string,
    businessId: string,
    onNext: (products: ProductService[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetch = async () => {
      try {
        const products = await this.getProducts(ownerUid, businessId);
        onNext(products);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetch();

    const channelName = `products-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `business_id=eq.${businessId}` }, () => fetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createProduct(ownerUid: string, businessId: string, data: Omit<ProductService, 'id' | 'createdAt' | 'updatedAt' | 'businessId' | 'ownerUid'>): Promise<string> {
    const payload = {
      business_id: businessId,
      owner_uid: ownerUid,
      type: data.type,
      name: data.name,
      sku_code: data.skuCode || null,
      hsn_sac_code: data.hsnSacCode || null,
      description: data.description || null,
      price: Number(data.price || 0),
      unit: data.unit || 'Pcs',
      gst_rate: Number(data.gstRate || 0),
      cess_rate: Number(data.cessRate || 0)
    };

    const { data: res, error } = await supabase
      .from('products')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return res.id;
  },

  async updateProduct(id: string, data: Partial<ProductService>): Promise<void> {
    const payload: any = {};
    if (data.type !== undefined) payload.type = data.type;
    if (data.name !== undefined) payload.name = data.name;
    if (data.skuCode !== undefined) payload.sku_code = data.skuCode;
    if (data.hsnSacCode !== undefined) payload.hsn_sac_code = data.hsnSacCode;
    if (data.description !== undefined) payload.description = data.description;
    if (data.price !== undefined) payload.price = Number(data.price);
    if (data.unit !== undefined) payload.unit = data.unit;
    if (data.gstRate !== undefined) payload.gst_rate = Number(data.gstRate);
    if (data.cessRate !== undefined) payload.cess_rate = Number(data.cessRate);

    const { error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
