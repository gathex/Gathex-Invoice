import { supabase } from "../supabase/config";
import { BusinessDetails, UPIConfig } from "../types";

export interface BusinessSettings {
  emailNotifications: boolean;
  invoiceReminders: boolean;
  smsAlerts: boolean;
  marketingEmails: boolean;
  autoSaveDrafts: boolean;
}

export interface BrandingSettings {
  logoUrl?: string;
  invoiceLogoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  themeSelection: string;
  invoiceTheme?: "modern" | "classic" | "minimal" | "bold" | "corporate";
  invoiceAccentColor: string;
  invoiceFooterText: string;
  authorizedSignatureUrl?: string;
  companyStampUrl?: string;
}

export interface PaymentSettings {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
  upiQrUrl?: string;
}

export interface InvoicePreferences {
  prefix: string;
  suffix: string;
  startingNumber: number;
  autoIncrement: boolean;
  financialYearReset: boolean;
  defaultDueDays: number;
  defaultGstRate: number;
  defaultCurrency: string;
  decimalPrecision: number;
  roundOff: boolean;
  paperSize: "A4" | "A5" | "Letter";
  templateSelection: "classic" | "modern" | "minimal" | "compact";
}

export interface TaxSettings {
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  taxInclusivePricing: boolean;
  gstinValidationStatus: "unverified" | "verified" | "failed";
}

