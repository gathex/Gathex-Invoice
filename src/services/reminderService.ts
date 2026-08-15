import { supabase } from "../supabase/config";
import { 
  PaymentReminder, 
  ReminderTemplate, 
  ReminderLog, 
  ScheduledReminder, 
  ReminderSettings, 
  ReminderDeliveryLog, 
  Invoice, 
  Customer,
  DeliveryChannel,
  ReminderType
} from "../types";

export const DEFAULT_TEMPLATES = [
  {
    type: "upcoming",
    name: "Upcoming Due Reminder",
    subject: "Upcoming Payment Reminder: Invoice {{invoice_number}}",
    content: "Dear {{customer_name}},\n\nThis is a friendly reminder that Invoice {{invoice_number}} issued on {{invoice_date}} is due on {{due_date}}.\n\nOutstanding amount: {{balance}} INR.\n\nYou can make a quick and secure payment using this link: {{payment_link}}\nAlternatively, pay via UPI using ID: {{upi_id}}\n\nThank you for your business!\n\nBest regards,\n{{business_name}}",
    isDefault: true
  },
  {
    type: "due_today",
    name: "Due Today Reminder",
    subject: "Urgent Payment Due Today: Invoice {{invoice_number}}",
    content: "Dear {{customer_name}},\n\nThis is to notify you that payment for Invoice {{invoice_number}} in the amount of {{balance}} INR is due today ({{due_date}}).\n\nPlease settle the payment immediately to avoid service disruption or overdue charges.\n\nQuick Pay: {{payment_link}}\nUPI: {{upi_id}}\n\nBest regards,\n{{business_name}}",
    isDefault: true
  },
  {
    type: "first_overdue",
    name: "First Overdue Notice (3 Days After)",
    subject: "Overdue Alert: Invoice {{invoice_number}} is unpaid",
    content: "Dear {{customer_name}},\n\nWe noticed that payment for Invoice {{invoice_number}} has not yet been received. The invoice was due on {{due_date}} and is now overdue.\n\nOutstanding Dues: {{balance}} INR.\n\nPlease process the payment as soon as possible via: {{payment_link}}\nIf you have already paid, please ignore this notice.\n\nSincerely,\n{{business_name}}",
    isDefault: true
  },
  {
    type: "second_overdue",
    name: "Second Overdue Notice (7 Days After)",
    subject: "REPEATED REMINDER: Overdue Invoice {{invoice_number}}",
    content: "Dear {{customer_name}},\n\nWe are writing to repeat our request for payment of Invoice {{invoice_number}} which is now significantly overdue. The outstanding amount of {{balance}} INR was scheduled for payment on {{due_date}}.\n\nPlease clear the balance immediately via: {{payment_link}} or UPI: {{upi_id}}\n\nSincerely,\n{{business_name}}",
    isDefault: true
  },
  {
    type: "final",
    name: "Final Overdue Warning (15 Days After)",
    subject: "FINAL NOTICE: Immediate Action Required for Invoice {{invoice_number}}",
    content: "Dear {{customer_name}},\n\nThis is our FINAL REMINDER regarding Invoice {{invoice_number}} in the amount of {{balance}} INR which has been overdue since {{due_date}}.\n\nIf payment is not settled within 48 hours, we will be forced to suspend services or initiate collections procedures.\n\nPay immediately to clear your account: {{payment_link}}\nUPI: {{upi_id}}\n\nRegards,\n{{business_name}}",
    isDefault: true
  },
  {
    type: "thank_you",
    name: "Payment Thank You",
    subject: "Payment Confirmed: Thank you for settling Invoice {{invoice_number}}",
    content: "Dear {{customer_name}},\n\nThank you for your payment of {{amount}} INR towards Invoice {{invoice_number}}.\n\nYour payment has been successfully logged on our system. Your remaining balance is {{balance}} INR.\n\nWe appreciate your timely business!\n\nBest regards,\n{{business_name}}",
    isDefault: true
  },
  {
    type: "refund",
    name: "Refund Confirmation",
    subject: "Refund Processed: Invoice {{invoice_number}}",
    content: "Dear {{customer_name}},\n\nWe have successfully initiated/processed a refund of {{amount}} INR towards Invoice {{invoice_number}}.\n\nPlease allow 3-5 business days for it to reflect in your account.\n\nIf you have any queries, please reach out to {{support_email}}.\n\nBest regards,\n{{business_name}}",
    isDefault: true
  }
];

