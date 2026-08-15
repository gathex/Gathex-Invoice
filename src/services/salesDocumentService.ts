import { supabase } from "../supabase/config";
import { 
  Quotation, 
  ProformaInvoice, 
  CreditNote, 
  DebitNote, 
  DeliveryChallan, 
  PurchaseOrder, 
  DocumentActivity,
  SalesDocType,
  Invoice,
  InvoiceItem
} from "../types";

function toJSDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  return new Date(val);
}

export function mapDocumentItemRow(item: any): InvoiceItem {
  return {
    id: item.id,
    productId: item.product_id || undefined,
    name: item.name,
    description: item.description || undefined,
    hsnSacCode: item.hsn_sac_code || undefined,
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
    unit: item.unit || "Pcs",
    discountAmount: Number(item.discount_amount || 0),
    gstRate: Number(item.gst_rate || 0),
    cgstAmount: Number(item.cgst_amount || 0),
    sgstAmount: Number(item.sgst_amount || 0),
    igstAmount: Number(item.igst_amount || 0),
    totalAmount: Number(item.total_amount || 0)
  };
}

export function mapActivityRow(row: any): DocumentActivity {
  return {
    id: row.id,
    businessId: row.business_id,
    ownerUid: row.owner_uid,
    documentId: row.document_id,
    documentType: row.document_type,
    documentNumber: row.document_number,
    action: row.action,
    description: row.description || "",
    userId: row.user_id,
    userName: row.user_name || "Partner",
    timestamp: row.timestamp ? new Date(row.timestamp) : new Date()
  };
}