export interface StorageAsset {
  id: string;
  businessId: string;
  assetType: "logo" | "signature" | "stamp" | "document";
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export function mapBusinessRow(row: any): BusinessDetails & { isArchived?: boolean; legalName?: string; businessType?: string; pan?: string; msmeNumber?: string; pincode?: string } {
  return {
    id: row.id,
    ownerUid: row.owner_uid,
    name: row.name,
    tradeName: row.trade_name || "",
    invoiceTheme: row.invoice_theme || "modern",
    gstin: row.gstin || "",
    email: row.email || "",
    phone: row.phone || "",
    website: row.website || "",
    address: row.address || { street: "", city: "", state: "", postalCode: "", country: "India" },
    logoUrl: row.logo_url || "",
    bankDetails: row.bank_details || { accountName: "", accountNumber: "", bankName: "", ifsc: "", branch: "" },
    upiId: row.upi_id || "",
    pan: row.pan || "",
    msmeNumber: row.msme_number || "",
    isArchived: !!row.is_archived,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
  };
}

export const businessService = {
  subscribeToBusinesses(
    ownerUid: string,
    onNext: (businesses: (BusinessDetails & { isArchived?: boolean; legalName?: string; businessType?: string; pan?: string; msmeNumber?: string; pincode?: string })[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_uid', ownerUid)
          .order('name', { ascending: true });

        if (error) {
          if (onError) onError(error);
          else console.error("Error fetching businesses:", error);
          return;
        }

        onNext((data || []).map(mapBusinessRow));
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchBusinesses();

    const channelName = `businesses-${ownerUid}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'businesses', filter: `owner_uid=eq.${ownerUid}` },
        () => fetchBusinesses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createBusiness(
    ownerUid: string,
    bizData: {
      name: string;
      legalName?: string;
      businessType?: string;
      gstin?: string;
      pan?: string;
      msmeNumber?: string;
      email: string;
      phone: string;
      website?: string;
      address: {
        street: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
      };
    }
  ): Promise<string> {
    const payload = {
      owner_uid: ownerUid,
      name: bizData.name,
      trade_name: bizData.legalName || null,
      gstin: bizData.gstin || null,
      email: bizData.email,
      phone: bizData.phone,
      website: bizData.website || null,
      address: bizData.address || {},
      pan: bizData.pan || null,
      msme_number: bizData.msmeNumber || null,
      is_archived: false
    };

    const { data, error } = await supabase
      .from('businesses')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating business:", error, "Message:", error.message, "Details:", error.details, "Hint:", error.hint, "Code:", error.code);
      throw error;
    }

    const businessId = data.id;
    await this.initializeBusinessSettings(businessId);
    return businessId;
  },

  async updateBusiness(
    businessId: string,
    bizData: Partial<any>
  ): Promise<void> {
    const payload: any = {};
    if (bizData.name !== undefined) payload.name = bizData.name;
    if (bizData.tradeName !== undefined || bizData.legalName !== undefined) payload.trade_name = bizData.tradeName || bizData.legalName;
    if (bizData.gstin !== undefined) payload.gstin = bizData.gstin;
    if (bizData.email !== undefined) payload.email = bizData.email;
    if (bizData.phone !== undefined) payload.phone = bizData.phone;
    if (bizData.website !== undefined) payload.website = bizData.website;
    if (bizData.address !== undefined) payload.address = bizData.address;
    if (bizData.logoUrl !== undefined) payload.logo_url = bizData.logoUrl;
    if (bizData.bankDetails !== undefined) payload.bank_details = bizData.bankDetails;
    if (bizData.upiId !== undefined) payload.upi_id = bizData.upiId;
    if (bizData.pan !== undefined) payload.pan = bizData.pan;
    if (bizData.msmeNumber !== undefined) payload.msme_number = bizData.msmeNumber;
    if (bizData.isArchived !== undefined) payload.is_archived = bizData.isArchived;
    if (bizData.invoiceTheme !== undefined) payload.invoice_theme = bizData.invoiceTheme;

    const { error } = await supabase
      .from('businesses')
      .update(payload)
      .eq('id', businessId);

    if (error) {
      console.error("Error updating business:", error);
      throw error;
    }
  },

  async deleteBusiness(businessId: string): Promise<void> {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (error) {
      console.error("Error deleting business:", error);
      throw error;
    }
  },

  async toggleArchiveBusiness(businessId: string, currentStatus: boolean): Promise<void> {
    const { error } = await supabase
      .from('businesses')
      .update({ is_archived: !currentStatus })
      .eq('id', businessId);

    if (error) {
      console.error("Error toggling archive status:", error);
      throw error;
    }
  },

  async initializeBusinessSettings(businessId: string): Promise<void> {
    try {
      await supabase.from('business_settings').upsert({
        business_id: businessId,
        email_notifications: true,
        invoice_reminders: true,
        sms_alerts: false,
        marketing_emails: false,
        auto_save_drafts: true
      });
    } catch (_) {}

    try {
      await supabase.from('branding_settings').upsert({
        business_id: businessId,
        primary_color: "#4f46e5",
        secondary_color: "#0f172a",
        theme_selection: "light",
        invoice_accent_color: "#4f46e5",
        invoice_footer_text: "Thank you for doing business with us!"
      });
    } catch (_) {}

    try {
      await supabase.from('payment_settings').upsert({
        business_id: businessId,
        bank_name: "",
        account_holder: "",
        account_number: "",
        ifsc: "",
        branch: "",
        upi_id: ""
      });
    } catch (_) {}

    try {
      await supabase.from('invoice_preferences').upsert({
        business_id: businessId,
        prefix: "INV",
        suffix: "",
        starting_number: 1,
        auto_increment: true,
        financial_year_reset: true,
        default_due_days: 15,
        default_gst_rate: 18,
        default_currency: "INR",
        decimal_precision: 2,
        round_off: true,
        paper_size: "A4",
        template_selection: "modern"
      });
    } catch (_) {}

    try {
      await supabase.from('tax_settings').upsert({
        business_id: businessId,
        gst_enabled: true,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 18,
        tax_inclusive_pricing: false,
        gstin_validation_status: "unverified"
      });
    } catch (_) {}
  },

  async getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
    const { data } = await supabase.from('business_settings').select('*').eq('business_id', businessId).maybeSingle();
    if (!data) return null;
    return {
      emailNotifications: !!data.email_notifications,
      invoiceReminders: !!data.invoice_reminders,
      smsAlerts: !!data.sms_alerts,
      marketingEmails: !!data.marketing_emails,
      autoSaveDrafts: !!data.auto_save_drafts
    };
  },

  async getBrandingSettings(businessId: string): Promise<BrandingSettings | null> {
    const { data } = await supabase.from('branding_settings').select('*').eq('business_id', businessId).maybeSingle();
    if (!data) return null;
    return {
      logoUrl: data.logo_url || undefined,
      invoiceLogoUrl: data.invoice_logo_url || undefined,
      primaryColor: data.primary_color || "#4f46e5",
      secondaryColor: data.secondary_color || "#0f172a",
      themeSelection: data.theme_selection || "light",
      invoiceTheme: data.invoice_theme || "modern",
      invoiceAccentColor: data.invoice_accent_color || "#4f46e5",
      invoiceFooterText: data.invoice_footer_text || "Thank you for doing business with us!",
      authorizedSignatureUrl: data.authorized_signature_url || undefined,
      companyStampUrl: data.company_stamp_url || undefined
    };
  },

  async getPaymentSettings(businessId: string): Promise<PaymentSettings | null> {
    const { data } = await supabase.from('payment_settings').select('*').eq('business_id', businessId).maybeSingle();
    if (!data) return null;
    return {
      bankName: data.bank_name || "",
      accountHolder: data.account_holder || "",
      accountNumber: data.account_number || "",
      ifsc: data.ifsc || "",
      branch: data.branch || "",
      upiId: data.upi_id || "",
      upiQrUrl: data.upi_qr_url || undefined
    };
  },

  async getInvoicePreferences(businessId: string): Promise<InvoicePreferences | null> {
    const { data } = await supabase.from('invoice_preferences').select('*').eq('business_id', businessId).maybeSingle();
    if (!data) return null;
    return {
      prefix: data.prefix || "INV",
      suffix: data.suffix || "",
      startingNumber: data.starting_number || 1,
      autoIncrement: !!data.auto_increment,
      financialYearReset: !!data.financial_year_reset,
      defaultDueDays: data.default_due_days || 15,
      defaultGstRate: Number(data.default_gst_rate || 18),
      defaultCurrency: data.default_currency || "INR",
      decimalPrecision: data.decimal_precision || 2,
      roundOff: !!data.round_off,
      paperSize: data.paper_size || "A4",
      templateSelection: data.template_selection || "modern"
    };
  },

  async getTaxSettings(businessId: string): Promise<TaxSettings | null> {
    const { data } = await supabase.from('tax_settings').select('*').eq('business_id', businessId).maybeSingle();
    if (!data) return null;
    return {
      gstEnabled: !!data.gst_enabled,
      cgstRate: Number(data.cgst_rate || 9),
      sgstRate: Number(data.sgst_rate || 9),
      igstRate: Number(data.igst_rate || 18),
      taxInclusivePricing: !!data.tax_inclusive_pricing,
      gstinValidationStatus: data.gstin_validation_status || "unverified"
    };
  },

  async updateBusinessSettings(businessId: string, settings: Partial<BusinessSettings>): Promise<void> {
    const payload: any = { business_id: businessId };
    if (settings.emailNotifications !== undefined) payload.email_notifications = settings.emailNotifications;
    if (settings.invoiceReminders !== undefined) payload.invoice_reminders = settings.invoiceReminders;
    if (settings.smsAlerts !== undefined) payload.sms_alerts = settings.smsAlerts;
    if (settings.marketingEmails !== undefined) payload.marketing_emails = settings.marketingEmails;
    if (settings.autoSaveDrafts !== undefined) payload.auto_save_drafts = settings.autoSaveDrafts;
    await supabase.from('business_settings').upsert(payload);
  },

  async updateBrandingSettings(businessId: string, branding: Partial<BrandingSettings>): Promise<void> {
    const payload: any = { business_id: businessId };
    if (branding.logoUrl !== undefined) payload.logo_url = branding.logoUrl;
    if (branding.invoiceLogoUrl !== undefined) payload.invoice_logo_url = branding.invoiceLogoUrl;
    if (branding.primaryColor !== undefined) payload.primary_color = branding.primaryColor;
    if (branding.secondaryColor !== undefined) payload.secondary_color = branding.secondaryColor;
    if (branding.themeSelection !== undefined) payload.theme_selection = branding.themeSelection;
    if (branding.invoiceTheme !== undefined) payload.invoice_theme = branding.invoiceTheme;
    if (branding.invoiceAccentColor !== undefined) payload.invoice_accent_color = branding.invoiceAccentColor;
    if (branding.invoiceFooterText !== undefined) payload.invoice_footer_text = branding.invoiceFooterText;
    if (branding.authorizedSignatureUrl !== undefined) payload.authorized_signature_url = branding.authorizedSignatureUrl;
    if (branding.companyStampUrl !== undefined) payload.company_stamp_url = branding.companyStampUrl;
    await supabase.from('branding_settings').upsert(payload);
  },

  async updatePaymentSettings(businessId: string, payment: Partial<PaymentSettings>): Promise<void> {
    const payload: any = { business_id: businessId };
    if (payment.bankName !== undefined) payload.bank_name = payment.bankName;
    if (payment.accountHolder !== undefined) payload.account_holder = payment.accountHolder;
    if (payment.accountNumber !== undefined) payload.account_number = payment.accountNumber;
    if (payment.ifsc !== undefined) payload.ifsc = payment.ifsc;
    if (payment.branch !== undefined) payload.branch = payment.branch;
    if (payment.upiId !== undefined) payload.upi_id = payment.upiId;
    if (payment.upiQrUrl !== undefined) payload.upi_qr_url = payment.upiQrUrl;
    await supabase.from('payment_settings').upsert(payload);
  },

  async updateInvoicePreferences(businessId: string, preferences: Partial<InvoicePreferences>): Promise<void> {
    const payload: any = { business_id: businessId };
    if (preferences.prefix !== undefined) payload.prefix = preferences.prefix;
    if (preferences.suffix !== undefined) payload.suffix = preferences.suffix;
    if (preferences.startingNumber !== undefined) payload.starting_number = preferences.startingNumber;
    if (preferences.autoIncrement !== undefined) payload.auto_increment = preferences.autoIncrement;
    if (preferences.financialYearReset !== undefined) payload.financial_year_reset = preferences.financialYearReset;
    if (preferences.defaultDueDays !== undefined) payload.default_due_days = preferences.defaultDueDays;
    if (preferences.defaultGstRate !== undefined) payload.default_gst_rate = preferences.defaultGstRate;
    if (preferences.defaultCurrency !== undefined) payload.default_currency = preferences.defaultCurrency;
    if (preferences.decimalPrecision !== undefined) payload.decimal_precision = preferences.decimalPrecision;
    if (preferences.roundOff !== undefined) payload.round_off = preferences.roundOff;
    if (preferences.paperSize !== undefined) payload.paper_size = preferences.paperSize;
    if (preferences.templateSelection !== undefined) payload.template_selection = preferences.templateSelection;
    await supabase.from('invoice_preferences').upsert(payload);
  },

  async updateTaxSettings(businessId: string, tax: Partial<TaxSettings>): Promise<void> {
    const payload: any = { business_id: businessId };
    if (tax.gstEnabled !== undefined) payload.gst_enabled = tax.gstEnabled;
    if (tax.cgstRate !== undefined) payload.cgst_rate = tax.cgstRate;
    if (tax.sgstRate !== undefined) payload.sgst_rate = tax.sgstRate;
    if (tax.igstRate !== undefined) payload.igst_rate = tax.igstRate;
    if (tax.taxInclusivePricing !== undefined) payload.tax_inclusive_pricing = tax.taxInclusivePricing;
    if (tax.gstinValidationStatus !== undefined) payload.gstin_validation_status = tax.gstinValidationStatus;
    await supabase.from('tax_settings').upsert(payload);
  },

  async uploadStorageAsset(
    businessId: string,
    assetType: "logo" | "signature" | "stamp" | "document",
    fileName: string,
    base64Data: string,
    sizeInBytes: number,
    mimeType: string,
    onProgress: (progress: number) => void
  ): Promise<string> {
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      onProgress(i * 10);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const ownerUid = session?.user?.id || businessId;

    const payload = {
      business_id: businessId,
      owner_uid: ownerUid,
      asset_type: assetType,
      name: fileName,
      url: base64Data,
      size: sizeInBytes,
      mime_type: mimeType
    };

    const { data, error } = await supabase
      .from('storage_assets')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error uploading storage asset:", error);
      throw error;
    }

    if (assetType === "logo") {
      await this.updateBrandingSettings(businessId, { logoUrl: base64Data, invoiceLogoUrl: base64Data });
    } else if (assetType === "signature") {
      await this.updateBrandingSettings(businessId, { authorizedSignatureUrl: base64Data });
    } else if (assetType === "stamp") {
      await this.updateBrandingSettings(businessId, { companyStampUrl: base64Data });
    }

    return data.id;
  },

  subscribeToAssets(
    businessId: string,
    onNext: (assets: StorageAsset[]) => void
  ): () => void {
    const fetchAssets = async () => {
      const { data, error } = await supabase
        .from('storage_assets')
        .select('*')
        .eq('business_id', businessId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error("Error fetching assets:", error);
        return;
      }

      onNext((data || []).map(d => ({
        id: d.id,
        businessId: d.business_id,
        assetType: d.asset_type,
        name: d.name,
        url: d.url,
        size: Number(d.size || 0),
        mimeType: d.mime_type,
        uploadedAt: d.uploaded_at ? new Date(d.uploaded_at) : new Date()
      })));
    };

    fetchAssets();

    const channelName = `storage_assets-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_assets', filter: `business_id=eq.${businessId}` }, () => fetchAssets())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async deleteAsset(assetId: string, businessId: string, assetType: "logo" | "signature" | "stamp" | "document"): Promise<void> {
    await supabase.from('storage_assets').delete().eq('id', assetId);

    if (assetType === "logo") {
      await this.updateBrandingSettings(businessId, { logoUrl: "", invoiceLogoUrl: "" });
    } else if (assetType === "signature") {
      await this.updateBrandingSettings(businessId, { authorizedSignatureUrl: "" });
    } else if (assetType === "stamp") {
      await this.updateBrandingSettings(businessId, { companyStampUrl: "" });
    }
  }
};

export const businessServiceUpi = {
  getUpiConfig: async (businessId: string): Promise<UPIConfig | null> => {
    try {
      const { data, error } = await supabase
        .from('upi_configs')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        id: data.id,
        businessId: data.business_id,
        ownerUid: data.owner_uid,
        primaryUpiId: data.primary_upi_id,
        accountHolderName: data.account_holder_name,
        bankName: data.bank_name || undefined,
        merchantName: data.merchant_name,
        merchantCode: data.merchant_code || undefined,
        defaultCurrency: data.default_currency || "INR",
        qrDisplaySize: data.qr_display_size || 200,
        enableUpiPayments: !!data.enable_upi_payments,
        defaultUpiNoteFormat: data.default_upi_note_format || undefined,
        secondaryUpiIds: data.secondary_upi_ids || [],
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
      };
    } catch (error) {
      console.error("Error getting UPI config:", error);
      throw error;
    }
  },

  updateUpiConfig: async (businessId: string, ownerUid: string, config: Partial<UPIConfig>, existingId?: string): Promise<string> => {
    try {
      const payload: any = {
        business_id: businessId,
        owner_uid: ownerUid,
        primary_upi_id: config.primaryUpiId || "",
        account_holder_name: config.accountHolderName || "",
        bank_name: config.bankName || null,
        merchant_name: config.merchantName || "",
        merchant_code: config.merchantCode || null,
        default_currency: config.defaultCurrency || "INR",
        qr_display_size: config.qrDisplaySize || 200,
        enable_upi_payments: config.enableUpiPayments ?? true,
        default_upi_note_format: config.defaultUpiNoteFormat || null,
        secondary_upi_ids: config.secondaryUpiIds || []
      };

      if (existingId) payload.id = existingId;

      const { data, error } = await supabase
        .from('upi_configs')
        .upsert(payload, { onConflict: 'business_id' })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error("Error updating UPI config:", error);
      throw error;
    }
  }
};