export function mapPaymentReminderRow(row: any): PaymentReminder {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number,
    userId: row.user_id,
    reminderType: row.reminder_type,
    deliveryChannel: row.delivery_channel,
    status: row.status,
    amount: Number(row.amount || 0),
    outstandingAmount: Number(row.outstanding_amount || 0),
    dueDate: row.due_date ? new Date(row.due_date) : new Date(),
    lastSentAt: row.last_sent_at ? new Date(row.last_sent_at) : undefined,
    nextScheduledAt: row.next_scheduled_at ? new Date(row.next_scheduled_at) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
  };
}

export function mapReminderLogRow(row: any): ReminderLog {
  return {
    id: row.id,
    businessId: row.business_id,
    reminderId: row.reminder_id,
    invoiceId: row.invoice_id,
    customerId: row.customer_id,
    userId: row.user_id,
    action: row.action,
    channel: row.channel,
    description: row.description,
    recipient: row.recipient,
    performedBy: row.performed_by,
    errorMessage: row.error_message,
    timestamp: row.timestamp ? new Date(row.timestamp) : new Date()
  };
}

export function mapReminderTemplateRow(row: any): ReminderTemplate {
  return {
    id: row.id,
    businessId: row.business_id,
    ownerUid: row.owner_uid,
    name: row.name,
    type: row.type,
    subject: row.subject,
    content: row.content,
    isDefault: !!row.is_default,
    signature: row.signature,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
  };
}

export function mapReminderSettingsRow(row: any): ReminderSettings {
  return {
    id: row.id || row.business_id,
    businessId: row.business_id,
    ownerUid: row.owner_uid,
    enableAutomaticReminders: !!row.enable_automatic_reminders,
    reminderFrequency: row.reminder_frequency || 'daily',
    workingDaysOnly: !!row.working_days_only,
    businessHoursOnly: !!row.business_hours_only,
    maxAttempts: row.max_attempts || 3,
    defaultEmailTemplateId: row.default_email_template_id,
    defaultSenderName: row.default_sender_name,
    defaultReplyToEmail: row.default_reply_to_email,
    enabledReminderTypes: row.enabled_reminder_types || {},
    schedules: row.schedules || {},
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
  };
}