export const salesDocumentService = {
  // Helper to fetch items for a list of document IDs
  async fetchItemsForDocs(docIds: string[]): Promise<Record<string, InvoiceItem[]>> {
    if (!docIds || docIds.length === 0) return {};
    const { data, error } = await supabase
      .from('document_items')
      .select('*')
      .in('document_id', docIds)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error("Error fetching document items:", error);
      return {};
    }

    const itemsMap: Record<string, InvoiceItem[]> = {};
    (data || []).forEach(row => {
      if (!itemsMap[row.document_id]) itemsMap[row.document_id] = [];
      itemsMap[row.document_id].push(mapDocumentItemRow(row));
    });
    return itemsMap;
  },

  // Helper to save items for a document
  async saveDocumentItems(docId: string, items: InvoiceItem[]): Promise<void> {
    await supabase.from('document_items').delete().eq('document_id', docId);
    if (!items || items.length === 0) return;

    const payload = items.map((item, idx) => ({
      document_id: docId,
      product_id: item.productId || null,
      name: item.name,
      description: item.description || null,
      hsn_sac_code: item.hsnSacCode || null,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit || "Pcs",
      discount_amount: item.discountAmount || 0,
      gst_rate: item.gstRate || 0,
      cgst_amount: item.cgstAmount || 0,
      sgst_amount: item.sgstAmount || 0,
      igst_amount: item.igstAmount || 0,
      total_amount: item.totalAmount || 0,
      sort_order: idx
    }));

    const { error } = await supabase.from('document_items').insert(payload);
    if (error) console.error("Error inserting document items:", error);
  },

  // ==========================================
  // 1. Quotations Service
  // ==========================================
  subscribeToQuotations(
    ownerUid: string,
    businessId: string,
    onNext: (items: Quotation[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchQuotations = async () => {
      try {
        const { data, error } = await supabase
          .from('sales_documents')
          .select('*')
          .eq('business_id', businessId)
          .eq('doc_type', 'quotation')
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          return;
        }

        const docIds = (data || []).map(d => d.id);
        const itemsMap = await this.fetchItemsForDocs(docIds);

        const list: Quotation[] = (data || []).map(d => ({
          id: d.id,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          quotationNumber: d.doc_number,
          status: d.status,
          customerId: d.customer_id,
          customerDetails: d.customer_details || {},
          issueDate: toJSDate(d.issue_date),
          expiryDate: toJSDate(d.expiry_date),
          items: itemsMap[d.id] || [],
          subTotal: Number(d.sub_total || 0),
          totalDiscount: Number(d.total_discount || 0),
          totalTaxableAmount: Number(d.total_taxable_amount || 0),
          totalCgst: Number(d.total_cgst || 0),
          totalSgst: Number(d.total_sgst || 0),
          totalIgst: Number(d.total_igst || 0),
          totalCess: Number(d.total_cess || 0),
          grandTotal: Number(d.grand_total || 0),
          notes: d.notes || undefined,
          termsConditions: d.terms_conditions || undefined,
          createdAt: toJSDate(d.created_at),
          updatedAt: toJSDate(d.updated_at)
        } as Quotation));

        onNext(list);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchQuotations();

    const channelName = `quotations-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${businessId}` }, () => fetchQuotations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createQuotation(ownerUid: string, data: Omit<Quotation, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const payload = {
      business_id: data.businessId,
      owner_uid: ownerUid,
      doc_type: 'quotation',
      doc_number: data.quotationNumber,
      status: data.status || 'draft',
      customer_id: data.customerId || null,
      customer_details: data.customerDetails || {},
      issue_date: new Date(data.issueDate).toISOString().split('T')[0],
      expiry_date: new Date(data.expiryDate).toISOString().split('T')[0],
      sub_total: data.subTotal || 0,
      total_discount: data.totalDiscount || 0,
      total_taxable_amount: data.totalTaxableAmount || 0,
      total_cgst: data.totalCgst || 0,
      total_sgst: data.totalSgst || 0,
      total_igst: data.totalIgst || 0,
      total_cess: data.totalCess || 0,
      grand_total: data.grandTotal || 0,
      notes: data.notes || null,
      terms_conditions: data.termsConditions || null
    };

    const { data: inserted, error } = await supabase
      .from('sales_documents')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating quotation:", error);
      throw error;
    }

    if (data.items && data.items.length > 0) {
      await this.saveDocumentItems(inserted.id, data.items);
    }

    await this.logActivity(ownerUid, data.businessId, {
      documentId: inserted.id,
      documentType: "quotation",
      documentNumber: data.quotationNumber,
      action: "created",
      description: `Quotation ${data.quotationNumber} of Grand Total ₹${data.grandTotal} raised for customer ${data.customerDetails.name}.`,
      userName: "Partner"
    });

    return inserted.id;
  },

  async updateQuotation(ownerUid: string, id: string, data: Partial<Quotation>): Promise<void> {
    const payload: any = {};
    if (data.quotationNumber !== undefined) payload.doc_number = data.quotationNumber;
    if (data.status !== undefined) payload.status = data.status;
    if (data.customerId !== undefined) payload.customer_id = data.customerId;
    if (data.customerDetails !== undefined) payload.customer_details = data.customerDetails;
    if (data.issueDate !== undefined) payload.issue_date = new Date(data.issueDate).toISOString().split('T')[0];
    if (data.expiryDate !== undefined) payload.expiry_date = new Date(data.expiryDate).toISOString().split('T')[0];
    if (data.subTotal !== undefined) payload.sub_total = data.subTotal;
    if (data.totalDiscount !== undefined) payload.total_discount = data.totalDiscount;
    if (data.totalTaxableAmount !== undefined) payload.total_taxable_amount = data.totalTaxableAmount;
    if (data.totalCgst !== undefined) payload.total_cgst = data.totalCgst;
    if (data.totalSgst !== undefined) payload.total_sgst = data.totalSgst;
    if (data.totalIgst !== undefined) payload.total_igst = data.totalIgst;
    if (data.totalCess !== undefined) payload.total_cess = data.totalCess;
    if (data.grandTotal !== undefined) payload.grand_total = data.grandTotal;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.termsConditions !== undefined) payload.terms_conditions = data.termsConditions;

    const { error } = await supabase
      .from('sales_documents')
      .update(payload)
      .eq('id', id);

    if (error) throw error;

    if (data.items) {
      await this.saveDocumentItems(id, data.items);
    }

    if (data.businessId && data.quotationNumber) {
      await this.logActivity(ownerUid, data.businessId, {
        documentId: id,
        documentType: "quotation",
        documentNumber: data.quotationNumber,
        action: "updated",
        description: `Quotation ${data.quotationNumber} updated. Status is now ${data.status || 'Draft'}.`,
        userName: "Partner"
      });
    }
  },

  async deleteQuotation(ownerUid: string, businessId: string, id: string, number: string): Promise<void> {
    await supabase.from('sales_documents').delete().eq('id', id);
    await this.logActivity(ownerUid, businessId, {
      documentId: id,
      documentType: "quotation",
      documentNumber: number,
      action: "deleted",
      description: `Quotation ${number} was deleted.`,
      userName: "Partner"
    });
  },

  // ==========================================
  // 2. Proforma Invoice Service
  // ==========================================
  subscribeToProformas(
    ownerUid: string,
    businessId: string,
    onNext: (items: ProformaInvoice[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchProformas = async () => {
      try {
        const { data, error } = await supabase
          .from('sales_documents')
          .select('*')
          .eq('business_id', businessId)
          .eq('doc_type', 'proforma_invoice')
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          return;
        }

        const docIds = (data || []).map(d => d.id);
        const itemsMap = await this.fetchItemsForDocs(docIds);

        const list: ProformaInvoice[] = (data || []).map(d => ({
          id: d.id,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          proformaNumber: d.doc_number,
          status: d.status,
          customerId: d.customer_id,
          customerDetails: d.customer_details || {},
          issueDate: toJSDate(d.issue_date),
          dueDate: toJSDate(d.due_date),
          items: itemsMap[d.id] || [],
          subTotal: Number(d.sub_total || 0),
          totalDiscount: Number(d.total_discount || 0),
          totalTaxableAmount: Number(d.total_taxable_amount || 0),
          totalCgst: Number(d.total_cgst || 0),
          totalSgst: Number(d.total_sgst || 0),
          totalIgst: Number(d.total_igst || 0),
          totalCess: Number(d.total_cess || 0),
          grandTotal: Number(d.grand_total || 0),
          notes: d.notes || undefined,
          termsConditions: d.terms_conditions || undefined,
          createdAt: toJSDate(d.created_at),
          updatedAt: toJSDate(d.updated_at)
        } as ProformaInvoice));

        onNext(list);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchProformas();

    const channelName = `proformas-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${businessId}` }, () => fetchProformas())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createProforma(ownerUid: string, data: Omit<ProformaInvoice, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const payload = {
      business_id: data.businessId,
      owner_uid: ownerUid,
      doc_type: 'proforma_invoice',
      doc_number: data.proformaNumber,
      status: data.status || 'draft',
      customer_id: data.customerId || null,
      customer_details: data.customerDetails || {},
      issue_date: new Date(data.issueDate).toISOString().split('T')[0],
      due_date: new Date(data.dueDate).toISOString().split('T')[0],
      sub_total: data.subTotal || 0,
      total_discount: data.totalDiscount || 0,
      total_taxable_amount: data.totalTaxableAmount || 0,
      total_cgst: data.totalCgst || 0,
      total_sgst: data.totalSgst || 0,
      total_igst: data.totalIgst || 0,
      total_cess: data.totalCess || 0,
      grand_total: data.grandTotal || 0,
      notes: data.notes || null,
      terms_conditions: data.termsConditions || null
    };

    const { data: inserted, error } = await supabase
      .from('sales_documents')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating proforma invoice:", error);
      throw error;
    }

    if (data.items && data.items.length > 0) {
      await this.saveDocumentItems(inserted.id, data.items);
    }

    await this.logActivity(ownerUid, data.businessId, {
      documentId: inserted.id,
      documentType: "proforma_invoice",
      documentNumber: data.proformaNumber,
      action: "created",
      description: `Proforma Invoice ${data.proformaNumber} of ₹${data.grandTotal} raised for customer ${data.customerDetails.name}.`,
      userName: "Partner"
    });

    return inserted.id;
  },

  async updateProforma(ownerUid: string, id: string, data: Partial<ProformaInvoice>): Promise<void> {
    const payload: any = {};
    if (data.proformaNumber !== undefined) payload.doc_number = data.proformaNumber;
    if (data.status !== undefined) payload.status = data.status;
    if (data.customerId !== undefined) payload.customer_id = data.customerId;
    if (data.customerDetails !== undefined) payload.customer_details = data.customerDetails;
    if (data.issueDate !== undefined) payload.issue_date = new Date(data.issueDate).toISOString().split('T')[0];
    if (data.dueDate !== undefined) payload.due_date = new Date(data.dueDate).toISOString().split('T')[0];
    if (data.subTotal !== undefined) payload.sub_total = data.subTotal;
    if (data.totalDiscount !== undefined) payload.total_discount = data.totalDiscount;
    if (data.totalTaxableAmount !== undefined) payload.total_taxable_amount = data.totalTaxableAmount;
    if (data.totalCgst !== undefined) payload.total_cgst = data.totalCgst;
    if (data.totalSgst !== undefined) payload.total_sgst = data.totalSgst;
    if (data.totalIgst !== undefined) payload.total_igst = data.totalIgst;
    if (data.totalCess !== undefined) payload.total_cess = data.totalCess;
    if (data.grandTotal !== undefined) payload.grand_total = data.grandTotal;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.termsConditions !== undefined) payload.terms_conditions = data.termsConditions;

    const { error } = await supabase.from('sales_documents').update(payload).eq('id', id);
    if (error) throw error;

    if (data.items) {
      await this.saveDocumentItems(id, data.items);
    }

    if (data.businessId && data.proformaNumber) {
      await this.logActivity(ownerUid, data.businessId, {
        documentId: id,
        documentType: "proforma_invoice",
        documentNumber: data.proformaNumber,
        action: "updated",
        description: `Proforma Invoice ${data.proformaNumber} updated. Status is now ${data.status || 'Draft'}.`,
        userName: "Partner"
      });
    }
  },

  async deleteProforma(ownerUid: string, businessId: string, id: string, number: string): Promise<void> {
    await supabase.from('sales_documents').delete().eq('id', id);
    await this.logActivity(ownerUid, businessId, {
      documentId: id,
      documentType: "proforma_invoice",
      documentNumber: number,
      action: "deleted",
      description: `Proforma Invoice ${number} was deleted.`,
      userName: "Partner"
    });
  },

  // ==========================================
  // 3. Credit Notes Service
  // ==========================================
  subscribeToCreditNotes(
    ownerUid: string,
    businessId: string,
    onNext: (items: CreditNote[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchCreditNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('sales_documents')
          .select('*')
          .eq('business_id', businessId)
          .eq('doc_type', 'credit_note')
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          return;
        }

        const docIds = (data || []).map(d => d.id);
        const itemsMap = await this.fetchItemsForDocs(docIds);

        const list: CreditNote[] = (data || []).map(d => ({
          id: d.id,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          creditNoteNumber: d.doc_number,
          status: d.status,
          invoiceId: d.linked_invoice_id,
          invoiceNumber: d.doc_number, // or mapped from linked invoice
          customerId: d.customer_id,
          customerDetails: d.customer_details || {},
          issueDate: toJSDate(d.issue_date),
          reason: d.reason || "",
          items: itemsMap[d.id] || [],
          subTotal: Number(d.sub_total || 0),
          refundAmount: Number(d.refund_amount || 0),
          adjustmentAmount: Number(d.adjustment_amount || 0),
          totalTaxableAmount: Number(d.total_taxable_amount || 0),
          gstAdjustment: Number(d.gst_adjustment || 0),
          grandTotal: Number(d.grand_total || 0),
          notes: d.notes || undefined,
          createdAt: toJSDate(d.created_at),
          updatedAt: toJSDate(d.updated_at)
        } as CreditNote));

        onNext(list);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchCreditNotes();

    const channelName = `credit_notes-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${businessId}` }, () => fetchCreditNotes())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createCreditNote(ownerUid: string, data: Omit<CreditNote, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const payload = {
      business_id: data.businessId,
      owner_uid: ownerUid,
      doc_type: 'credit_note',
      doc_number: data.creditNoteNumber,
      status: data.status || 'draft',
      customer_id: data.customerId || null,
      customer_details: data.customerDetails || {},
      linked_invoice_id: data.invoiceId || null,
      issue_date: new Date(data.issueDate).toISOString().split('T')[0],
      reason: data.reason || null,
      sub_total: data.subTotal || 0,
      refund_amount: data.refundAmount || 0,
      adjustment_amount: data.adjustmentAmount || 0,
      total_taxable_amount: data.totalTaxableAmount || 0,
      gst_adjustment: data.gstAdjustment || 0,
      grand_total: data.grandTotal || 0,
      notes: data.notes || null
    };

    const { data: inserted, error } = await supabase
      .from('sales_documents')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating credit note:", error);
      throw error;
    }

    if (data.items && data.items.length > 0) {
      await this.saveDocumentItems(inserted.id, data.items);
    }

    await this.logActivity(ownerUid, data.businessId, {
      documentId: inserted.id,
      documentType: "credit_note",
      documentNumber: data.creditNoteNumber,
      action: "created",
      description: `Credit Note ${data.creditNoteNumber} of ₹${data.grandTotal} issued against Invoice ${data.invoiceNumber} (Reason: ${data.reason}).`,
      userName: "Partner"
    });

    return inserted.id;
  },

  async updateCreditNote(ownerUid: string, id: string, data: Partial<CreditNote>): Promise<void> {
    const payload: any = {};
    if (data.creditNoteNumber !== undefined) payload.doc_number = data.creditNoteNumber;
    if (data.status !== undefined) payload.status = data.status;
    if (data.customerId !== undefined) payload.customer_id = data.customerId;
    if (data.customerDetails !== undefined) payload.customer_details = data.customerDetails;
    if (data.issueDate !== undefined) payload.issue_date = new Date(data.issueDate).toISOString().split('T')[0];
    if (data.reason !== undefined) payload.reason = data.reason;
    if (data.grandTotal !== undefined) payload.grand_total = data.grandTotal;

    const { error } = await supabase.from('sales_documents').update(payload).eq('id', id);
    if (error) throw error;

    if (data.items) {
      await this.saveDocumentItems(id, data.items);
    }

    if (data.businessId && data.creditNoteNumber) {
      await this.logActivity(ownerUid, data.businessId, {
        documentId: id,
        documentType: "credit_note",
        documentNumber: data.creditNoteNumber,
        action: "updated",
        description: `Credit Note ${data.creditNoteNumber} updated. Status: ${data.status}.`,
        userName: "Partner"
      });
    }
  },

  async deleteCreditNote(ownerUid: string, businessId: string, id: string, number: string): Promise<void> {
    await supabase.from('sales_documents').delete().eq('id', id);
    await this.logActivity(ownerUid, businessId, {
      documentId: id,
      documentType: "credit_note",
      documentNumber: number,
      action: "deleted",
      description: `Credit Note ${number} was deleted.`,
      userName: "Partner"
    });
  },

  // ==========================================
  // 4. Debit Notes Service
  // ==========================================
  subscribeToDebitNotes(
    ownerUid: string,
    businessId: string,
    onNext: (items: DebitNote[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchDebitNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('sales_documents')
          .select('*')
          .eq('business_id', businessId)
          .eq('doc_type', 'debit_note')
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          return;
        }

        const docIds = (data || []).map(d => d.id);
        const itemsMap = await this.fetchItemsForDocs(docIds);

        const list: DebitNote[] = (data || []).map(d => ({
          id: d.id,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          debitNoteNumber: d.doc_number,
          status: d.status,
          invoiceId: d.linked_invoice_id,
          invoiceNumber: d.doc_number,
          customerId: d.customer_id,
          customerDetails: d.customer_details || {},
          issueDate: toJSDate(d.issue_date),
          reason: d.reason || "",
          items: itemsMap[d.id] || [],
          subTotal: Number(d.sub_total || 0),
          adjustmentAmount: Number(d.adjustment_amount || 0),
          totalTaxableAmount: Number(d.total_taxable_amount || 0),
          gstAdjustment: Number(d.gst_adjustment || 0),
          grandTotal: Number(d.grand_total || 0),
          notes: d.notes || undefined,
          createdAt: toJSDate(d.created_at),
          updatedAt: toJSDate(d.updated_at)
        } as DebitNote));

        onNext(list);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchDebitNotes();

    const channelName = `debit_notes-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${businessId}` }, () => fetchDebitNotes())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createDebitNote(ownerUid: string, data: Omit<DebitNote, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const payload = {
      business_id: data.businessId,
      owner_uid: ownerUid,
      doc_type: 'debit_note',
      doc_number: data.debitNoteNumber,
      status: data.status || 'draft',
      customer_id: data.customerId || null,
      customer_details: data.customerDetails || {},
      linked_invoice_id: data.invoiceId || null,
      issue_date: new Date(data.issueDate).toISOString().split('T')[0],
      reason: data.reason || null,
      sub_total: data.subTotal || 0,
      adjustment_amount: data.adjustmentAmount || 0,
      total_taxable_amount: data.totalTaxableAmount || 0,
      gst_adjustment: data.gstAdjustment || 0,
      grand_total: data.grandTotal || 0,
      notes: data.notes || null
    };

    const { data: inserted, error } = await supabase
      .from('sales_documents')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating debit note:", error);
      throw error;
    }

    if (data.items && data.items.length > 0) {
      await this.saveDocumentItems(inserted.id, data.items);
    }

    await this.logActivity(ownerUid, data.businessId, {
      documentId: inserted.id,
      documentType: "debit_note",
      documentNumber: data.debitNoteNumber,
      action: "created",
      description: `Debit Note ${data.debitNoteNumber} of ₹${data.grandTotal} issued against Invoice ${data.invoiceNumber} (Reason: ${data.reason}).`,
      userName: "Partner"
    });

    return inserted.id;
  },

  async updateDebitNote(ownerUid: string, id: string, data: Partial<DebitNote>): Promise<void> {
    const payload: any = {};
    if (data.debitNoteNumber !== undefined) payload.doc_number = data.debitNoteNumber;
    if (data.status !== undefined) payload.status = data.status;
    if (data.issueDate !== undefined) payload.issue_date = new Date(data.issueDate).toISOString().split('T')[0];
    if (data.reason !== undefined) payload.reason = data.reason;
    if (data.grandTotal !== undefined) payload.grand_total = data.grandTotal;

    const { error } = await supabase.from('sales_documents').update(payload).eq('id', id);
    if (error) throw error;

    if (data.items) {
      await this.saveDocumentItems(id, data.items);
    }

    if (data.businessId && data.debitNoteNumber) {
      await this.logActivity(ownerUid, data.businessId, {
        documentId: id,
        documentType: "debit_note",
        documentNumber: data.debitNoteNumber,
        action: "updated",
        description: `Debit Note ${data.debitNoteNumber} updated. Status: ${data.status}.`,
        userName: "Partner"
      });
    }
  },

  async deleteDebitNote(ownerUid: string, businessId: string, id: string, number: string): Promise<void> {
    await supabase.from('sales_documents').delete().eq('id', id);
    await this.logActivity(ownerUid, businessId, {
      documentId: id,
      documentType: "debit_note",
      documentNumber: number,
      action: "deleted",
      description: `Debit Note ${number} was deleted.`,
      userName: "Partner"
    });
  },

  // ==========================================
  // 5. Delivery Challan Service
  // ==========================================
  subscribeToDeliveryChallans(
    ownerUid: string,
    businessId: string,
    onNext: (items: DeliveryChallan[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchDeliveryChallans = async () => {
      try {
        const { data, error } = await supabase
          .from('sales_documents')
          .select('*')
          .eq('business_id', businessId)
          .eq('doc_type', 'delivery_challan')
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          return;
        }

        const docIds = (data || []).map(d => d.id);
        const itemsMap = await this.fetchItemsForDocs(docIds);

        const list: DeliveryChallan[] = (data || []).map(d => ({
          id: d.id,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          challanNumber: d.doc_number,
          status: d.status,
          customerId: d.customer_id,
          customerDetails: d.customer_details || {},
          issueDate: toJSDate(d.issue_date),
          vehicleDetails: d.vehicle_details || {},
          deliveryAddress: d.delivery_address || {},
          items: itemsMap[d.id] || [],
          subTotal: Number(d.sub_total || 0),
          totalDiscount: Number(d.total_discount || 0),
          totalTaxableAmount: Number(d.total_taxable_amount || 0),
          grandTotal: Number(d.grand_total || 0),
          notes: d.notes || undefined,
          termsConditions: d.terms_conditions || undefined,
          createdAt: toJSDate(d.created_at),
          updatedAt: toJSDate(d.updated_at)
        } as DeliveryChallan));

        onNext(list);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchDeliveryChallans();

    const channelName = `delivery_challans-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${businessId}` }, () => fetchDeliveryChallans())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createDeliveryChallan(ownerUid: string, data: Omit<DeliveryChallan, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const payload = {
      business_id: data.businessId,
      owner_uid: ownerUid,
      doc_type: 'delivery_challan',
      doc_number: data.challanNumber,
      status: data.status || 'draft',
      customer_id: data.customerId || null,
      customer_details: data.customerDetails || {},
      issue_date: new Date(data.issueDate).toISOString().split('T')[0],
      vehicle_details: data.vehicleDetails || {},
      delivery_address: data.deliveryAddress || {},
      sub_total: data.subTotal || 0,
      total_discount: data.totalDiscount || 0,
      total_taxable_amount: data.totalTaxableAmount || 0,
      grand_total: data.grandTotal || 0,
      notes: data.notes || null,
      terms_conditions: data.termsConditions || null
    };

    const { data: inserted, error } = await supabase
      .from('sales_documents')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating delivery challan:", error);
      throw error;
    }

    if (data.items && data.items.length > 0) {
      await this.saveDocumentItems(inserted.id, data.items);
    }

    await this.logActivity(ownerUid, data.businessId, {
      documentId: inserted.id,
      documentType: "delivery_challan",
      documentNumber: data.challanNumber,
      action: "created",
      description: `Delivery Challan ${data.challanNumber} generated for customer ${data.customerDetails.name} (Vehicle: ${data.vehicleDetails?.vehicleNumber || "N/A"}).`,
      userName: "Partner"
    });

    return inserted.id;
  },

  async updateDeliveryChallan(ownerUid: string, id: string, data: Partial<DeliveryChallan>): Promise<void> {
    const payload: any = {};
    if (data.challanNumber !== undefined) payload.doc_number = data.challanNumber;
    if (data.status !== undefined) payload.status = data.status;
    if (data.issueDate !== undefined) payload.issue_date = new Date(data.issueDate).toISOString().split('T')[0];
    if (data.vehicleDetails !== undefined) payload.vehicle_details = data.vehicleDetails;
    if (data.deliveryAddress !== undefined) payload.delivery_address = data.deliveryAddress;
    if (data.grandTotal !== undefined) payload.grand_total = data.grandTotal;

    const { error } = await supabase.from('sales_documents').update(payload).eq('id', id);
    if (error) throw error;

    if (data.items) {
      await this.saveDocumentItems(id, data.items);
    }

    if (data.businessId && data.challanNumber) {
      await this.logActivity(ownerUid, data.businessId, {
        documentId: id,
        documentType: "delivery_challan",
        documentNumber: data.challanNumber,
        action: "updated",
        description: `Delivery Challan ${data.challanNumber} updated. Status: ${data.status}.`,
        userName: "Partner"
      });
    }
  },

  async deleteDeliveryChallan(ownerUid: string, businessId: string, id: string, number: string): Promise<void> {
    await supabase.from('sales_documents').delete().eq('id', id);
    await this.logActivity(ownerUid, businessId, {
      documentId: id,
      documentType: "delivery_challan",
      documentNumber: number,
      action: "deleted",
      description: `Delivery Challan ${number} was deleted.`,
      userName: "Partner"
    });
  },

  // ==========================================
  // 6. Purchase Orders Service
  // ==========================================
  subscribeToPurchaseOrders(
    ownerUid: string,
    businessId: string,
    onNext: (items: PurchaseOrder[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchPurchaseOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('sales_documents')
          .select('*')
          .eq('business_id', businessId)
          .eq('doc_type', 'purchase_order')
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          return;
        }

        const docIds = (data || []).map(d => d.id);
        const itemsMap = await this.fetchItemsForDocs(docIds);

        const list: PurchaseOrder[] = (data || []).map(d => ({
          id: d.id,
          businessId: d.business_id,
          ownerUid: d.owner_uid,
          poNumber: d.doc_number,
          status: d.status,
          vendorName: d.vendor_name || "",
          vendorGstin: d.vendor_gstin,
          vendorEmail: d.vendor_email,
          vendorPhone: d.vendor_phone,
          vendorAddress: d.vendor_address,
          issueDate: toJSDate(d.issue_date),
          expectedDelivery: toJSDate(d.expected_delivery),
          items: itemsMap[d.id] || [],
          subTotal: Number(d.sub_total || 0),
          totalDiscount: Number(d.total_discount || 0),
          totalTaxableAmount: Number(d.total_taxable_amount || 0),
          totalCgst: Number(d.total_cgst || 0),
          totalSgst: Number(d.total_sgst || 0),
          totalIgst: Number(d.total_igst || 0),
          totalCess: Number(d.total_cess || 0),
          grandTotal: Number(d.grand_total || 0),
          notes: d.notes || undefined,
          termsConditions: d.terms_conditions || undefined,
          createdAt: toJSDate(d.created_at),
          updatedAt: toJSDate(d.updated_at)
        } as PurchaseOrder));

        onNext(list);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchPurchaseOrders();

    const channelName = `purchase_orders-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_documents', filter: `business_id=eq.${businessId}` }, () => fetchPurchaseOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async createPurchaseOrder(ownerUid: string, data: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const payload = {
      business_id: data.businessId,
      owner_uid: ownerUid,
      doc_type: 'purchase_order',
      doc_number: data.poNumber,
      status: data.status || 'draft',
      vendor_name: data.vendorName || null,
      vendor_gstin: data.vendorGstin || null,
      vendor_email: data.vendorEmail || null,
      vendor_phone: data.vendorPhone || null,
      vendor_address: data.vendorAddress || null,
      issue_date: new Date(data.issueDate).toISOString().split('T')[0],
      expected_delivery: data.expectedDelivery ? new Date(data.expectedDelivery).toISOString().split('T')[0] : null,
      sub_total: data.subTotal || 0,
      total_discount: data.totalDiscount || 0,
      total_taxable_amount: data.totalTaxableAmount || 0,
      total_cgst: data.totalCgst || 0,
      total_sgst: data.totalSgst || 0,
      total_igst: data.totalIgst || 0,
      total_cess: data.totalCess || 0,
      grand_total: data.grandTotal || 0,
      notes: data.notes || null,
      terms_conditions: data.termsConditions || null
    };

    const { data: inserted, error } = await supabase
      .from('sales_documents')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating purchase order:", error);
      throw error;
    }

    if (data.items && data.items.length > 0) {
      await this.saveDocumentItems(inserted.id, data.items);
    }

    await this.logActivity(ownerUid, data.businessId, {
      documentId: inserted.id,
      documentType: "purchase_order",
      documentNumber: data.poNumber,
      action: "created",
      description: `Purchase Order ${data.poNumber} raised with vendor ${data.vendorName} of grand total ₹${data.grandTotal}.`,
      userName: "Partner"
    });

    return inserted.id;
  },

  async updatePurchaseOrder(ownerUid: string, id: string, data: Partial<PurchaseOrder>): Promise<void> {
    const payload: any = {};
    if (data.poNumber !== undefined) payload.doc_number = data.poNumber;
    if (data.status !== undefined) payload.status = data.status;
    if (data.vendorName !== undefined) payload.vendor_name = data.vendorName;
    if (data.issueDate !== undefined) payload.issue_date = new Date(data.issueDate).toISOString().split('T')[0];
    if (data.expectedDelivery !== undefined) payload.expected_delivery = new Date(data.expectedDelivery).toISOString().split('T')[0];
    if (data.grandTotal !== undefined) payload.grand_total = data.grandTotal;

    const { error } = await supabase.from('sales_documents').update(payload).eq('id', id);
    if (error) throw error;

    if (data.items) {
      await this.saveDocumentItems(id, data.items);
    }

    if (data.businessId && data.poNumber) {
      await this.logActivity(ownerUid, data.businessId, {
        documentId: id,
        documentType: "purchase_order",
        documentNumber: data.poNumber,
        action: "updated",
        description: `Purchase Order ${data.poNumber} updated. Status: ${data.status}.`,
        userName: "Partner"
      });
    }
  },

  async deletePurchaseOrder(ownerUid: string, businessId: string, id: string, number: string): Promise<void> {
    await supabase.from('sales_documents').delete().eq('id', id);
    await this.logActivity(ownerUid, businessId, {
      documentId: id,
      documentType: "purchase_order",
      documentNumber: number,
      action: "deleted",
      description: `Purchase Order ${number} was deleted.`,
      userName: "Partner"
    });
  },

  // ==========================================
  // 7. Dynamic Convert To Invoice Trigger
  // ==========================================
  async convertToInvoice(
    ownerUid: string, 
    sourceDocId: string, 
    sourceType: 'quotation' | 'proforma_invoice' | 'delivery_challan',
    sourceNumber: string,
    invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const payload = {
      business_id: invoiceData.businessId,
      owner_uid: ownerUid,
      doc_type: 'invoice',
      doc_number: invoiceData.invoiceNumber,
      status: invoiceData.status || 'draft',
      customer_id: invoiceData.customerId || null,
      customer_details: invoiceData.customerDetails || {},
      issue_date: new Date(invoiceData.issueDate).toISOString().split('T')[0],
      due_date: new Date(invoiceData.dueDate).toISOString().split('T')[0],
      sub_total: invoiceData.subTotal || 0,
      total_discount: invoiceData.totalDiscount || 0,
      total_taxable_amount: invoiceData.totalTaxableAmount || 0,
      total_cgst: invoiceData.totalCgst || 0,
      total_sgst: invoiceData.totalSgst || 0,
      total_igst: invoiceData.totalIgst || 0,
      total_cess: invoiceData.totalCess || 0,
      grand_total: invoiceData.grandTotal || 0,
      amount_paid: invoiceData.amountPaid || 0,
      amount_due: invoiceData.amountDue || invoiceData.grandTotal,
      notes: invoiceData.notes || null,
      terms_conditions: invoiceData.termsConditions || null
    };

    const { data: inserted, error } = await supabase
      .from('sales_documents')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error converting to invoice:", error);
      throw error;
    }

    if (invoiceData.items && invoiceData.items.length > 0) {
      await this.saveDocumentItems(inserted.id, invoiceData.items);
    }

    await supabase
      .from('sales_documents')
      .update({
        status: 'converted',
        converted_doc_id: inserted.id
      })
      .eq('id', sourceDocId);

    await this.logActivity(ownerUid, invoiceData.businessId, {
      documentId: inserted.id,
      documentType: "invoice",
      documentNumber: invoiceData.invoiceNumber,
      action: "converted",
      description: `Workflow converted: ${sourceType.replace("_", " ")} ${sourceNumber} converted to standard tax Invoice ${invoiceData.invoiceNumber}.`,
      userName: "Partner"
    });

    return inserted.id;
  },

  // ==========================================
  // 8. Document History & Activity Logging
  // ==========================================
  subscribeToDocumentActivities(
    ownerUid: string,
    businessId: string,
    documentId: string,
    onNext: (items: DocumentActivity[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('document_activities')
          .select('*')
          .eq('business_id', businessId)
          .eq('document_id', documentId)
          .order('timestamp', { ascending: false });

        if (error) {
          if (onError) onError(error);
          return;
        }

        onNext((data || []).map(mapActivityRow));
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchActivities();

    const channelName = `doc_activities-${documentId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_activities', filter: `document_id=eq.${documentId}` }, () => fetchActivities())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToBusinessActivities(
    ownerUid: string,
    businessId: string,
    onNext: (items: DocumentActivity[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('document_activities')
          .select('*')
          .eq('business_id', businessId)
          .order('timestamp', { ascending: false });

        if (error) {
          if (onError) onError(error);
          return;
        }

        onNext((data || []).map(mapActivityRow));
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchActivities();

    const channelName = `business_activities-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_activities', filter: `business_id=eq.${businessId}` }, () => fetchActivities())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async logActivity(
    ownerUid: string,
    businessId: string,
    data: {
      documentId: string;
      documentType: SalesDocType;
      documentNumber: string;
      action: string;
      description: string;
      userName?: string;
    }
  ): Promise<void> {
    const payload = {
      business_id: businessId,
      owner_uid: ownerUid,
      document_id: data.documentId,
      document_type: data.documentType,
      document_number: data.documentNumber,
      action: data.action,
      description: data.description,
      user_id: ownerUid,
      user_name: data.userName || "Partner"
    };

    const { error } = await supabase.from('document_activities').insert(payload);
    if (error) console.error("Error logging document activity:", error);
  },

  async createDocument(data: any): Promise<string> {
    const docType = data.docType || 'invoice';
    const payload: any = {
      business_id: data.businessId,
      owner_uid: data.ownerUid,
      doc_type: docType,
      doc_number: data.docNumber || data.invoiceNumber || data.quotationNumber || data.proformaNumber || data.creditNoteNumber || data.debitNoteNumber || data.challanNumber || data.poNumber,
      status: data.status || 'draft',
      customer_id: data.customerId || null,
      customer_details: data.customerDetails || null,
      issue_date: data.issueDate ? new Date(data.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      due_date: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : (data.expiryDate ? new Date(data.expiryDate).toISOString().split('T')[0] : null),
      place_of_supply: data.placeOfSupply || null,
      sub_total: Number(data.subTotal || 0),
      total_discount: Number(data.totalDiscount || 0),
      total_taxable_amount: Number(data.totalTaxableAmount || 0),
      total_cgst: Number(data.totalCgst || 0),
      total_sgst: Number(data.totalSgst || 0),
      total_igst: Number(data.totalIgst || 0),
      total_cess: Number(data.totalCess || 0),
      grand_total: Number(data.grandTotal || 0),
      amount_paid: Number(data.amountPaid || 0),
      amount_due: Number(data.amountDue || (data.grandTotal || 0)),
      notes: data.notes || null,
      terms_conditions: data.termsConditions || null,
      vehicle_details: data.vehicleDetails || null,
      delivery_address: data.deliveryAddress || null,
      reason: data.reason || null
    };

    const { data: res, error } = await supabase.from('sales_documents').insert(payload).select('id').single();
    if (error) throw error;
    if (data.items && Array.isArray(data.items)) {
      await this.saveDocumentItems(res.id, data.items);
    }
    return res.id;
  },

  async updateDocument(id: string, docType: string, data: any): Promise<void> {
    const payload: any = {};
    if (data.docNumber !== undefined) payload.doc_number = data.docNumber;
    if (data.status !== undefined) payload.status = data.status;
    if (data.customerId !== undefined) payload.customer_id = data.customerId;
    if (data.customerDetails !== undefined) payload.customer_details = data.customerDetails;
    if (data.issueDate !== undefined) payload.issue_date = new Date(data.issueDate).toISOString().split('T')[0];
    if (data.dueDate !== undefined) payload.due_date = new Date(data.dueDate).toISOString().split('T')[0];
    if (data.placeOfSupply !== undefined) payload.place_of_supply = data.placeOfSupply;
    if (data.subTotal !== undefined) payload.sub_total = Number(data.subTotal);
    if (data.totalDiscount !== undefined) payload.total_discount = Number(data.totalDiscount);
    if (data.totalTaxableAmount !== undefined) payload.total_taxable_amount = Number(data.totalTaxableAmount);
    if (data.totalCgst !== undefined) payload.total_cgst = Number(data.totalCgst);
    if (data.totalSgst !== undefined) payload.total_sgst = Number(data.totalSgst);
    if (data.totalIgst !== undefined) payload.total_igst = Number(data.totalIgst);
    if (data.totalCess !== undefined) payload.total_cess = Number(data.totalCess);
    if (data.grandTotal !== undefined) payload.grand_total = Number(data.grandTotal);
    if (data.amountPaid !== undefined) payload.amount_paid = Number(data.amountPaid);
    if (data.amountDue !== undefined) payload.amount_due = Number(data.amountDue);
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.termsConditions !== undefined) payload.terms_conditions = data.termsConditions;
    if (data.vehicleDetails !== undefined) payload.vehicle_details = data.vehicleDetails;
    if (data.deliveryAddress !== undefined) payload.delivery_address = data.deliveryAddress;
    if (data.reason !== undefined) payload.reason = data.reason;

    const { error } = await supabase.from('sales_documents').update(payload).eq('id', id);
    if (error) throw error;

    if (data.items && Array.isArray(data.items)) {
      await this.saveDocumentItems(id, data.items);
    }
  },

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase.from('sales_documents').delete().eq('id', id);
    if (error) throw error;
  }
};