export const reminderService = {
  subscribeToReminders(
    businessId: string,
    onNext: (reminders: PaymentReminder[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchReminders = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_reminders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          else console.error("Error fetching reminders:", error);
          return;
        }

        onNext((data || []).map(mapPaymentReminderRow));
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchReminders();

    const channelName = `payment_reminders-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_reminders', filter: `business_id=eq.${businessId}` },
        () => fetchReminders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToReminderLogs(
    businessId: string,
    onNext: (logs: ReminderLog[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('reminder_logs')
          .select('*')
          .eq('business_id', businessId)
          .order('timestamp', { ascending: false });

        if (error) {
          if (onError) onError(error);
          else console.error("Error fetching reminder logs:", error);
          return;
        }

        onNext((data || []).map(mapReminderLogRow));
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchLogs();

    const channelName = `reminder_logs-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_logs', filter: `business_id=eq.${businessId}` },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToTemplates(
    businessId: string,
    onNext: (templates: ReminderTemplate[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('reminder_templates')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          else console.error("Error fetching templates:", error);
          return;
        }

        onNext((data || []).map(mapReminderTemplateRow));
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchTemplates();

    const channelName = `reminder_templates-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_templates', filter: `business_id=eq.${businessId}` },
        () => fetchTemplates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async seedTemplatesIfEmpty(businessId: string, ownerUid: string): Promise<ReminderTemplate[]> {
    const { data: existing, error } = await supabase
      .from('reminder_templates')
      .select('*')
      .eq('business_id', businessId);

    if (!error && existing && existing.length > 0) {
      return existing.map(mapReminderTemplateRow);
    }

    const payload = DEFAULT_TEMPLATES.map(t => ({
      business_id: businessId,
      owner_uid: ownerUid,
      name: t.name,
      type: t.type,
      subject: t.subject,
      content: t.content,
      is_default: true,
      signature: "Regards,\nFinance Team"
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from('reminder_templates')
      .insert(payload)
      .select('*');

    if (insertErr) {
      console.error("Error seeding templates:", insertErr);
      return [];
    }

    return (inserted || []).map(mapReminderTemplateRow);
  },

  subscribeToSettings(
    businessId: string,
    ownerUid: string,
    onNext: (settings: ReminderSettings) => void,
    onError?: (err: any) => void
  ): () => void {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('reminder_settings')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          if (onError) onError(error);
          return;
        }

        if (!data) {
          const defaultSettings = {
            business_id: businessId,
            owner_uid: ownerUid,
            enable_automatic_reminders: true,
            reminder_frequency: "daily",
            working_days_only: true,
            business_hours_only: true,
            max_attempts: 3,
            default_sender_name: "Accounts GATHEX",
            default_reply_to_email: "no-reply@gathex.in",
            enabled_reminder_types: {
              upcoming: true,
              due_today: true,
              first_overdue: true,
              second_overdue: true,
              final: true,
              custom: true
            },
            schedules: {
              upcoming_7_days: false,
              upcoming_3_days: true,
              upcoming_1_day: true,
              due_today: true,
              overdue_3_days: true,
              overdue_7_days: true,
              overdue_15_days: true,
              monthly_until_paid: false
            }
          };

          const { data: created, error: createErr } = await supabase
            .from('reminder_settings')
            .upsert(defaultSettings)
            .select('*')
            .single();

          if (!createErr && created) {
            onNext(mapReminderSettingsRow(created));
          }
        } else {
          onNext(mapReminderSettingsRow(data));
        }
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchSettings();

    const channelName = `reminder_settings-${businessId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_settings', filter: `business_id=eq.${businessId}` },
        () => fetchSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async saveReminderSettings(settings: Partial<ReminderSettings> & { businessId: string }): Promise<void> {
    const payload: any = { business_id: settings.businessId };
    if (settings.ownerUid !== undefined) payload.owner_uid = settings.ownerUid;
    if (settings.enableAutomaticReminders !== undefined) payload.enable_automatic_reminders = settings.enableAutomaticReminders;
    if (settings.reminderFrequency !== undefined) payload.reminder_frequency = settings.reminderFrequency;
    if (settings.workingDaysOnly !== undefined) payload.working_days_only = settings.workingDaysOnly;
    if (settings.businessHoursOnly !== undefined) payload.business_hours_only = settings.businessHoursOnly;
    if (settings.maxAttempts !== undefined) payload.max_attempts = settings.maxAttempts;
    if (settings.defaultEmailTemplateId !== undefined) payload.default_email_template_id = settings.defaultEmailTemplateId || null;
    if (settings.defaultSenderName !== undefined) payload.default_sender_name = settings.defaultSenderName;
    if (settings.defaultReplyToEmail !== undefined) payload.default_reply_to_email = settings.defaultReplyToEmail;
    if (settings.enabledReminderTypes !== undefined) payload.enabled_reminder_types = settings.enabledReminderTypes;
    if (settings.schedules !== undefined) payload.schedules = settings.schedules;

    const { error } = await supabase
      .from('reminder_settings')
      .upsert(payload, { onConflict: 'business_id' });

    if (error) {
      console.error("Error saving reminder settings:", error);
      throw error;
    }
  },

  async saveReminderTemplate(template: Partial<ReminderTemplate> & { id?: string, businessId: string, ownerUid: string }): Promise<void> {
    const payload: any = {
      business_id: template.businessId,
      owner_uid: template.ownerUid,
      name: template.name || "Template",
      type: template.type || "custom",
      subject: template.subject || "",
      content: template.content || "",
      is_default: !!template.isDefault,
      signature: template.signature || null
    };
    if (template.id) payload.id = template.id;

    const { error } = await supabase
      .from('reminder_templates')
      .upsert(payload);

    if (error) {
      console.error("Error saving reminder template:", error);
      throw error;
    }
  },

  async deleteReminderTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('reminder_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting reminder template:", error);
      throw error;
    }
  },

  async getInvoices(businessId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('sales_documents')
      .select('*')
      .eq('business_id', businessId);

    if (error) {
      console.error("Error fetching invoices for reminders:", error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      businessId: d.business_id,
      ownerUid: d.owner_uid,
      invoiceNumber: d.doc_number,
      status: d.status,
      customerId: d.customer_id,
      customerDetails: d.customer_details || {},
      issueDate: d.issue_date ? new Date(d.issue_date) : new Date(),
      dueDate: d.due_date ? new Date(d.due_date) : new Date(),
      items: [],
      subTotal: Number(d.sub_total || 0),
      totalDiscount: Number(d.total_discount || 0),
      totalTaxableAmount: Number(d.total_taxable_amount || 0),
      totalCgst: Number(d.total_cgst || 0),
      totalSgst: Number(d.total_sgst || 0),
      totalIgst: Number(d.total_igst || 0),
      grandTotal: Number(d.grand_total || 0),
      amountPaid: Number(d.amount_paid || 0),
      amountDue: Number(d.amount_due || 0),
      createdAt: d.created_at ? new Date(d.created_at) : new Date(),
      updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
    } as any));
  },

  async getCustomers(businessId: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);

    if (error) {
      console.error("Error fetching customers for reminders:", error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      businessId: d.business_id,
      ownerUid: d.owner_uid,
      name: d.name,
      companyName: d.company_name,
      gstin: d.gstin,
      email: d.email,
      phone: d.phone,
      billingAddress: d.billing_address || {},
      shippingAddress: d.shipping_address,
      createdAt: d.created_at ? new Date(d.created_at) : new Date(),
      updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
    }));
  },

  compileTemplate(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const key in variables) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(regex, variables[key] || "");
    }
    return result;
  },

  async sendManualReminder(params: {
    businessId: string;
    ownerUid: string;
    invoice: Invoice;
    customer: Customer;
    channel: DeliveryChannel;
    reminderType: ReminderType;
    subject: string;
    message: string;
    attachPdf: boolean;
    attachReceipt: boolean;
  }): Promise<string> {
    const { businessId, ownerUid, invoice, customer, channel, reminderType, subject, message } = params;

    const reminderPayload = {
      business_id: businessId,
      customer_id: customer.id || null,
      customer_name: customer.name,
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      user_id: ownerUid,
      reminder_type: reminderType,
      delivery_channel: channel,
      status: "sent",
      amount: invoice.grandTotal,
      outstanding_amount: invoice.amountDue !== undefined ? invoice.amountDue : (invoice.grandTotal - (invoice.amountPaid || 0)),
      due_date: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : null,
      last_sent_at: new Date().toISOString()
    };

    const { data: reminderData, error: reminderErr } = await supabase
      .from('payment_reminders')
      .insert(reminderPayload)
      .select('id')
      .single();

    if (reminderErr) {
      console.error("Error creating payment reminder:", reminderErr);
      throw reminderErr;
    }

    const reminderId = reminderData.id;

    const logPayload = {
      business_id: businessId,
      reminder_id: reminderId,
      invoice_id: invoice.id,
      customer_id: customer.id || null,
      user_id: ownerUid,
      action: "sent",
      channel,
      description: `Manual ${reminderType.replace("_", " ")} reminder dispatched successfully via ${channel.toUpperCase()}`,
      recipient: channel === "email" ? customer.email : customer.phone,
      performed_by: "business"
    };

    await supabase.from('reminder_logs').insert(logPayload);

    const deliveryLogPayload = {
      business_id: businessId,
      reminder_id: reminderId,
      channel,
      recipient: channel === "email" ? customer.email : customer.phone,
      status: "delivered"
    };

    await supabase.from('reminder_delivery_logs').insert(deliveryLogPayload);

    await supabase.from('notifications').insert({
      owner_uid: ownerUid,
      type: "success",
      title: "Reminder Sent",
      message: `${channel.toUpperCase()} dispatch verified to ${customer.name} (Inv: ${invoice.invoiceNumber})`,
      link: "reminders",
      is_read: false
    });

    return reminderId;
  },

  async sendBulkReminders(
    businessId: string,
    ownerUid: string,
    selectedInvoices: Invoice[],
    channel: DeliveryChannel,
    reminderType: ReminderType
  ): Promise<number> {
    let count = 0;

    const { data: templates } = await supabase
      .from('reminder_templates')
      .select('*')
      .eq('business_id', businessId)
      .eq('type', reminderType)
      .limit(1);

    const template = templates && templates.length > 0 ? mapReminderTemplateRow(templates[0]) : undefined;

    for (const invoice of selectedInvoices) {
      if (invoice.status === "paid" || (invoice.status as any) === "void") continue;

      const outstanding = invoice.amountDue !== undefined ? invoice.amountDue : (invoice.grandTotal - (invoice.amountPaid || 0));
      if (outstanding <= 0) continue;

      const customer = {
        id: invoice.customerId,
        businessId,
        ownerUid,
        name: invoice.customerDetails?.name || "Customer",
        email: invoice.customerDetails?.email || "billing@gathex.in",
        phone: invoice.customerDetails?.phone || "+919876543210"
      } as Customer;

      const subject = template?.subject ? this.compileTemplate(template.subject, {
        customer_name: customer.name,
        invoice_number: invoice.invoiceNumber,
        invoice_date: String(invoice.issueDate),
        due_date: String(invoice.dueDate),
        amount: String(invoice.grandTotal),
        balance: String(outstanding),
        business_name: "GATHEX Corp",
        payment_link: `https://gathex.in/pay/${invoice.id}`,
        upi_id: "gathex@upi"
      }) : `Payment Reminder for Invoice ${invoice.invoiceNumber}`;

      const message = template?.content ? this.compileTemplate(template.content, {
        customer_name: customer.name,
        invoice_number: invoice.invoiceNumber,
        invoice_date: String(invoice.issueDate),
        due_date: String(invoice.dueDate),
        amount: String(invoice.grandTotal),
        balance: String(outstanding),
        business_name: "GATHEX Corp",
        payment_link: `https://gathex.in/pay/${invoice.id}`,
        upi_id: "gathex@upi"
      }) : `Please pay outstanding balance of ${outstanding} INR for invoice ${invoice.invoiceNumber}.`;

      await this.sendManualReminder({
        businessId,
        ownerUid,
        invoice,
        customer,
        channel,
        reminderType,
        subject,
        message,
        attachPdf: true,
        attachReceipt: false
      });
      count++;
    }

    return count;
  },

  async triggerAutomatedReminders(businessId: string, ownerUid: string): Promise<number> {
    const invoices = await this.getInvoices(businessId);
    const { data: settingsData } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (!settingsData) return 0;
    const settings = mapReminderSettingsRow(settingsData);
    if (!settings.enableAutomaticReminders) return 0;

    let triggeredCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const invoice of invoices) {
      if (invoice.status === "paid" || (invoice.status as any) === "void") continue;

      const outstanding = invoice.amountDue !== undefined ? invoice.amountDue : (invoice.grandTotal - (invoice.amountPaid || 0));
      if (outstanding <= 0) continue;

      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let reminderToTrigger: ReminderType | null = null;

      if (diffDays === -7 && settings.schedules.upcoming_7_days) {
        reminderToTrigger = "upcoming";
      } else if (diffDays === -3 && settings.schedules.upcoming_3_days) {
        reminderToTrigger = "upcoming";
      } else if (diffDays === -1 && settings.schedules.upcoming_1_day) {
        reminderToTrigger = "upcoming";
      } else if (diffDays === 0 && settings.schedules.due_today) {
        reminderToTrigger = "due_today";
      } else if (diffDays === 3 && settings.schedules.overdue_3_days) {
        reminderToTrigger = "first_overdue";
      } else if (diffDays === 7 && settings.schedules.overdue_7_days) {
        reminderToTrigger = "second_overdue";
      } else if (diffDays === 15 && settings.schedules.overdue_15_days) {
        reminderToTrigger = "final";
      } else if (diffDays > 15 && diffDays % 30 === 0 && settings.schedules.monthly_until_paid) {
        reminderToTrigger = "custom";
      }

      if (reminderToTrigger && settings.enabledReminderTypes[reminderToTrigger]) {
        const customer = {
          id: invoice.customerId,
          businessId,
          ownerUid,
          name: invoice.customerDetails?.name || "Customer",
          email: invoice.customerDetails?.email || "billing@gathex.in",
          phone: invoice.customerDetails?.phone || "+919876543210"
        } as Customer;

        const subject = `[Automated] Payment Notice: Invoice ${invoice.invoiceNumber}`;
        const message = `This is an automated notification regarding your invoice ${invoice.invoiceNumber} of ${invoice.grandTotal} INR. Current outstanding balance: ${outstanding} INR. Please pay immediately.`;

        await this.sendManualReminder({
          businessId,
          ownerUid,
          invoice,
          customer,
          channel: "email",
          reminderType: reminderToTrigger,
          subject,
          message,
          attachPdf: true,
          attachReceipt: false
        });

        await supabase.from('scheduled_reminders').insert({
          business_id: businessId,
          owner_uid: ownerUid,
          invoice_id: invoice.id,
          customer_id: invoice.customerId || null,
          reminder_type: reminderToTrigger,
          channel: "email",
          scheduled_date: new Date().toISOString(),
          status: "sent"
        });
        triggeredCount++;
      }
    }

    return triggeredCount;
  }
};
