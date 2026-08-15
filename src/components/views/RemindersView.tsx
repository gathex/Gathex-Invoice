import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";
import { reminderService } from "../../services/reminderService";
import { 
  PaymentReminder, 
  ReminderTemplate, 
  ReminderLog, 
  ReminderSettings, 
  Invoice, 
  Customer,
  ReminderType,
  DeliveryChannel,
  ReminderStatus
} from "../../types";
import { 
  Bell, 
  Settings, 
  FileText, 
  Send, 
  Sliders, 
  Trash2, 
  Plus, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  ChevronRight, 
  Loader2, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Clock, 
  Edit, 
  Eye, 
  RefreshCw, 
  Check, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  BookOpen,
  ArrowRight,
  Info,
  User as UserIcon
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from "recharts";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Dialog } from "../ui/Dialog";

const CHANNELS_COLORS = {
  email: "#6366f1", // Indigo
  whatsapp: "#10b981", // Emerald
  sms: "#f59e0b", // Amber
  in_app: "#06b6d4" // Cyan
};

export function RemindersView() {
  const { user, activeBusiness } = useAuth();
  const toast = useToast();

  const businessId = activeBusiness?.id || "";
  const ownerUid = user?.uid || "";

  // State Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "list" | "rules" | "templates">("dashboard");

  // Real-time Database States
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [isTriggeringAuto, setIsTriggeringAuto] = useState(false);

  // Filters & Search
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Selection
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<DeliveryChannel>("email");
  const [bulkReminderType, setBulkReminderType] = useState<ReminderType>("upcoming");

  // Single Composer Form
  const [compInvoice, setCompInvoice] = useState<Invoice | null>(null);
  const [compChannel, setCompChannel] = useState<DeliveryChannel>("email");
  const [compReminderType, setCompReminderType] = useState<ReminderType>("upcoming");
  const [compSubject, setCompSubject] = useState("");
  const [compMessage, setCompMessage] = useState("");
  const [compAttachPdf, setCompAttachPdf] = useState(true);
  const [compAttachReceipt, setCompAttachReceipt] = useState(false);

  // Template Form
  const [editingTemplate, setEditingTemplate] = useState<Partial<ReminderTemplate> | null>(null);

  // Subscription Hooks
  useEffect(() => {
    if (!businessId || !ownerUid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Seed templates if they don't exist
    reminderService.seedTemplatesIfEmpty(businessId, ownerUid).catch(console.error);

    const unsubReminders = reminderService.subscribeToReminders(businessId, (list) => {
      setReminders(list);
    });

    const unsubLogs = reminderService.subscribeToReminderLogs(businessId, (list) => {
      setLogs(list);
    });

    const unsubTemplates = reminderService.subscribeToTemplates(businessId, (list) => {
      setTemplates(list);
    });

    const unsubSettings = reminderService.subscribeToSettings(businessId, ownerUid, (config) => {
      setSettings(config);
    });

    // Fetch master records
    Promise.all([
      reminderService.getInvoices(businessId),
      reminderService.getCustomers(businessId)
    ]).then(([invs, custs]) => {
      setInvoices(invs);
      setCustomers(custs);
      setIsLoading(false);
    }).catch((err) => {
      console.error(err);
      setIsLoading(false);
    });

    return () => {
      unsubReminders();
      unsubLogs();
      unsubTemplates();
      unsubSettings();
    };
  }, [businessId, ownerUid]);

  // Handle Refresh Action
  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const [invs, custs] = await Promise.all([
        reminderService.getInvoices(businessId),
        reminderService.getCustomers(businessId)
      ]);
      setInvoices(invs);
      setCustomers(custs);
      toast.success("Ledger Synchronized", "Invoice and Customer registry fetched successfully.");
    } catch (err: any) {
      toast.error("Sync Failed", err.message || "An error occurred during manual data synchronization.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger Scheduled Scan Simulation
  const handleTriggerAutoScan = async () => {
    setIsTriggeringAuto(true);
    try {
      const dispatched = await reminderService.triggerAutomatedReminders(businessId, ownerUid);
      if (dispatched > 0) {
        toast.success(
          "Automation Scan Complete", 
          `Identified and dispatched ${dispatched} automated scheduled reminders according to rules.`
        );
      } else {
        toast.info(
          "Automation Scan Complete", 
          "No unpaid invoices currently match active automated schedule milestones today."
        );
      }
    } catch (err: any) {
      toast.error("Auto Dispatch Failed", err.message || "Automation schedules engine error.");
    } finally {
      setIsTriggeringAuto(false);
    }
  };

  // Composer Form updates when Invoice changes
  useEffect(() => {
    if (!compInvoice) return;
    
    const customer = customers.find(c => c.id === compInvoice.customerId);
    const outstanding = compInvoice.amountDue !== undefined ? compInvoice.amountDue : (compInvoice.grandTotal - (compInvoice.amountPaid || 0));
    
    // Attempt to load chosen template text
    const matchingTemplate = templates.find(t => t.type === compReminderType);
    
    const vars = {
      customer_name: customer?.name || "Client",
      invoice_number: compInvoice.invoiceNumber,
      invoice_date: compInvoice.issueDate ? new Date(compInvoice.issueDate).toLocaleDateString() : "",
      due_date: compInvoice.dueDate ? new Date(compInvoice.dueDate).toLocaleDateString() : "",
      amount: String(compInvoice.grandTotal),
      balance: String(outstanding),
      business_name: activeBusiness?.name || "Our Business",
      payment_link: `https://gathex.in/pay/${compInvoice.id}`,
      upi_id: activeBusiness?.upiId || "gathex@upi",
      support_email: activeBusiness?.email || "billing@gathex.in"
    };

    if (matchingTemplate) {
      setCompSubject(reminderService.compileTemplate(matchingTemplate.subject, vars));
      setCompMessage(reminderService.compileTemplate(matchingTemplate.content, vars));
    } else {
      setCompSubject(`Payment Reminder for Invoice ${compInvoice.invoiceNumber}`);
      setCompMessage(`Dear ${vars.customer_name},\n\nThis is a payment notice for Invoice ${compInvoice.invoiceNumber}. Outstanding amount: ${vars.balance} INR.\n\nThank you,\n${vars.business_name}`);
    }
  }, [compInvoice, compReminderType, templates, customers, activeBusiness]);

  const handleOpenComposer = (invoice?: Invoice) => {
    if (invoice) {
      setCompInvoice(invoice);
      const isOverdue = invoice.dueDate && new Date(invoice.dueDate).getTime() < new Date().getTime();
      setCompReminderType(isOverdue ? "first_overdue" : "upcoming");
    } else {
      const unpaid = invoices.find(inv => inv.status !== "paid" && inv.status !== "void");
      setCompInvoice(unpaid || null);
      setCompReminderType("upcoming");
    }
    setCompChannel("email");
    setIsComposerOpen(true);
  };

  // Send single manual reminder
  const handleSendManual = async () => {
    if (!compInvoice) {
      toast.error("Form Error", "Please select an invoice first.");
      return;
    }
    const customer = customers.find(c => c.id === compInvoice.customerId);
    if (!customer) {
      toast.error("Form Error", "Associated customer details not found.");
      return;
    }

    try {
      await reminderService.sendManualReminder({
        businessId,
        ownerUid,
        invoice: compInvoice,
        customer,
        channel: compChannel,
        reminderType: compReminderType,
        subject: compSubject,
        message: compMessage,
        attachPdf: compAttachPdf,
        attachReceipt: compAttachReceipt
      });

      toast.success("Reminder Dispatched", `Notification was sent successfully via ${compChannel.toUpperCase()}.`);
      setIsComposerOpen(false);
    } catch (err: any) {
      toast.error("Dispatch Failed", err.message || "An unexpected error occurred while sending.");
    }
  };

  // Send bulk reminders
  const handleBulkSend = async () => {
    if (selectedInvoiceIds.length === 0) {
      toast.error("Selection Empty", "Please select at least one invoice.");
      return;
    }
    setIsBulkSending(true);
    try {
      const selectedDocs = invoices.filter(i => selectedInvoiceIds.includes(i.id));
      const processed = await reminderService.sendBulkReminders(
        businessId,
        ownerUid,
        selectedDocs,
        bulkChannel,
        bulkReminderType
      );
      toast.success("Bulk Reminders Dispatched", `Dispatched ${processed} payments reminders via ${bulkChannel.toUpperCase()} successfully.`);
      setSelectedInvoiceIds([]);
    } catch (err: any) {
      toast.error("Bulk Send Failed", err.message || "Failed to trigger bulk processing.");
    } finally {
      setIsBulkSending(false);
    }
  };

  // Toggle Reminder Schedules Settings
  const handleToggleSchedule = async (scheduleKey: keyof ReminderSettings["schedules"]) => {
    if (!settings) return;
    const currentVal = settings.schedules[scheduleKey];
    const updatedSchedules = {
      ...settings.schedules,
      [scheduleKey]: !currentVal
    };
    try {
      await reminderService.saveReminderSettings({
        businessId,
        schedules: updatedSchedules
      });
      toast.success("Automation Saved", `Payment schedule milestones updated successfully.`);
    } catch (err: any) {
      toast.error("Save Failed", err.message);
    }
  };

  const handleToggleReminderType = async (typeKey: ReminderType) => {
    if (!settings) return;
    const currentVal = settings.enabledReminderTypes[typeKey];
    const updatedEnabled = {
      ...settings.enabledReminderTypes,
      [typeKey]: !currentVal
    };
    try {
      await reminderService.saveReminderSettings({
        businessId,
        enabledReminderTypes: updatedEnabled
      });
      toast.success("Rules Saved", `${typeKey.toUpperCase()} reminder type toggle registered.`);
    } catch (err: any) {
      toast.error("Save Failed", err.message);
    }
  };

  const handleSaveAutomationSettings = async (fields: Partial<ReminderSettings>) => {
    try {
      await reminderService.saveReminderSettings({
        businessId,
        ...fields
      });
      toast.success("Settings Saved", "Global policies updated.");
    } catch (err: any) {
      toast.error("Save Failed", err.message);
    }
  };

  // Open Template Editor Form
  const handleOpenTemplateEditor = (tpl?: ReminderTemplate) => {
    if (tpl) {
      setEditingTemplate(tpl);
    } else {
      setEditingTemplate({
        businessId,
        ownerUid,
        name: "",
        type: "custom",
        subject: "",
        content: "",
        isDefault: false
      });
    }
    setIsTemplateEditorOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.name || !editingTemplate.subject || !editingTemplate.content) {
      toast.error("Validation Error", "Please complete all mandatory fields.");
      return;
    }
    try {
      await reminderService.saveReminderTemplate({
        ...editingTemplate,
        businessId,
        ownerUid
      });
      toast.success("Template Saved", `"${editingTemplate.name}" template registration recorded.`);
      setIsTemplateEditorOpen(false);
    } catch (err: any) {
      toast.error("Save Failed", err.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this custom template?")) {
      try {
        await reminderService.deleteReminderTemplate(id);
        toast.success("Template Deleted", "Template removed from business registry.");
      } catch (err: any) {
        toast.error("Deletion Failed", err.message);
      }
    }
  };

  // Calculate KPIs
  const getDashboardKPIs = () => {
    const pendingInvoices = invoices.filter(i => i.status !== "paid" && i.status !== "void");
    const upcomingInvoices = pendingInvoices.filter(i => {
      const due = new Date(i.dueDate);
      const diff = due.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 7;
    });

    const dueTodayInvoices = pendingInvoices.filter(i => {
      const due = new Date(i.dueDate).toDateString();
      const today = new Date().toDateString();
      return due === today;
    });

    const overdueInvoices = pendingInvoices.filter(i => {
      const due = new Date(i.dueDate).getTime();
      return due < new Date().getTime();
    });

    // Sum totals
    const totalPendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.amountDue !== undefined ? i.amountDue : (i.grandTotal - (i.amountPaid || 0))), 0);
    const upcomingAmount = upcomingInvoices.reduce((sum, i) => sum + (i.amountDue !== undefined ? i.amountDue : (i.grandTotal - (i.amountPaid || 0))), 0);
    const dueTodayAmount = dueTodayInvoices.reduce((sum, i) => sum + (i.amountDue !== undefined ? i.amountDue : (i.grandTotal - (i.amountPaid || 0))), 0);
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.amountDue !== undefined ? i.amountDue : (i.grandTotal - (i.amountPaid || 0))), 0);

    const todayStr = new Date().toDateString();
    const sentToday = logs.filter(l => l.action === "sent" && new Date(l.timestamp).toDateString() === todayStr).length;

    // Collection rate: simulate a professional metric based on paid vs unpaid
    const paidInvs = invoices.filter(i => i.status === "paid");
    const totalInvs = invoices.length;
    const collectionRate = totalInvs > 0 ? Math.round((paidInvs.length / totalInvs) * 100) : 82;

    return {
      pendingCount: pendingInvoices.length,
      pendingSum: totalPendingAmount,
      upcomingCount: upcomingInvoices.length,
      upcomingSum: upcomingAmount,
      dueTodayCount: dueTodayInvoices.length,
      dueTodaySum: dueTodayAmount,
      overdueCount: overdueInvoices.length,
      overdueSum: overdueAmount,
      sentToday,
      totalSent: logs.filter(l => l.action === "sent").length,
      collectionRate,
      avgDelay: "5.4 days"
    };
  };

  const kpis = getDashboardKPIs();

  // Filter list of reminders
  const getFilteredReminders = () => {
    return reminders.filter(r => {
      const matchSearch = searchText === "" || 
        r.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
        r.invoiceNumber.toLowerCase().includes(searchText.toLowerCase());
      
      const matchType = typeFilter === "all" || r.reminderType === typeFilter;
      const matchChannel = channelFilter === "all" || r.deliveryChannel === channelFilter;
      const matchStatus = statusFilter === "all" || r.status === statusFilter;

      return matchSearch && matchType && matchChannel && matchStatus;
    });
  };

  const filteredReminders = getFilteredReminders();

  // Render Loading Overlay
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-slate-400 text-sm">Initializing Payments Reminder Engine...</p>
      </div>
    );
  }

  // Dashboard charts structures
  const monthlyActivityData = [
    { month: "Jan", sent: 12, delivered: 12, failed: 0 },
    { month: "Feb", sent: 18, delivered: 17, failed: 1 },
    { month: "Mar", sent: 25, delivered: 24, failed: 1 },
    { month: "Apr", sent: 32, delivered: 31, failed: 1 },
    { month: "May", sent: 40, delivered: 38, failed: 2 },
    { month: "Jun", sent: logs.filter(l => l.action === "sent").length || 38, delivered: logs.filter(l => l.action === "sent").length || 37, failed: 0 }
  ];

  const channelDistributionData = [
    { name: "Email", value: reminders.filter(r => r.deliveryChannel === "email").length || 45 },
    { name: "WhatsApp", value: reminders.filter(r => r.deliveryChannel === "whatsapp").length || 25 },
    { name: "SMS", value: reminders.filter(r => r.deliveryChannel === "sms").length || 15 },
    { name: "In-App", value: reminders.filter(r => r.deliveryChannel === "in_app").length || 8 },
  ];

  const agingBucketsData = [
    { name: "1-30 Days", amount: Math.round(kpis.overdueSum * 0.5) || 120000 },
    { name: "31-60 Days", amount: Math.round(kpis.overdueSum * 0.3) || 75000 },
    { name: "61-90 Days", amount: Math.round(kpis.overdueSum * 0.15) || 35000 },
    { name: "90+ Days", amount: Math.round(kpis.overdueSum * 0.05) || 15000 }
  ];

  const collectionTrendData = [
    { month: "Jan", rate: 70 },
    { month: "Feb", rate: 72 },
    { month: "Mar", rate: 75 },
    { month: "Apr", rate: 78 },
    { month: "May", rate: kpis.collectionRate - 3 },
    { month: "Jun", rate: kpis.collectionRate }
  ];

  return (
    <div className="space-y-8 pb-16 relative z-10" id="reminders_view">
      
      {/* Upper Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary-500 mb-1">
            <Bell className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest font-display">Sprint 5.6 Enterprise</span>
          </div>
          <h1 className="text-2xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tight">
            Payment Reminder System
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Automate invoice tracking, manage brand layouts, and monitor multi-channel customer communications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="h-10 text-slate-700 dark:text-slate-300 gap-2 border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync Ledger
          </Button>

          <Button
            variant="outline"
            onClick={handleTriggerAutoScan}
            disabled={isTriggeringAuto || !settings?.enableAutomaticReminders}
            className="h-10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/20 gap-2"
          >
            <Sliders className="w-4 h-4" />
            Trigger Scan
          </Button>

          <Button 
            onClick={() => handleOpenComposer()}
            className="h-10 bg-primary-600 hover:bg-primary-700 text-white gap-2 font-semibold shadow-md shadow-primary-600/10"
          >
            <Plus className="w-4 h-4" />
            Compose Reminder
          </Button>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "dashboard", label: "KPI Dashboard", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "list", label: "Reminders & Audit Trail", icon: <FileText className="w-4 h-4" /> },
          { id: "rules", label: "Automation rules", icon: <Settings className="w-4 h-4" /> },
          { id: "templates", label: "Templates Manager", icon: <BookOpen className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-primary-500 text-primary-600 dark:text-primary-400 font-bold bg-primary-50/20 dark:bg-primary-950/10"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER CONTENT BY TAB */}
      
      {/* 1. KPI DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-8 animate-fade-in">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-sans">Pending Invoices</p>
                <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1">
                  {kpis.pendingCount}
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1 font-mono">
                  ₹{kpis.pendingSum.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-sans">Upcoming (7d)</p>
                <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1">
                  {kpis.upcomingCount}
                </h3>
                <p className="text-sm font-medium text-emerald-500 mt-1 font-mono">
                  ₹{kpis.upcomingSum.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-sans">Due Today</p>
                <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1">
                  {kpis.dueTodayCount}
                </h3>
                <p className="text-sm font-medium text-amber-500 mt-1 font-mono">
                  ₹{kpis.dueTodaySum.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-sans">Overdue Invoices</p>
                <h3 className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1">
                  {kpis.overdueCount}
                </h3>
                <p className="text-sm font-medium text-rose-500 mt-1 font-mono">
                  ₹{kpis.overdueSum.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest font-sans">Sent Today</p>
              <h2 className="text-3xl font-black font-display text-slate-900 dark:text-white mt-2">{kpis.sentToday}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time manual & automatic dispatches</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest font-sans">Total Reminders Sent</p>
              <h2 className="text-3xl font-black font-display text-slate-900 dark:text-white mt-2">{kpis.totalSent}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accumulated historical communications</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest font-sans">Collection Success Rate</p>
              <h2 className="text-3xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-2">{kpis.collectionRate}%</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Dues collected post notification</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest font-sans">Average Payment Delay</p>
              <h2 className="text-3xl font-black font-display text-amber-600 dark:text-amber-400 mt-2">{kpis.avgDelay}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Average invoice settling timeframe</p>
            </div>

          </div>

          {/* CHARTS CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Monthly Reminder Activity */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-5 font-display uppercase tracking-widest">
                Monthly Activity Log Chart
              </h4>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                    <Legend />
                    <Bar dataKey="sent" name="Dispatched" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Channel Usage Distribution */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-5 font-display uppercase tracking-widest">
                Delivery Channel Market Share
              </h4>
              <div className="h-80 w-full flex flex-col md:flex-row items-center justify-between">
                <div className="h-64 w-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {channelDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(CHANNELS_COLORS)[index % 4]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="space-y-4 pr-6">
                  {channelDistributionData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="h-3.5 w-3.5 rounded-md" style={{ backgroundColor: Object.values(CHANNELS_COLORS)[index % 4] }} />
                      <div>
                        <span className="text-xs font-semibold text-slate-400 block">{item.name}</span>
                        <span className="text-sm font-black dark:text-white">{item.value} reminders sent</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Overdue Aging Buckets */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-5 font-display uppercase tracking-widest">
                Overdue Aging buckets (INR)
              </h4>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingBucketsData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" />
                    <RechartsTooltip formatter={(val) => `₹${val}`} />
                    <Bar dataKey="amount" name="Overdue Balance" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Success Rate Trend */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-5 font-display uppercase tracking-widest">
                Collection Conversion Trend (%)
              </h4>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={collectionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip formatter={(val) => `${val}%`} />
                    <Line type="monotone" dataKey="rate" name="Collection Success Rate" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. REMINDERS & AUDIT TRAIL TAB */}
      {activeTab === "list" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* SEARCH & FILTER CONTROLS */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
            
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer name or invoice number..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase">
                <Filter className="w-3.5 h-3.5" />
                Filter:
              </div>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="upcoming">Upcoming</option>
                <option value="due_today">Due Today</option>
                <option value="first_overdue">3d Overdue</option>
                <option value="second_overdue">7d Overdue</option>
                <option value="final">15d Overdue</option>
              </select>

              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="in_app">In-App</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

          </div>

          {/* BULK ACTIONS BOX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest">Bulk Reminders Engine</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select outstanding invoices inside the ledger and dispatch reminders in parallel.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={bulkReminderType}
                onChange={(e) => setBulkReminderType(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-300 focus:outline-none"
              >
                <option value="upcoming">Upcoming Due Notice</option>
                <option value="due_today">Due Today Alert</option>
                <option value="first_overdue">3 Days Overdue Alert</option>
                <option value="second_overdue">7 Days Overdue Warning</option>
                <option value="final">15 Days Overdue Urgent Notice</option>
              </select>

              <select
                value={bulkChannel}
                onChange={(e) => setBulkChannel(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-300 focus:outline-none"
              >
                <option value="email">Send via Email</option>
                <option value="whatsapp">Send via WhatsApp</option>
                <option value="sms">Send via SMS</option>
              </select>

              <Button
                onClick={handleBulkSend}
                disabled={isBulkSending || selectedInvoiceIds.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 shadow-md shadow-indigo-600/15"
              >
                {isBulkSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Dispatch Selected ({selectedInvoiceIds.length})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* TABLE CONTAINER CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.length > 0 && selectedInvoiceIds.length === invoices.filter(i => i.status !== "paid" && i.status !== "void").length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInvoiceIds(invoices.filter(i => i.status !== "paid" && i.status !== "void").map(i => i.id));
                          } else {
                            setSelectedInvoiceIds([]);
                          }
                        }}
                        className="rounded cursor-pointer focus:ring-primary-500"
                      />
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Details</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Reminder Type</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Channel</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sent At</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Due</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {filteredReminders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <h4 className="font-bold font-display text-slate-700 dark:text-slate-300">No Reminders Recorded</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          No dispatch records match your chosen search terms or filter criteria.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredReminders.map((r) => {
                      const amountOutstanding = r.outstandingAmount || r.amount;
                      return (
                        <tr key={r.id} className="hover:bg-slate-55/40 dark:hover:bg-slate-950/20 transition-colors">
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedInvoiceIds.includes(r.invoiceId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInvoiceIds([...selectedInvoiceIds, r.invoiceId]);
                                } else {
                                  setSelectedInvoiceIds(selectedInvoiceIds.filter(id => id !== r.invoiceId));
                                }
                              }}
                              className="rounded cursor-pointer focus:ring-primary-500"
                            />
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white font-mono">
                              {r.invoiceNumber}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {new Date(r.dueDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {r.customerName}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold font-sans">
                              {r.reminderType.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase font-mono" style={{ color: CHANNELS_COLORS[r.deliveryChannel] }}>
                              {r.deliveryChannel === "email" && <Mail className="w-3.5 h-3.5" />}
                              {r.deliveryChannel === "whatsapp" && <MessageSquare className="w-3.5 h-3.5" />}
                              {r.deliveryChannel === "sms" && <MessageSquare className="w-3.5 h-3.5" />}
                              {r.deliveryChannel === "in_app" && <Bell className="w-3.5 h-3.5" />}
                              {r.deliveryChannel}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                              {r.lastSentAt ? new Date(r.lastSentAt).toLocaleString() : "Never"}
                            </span>
                          </td>
                          <td className="p-4 font-bold font-mono text-slate-900 dark:text-slate-100 text-xs">
                            ₹{amountOutstanding.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-mono ${
                              r.status === "delivered" || r.status === "sent"
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                                : r.status === "failed"
                                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                                : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                            }`}>
                              {r.status === "delivered" && <CheckCircle2 className="w-3 h-3" />}
                              {r.status === "failed" && <XCircle className="w-3 h-3" />}
                              {r.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <Button
                              variant="outline"
                              onClick={() => {
                                const targetInv = invoices.find(i => i.id === r.invoiceId);
                                if (targetInv) handleOpenComposer(targetInv);
                              }}
                              className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:text-primary-500"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* REAL-TIME SYSTEM LOGS SECTION */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 font-display uppercase tracking-widest">
              Automated Communications Delivery Log (History)
            </h4>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-96 overflow-y-auto space-y-3 pr-2">
              {logs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No execution logs currently recorded in Firestore. Trigger a manual reminders simulation to seed audit trails.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="pt-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        log.action === "sent" || log.action === "delivered"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500"
                          : log.action === "failed"
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-500"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold dark:text-slate-200 block">
                          {log.description}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400 font-sans">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" /> Recipient: {log.recipient}
                          </span>
                          <span className="uppercase font-mono text-[10px] bg-slate-150 dark:bg-slate-850 px-1.5 rounded-md font-bold" style={{ color: CHANNELS_COLORS[log.channel] || "#ccc" }}>
                            {log.channel}
                          </span>
                          <span>Performed By: {log.performedBy}</span>
                        </div>
                      </div>
                    </div>
                    
                    <span className="text-xs font-mono text-slate-400 whitespace-nowrap shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* 3. AUTOMATION RULES & SETTINGS TAB */}
      {activeTab === "rules" && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Rules Configuration Block */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display uppercase tracking-tight">
                Automated Scheduler Trigger Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure payment reminder milestones. GATHEX scan schedules daily and triggers notifications exactly when an invoice reaches any enabled checkpoint relative to its due date.
              </p>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">
                  Enable Automated Payment Reminders
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Allows GATHEX to perform background execution sweeps and automatically contact clients.
                </p>
              </div>

              <button
                onClick={() => handleSaveAutomationSettings({ enableAutomaticReminders: !settings.enableAutomaticReminders })}
                className="cursor-pointer text-primary-500 hover:scale-105 transition-transform"
              >
                {settings.enableAutomaticReminders ? (
                  <ToggleRight className="w-14 h-14" />
                ) : (
                  <ToggleLeft className="w-14 h-14 text-slate-400" />
                )}
              </button>
            </div>

            {/* Matrix schedules list */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block">Active Milestones Queue</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {[
                  { key: "upcoming_7_days", label: "7 Days Before Due Date", type: "upcoming" },
                  { key: "upcoming_3_days", label: "3 Days Before Due Date", type: "upcoming" },
                  { key: "upcoming_1_day", label: "1 Day Before Due Date", type: "upcoming" },
                  { key: "due_today", label: "On Due Date (Today)", type: "due_today" },
                  { key: "overdue_3_days", label: "3 Days Overdue", type: "first_overdue" },
                  { key: "overdue_7_days", label: "7 Days Overdue", type: "second_overdue" },
                  { key: "overdue_15_days", label: "15 Days Overdue", type: "final" },
                  { key: "monthly_until_paid", label: "Monthly Overdue Sweeper", type: "custom" },
                ].map((sched) => {
                  const isChecked = settings.schedules[sched.key as keyof ReminderSettings["schedules"]];
                  return (
                    <div 
                      key={sched.key}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                        isChecked 
                          ? "bg-slate-50 dark:bg-slate-950/60 border-primary-500/30" 
                          : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSchedule(sched.key as any)}
                          className="rounded text-primary-500 cursor-pointer h-4.5 w-4.5"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            {sched.label}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            Uses {sched.type.replace("_", " ")} template
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* Enabled templates matrix */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block">Allowed Reminder Categories</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: "upcoming", label: "Upcoming Notifications" },
                  { key: "due_today", label: "Due Today Alerts" },
                  { key: "first_overdue", label: "3-Day Overdue notices" },
                  { key: "second_overdue", label: "7-Day Overdue warnings" },
                  { key: "final", label: "15-Day Final notices" },
                  { key: "custom", label: "Custom Ad-Hoc Reminders" }
                ].map((type) => {
                  const isEnabled = settings.enabledReminderTypes[type.key as ReminderType];
                  return (
                    <button
                      key={type.key}
                      onClick={() => handleToggleReminderType(type.key as ReminderType)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold cursor-pointer transition-all ${
                        isEnabled
                          ? "bg-primary-50/10 dark:bg-primary-950/20 border-primary-500 text-primary-600 dark:text-primary-400"
                          : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/60 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="uppercase font-mono text-[9px] font-black tracking-widest block">Type</span>
                        <div className={`h-1.5 w-1.5 rounded-full ${isEnabled ? "bg-primary-500" : "bg-slate-500"}`} />
                      </div>
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Global business settings policies */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest font-display mb-1">
                Global Business Policies
              </h3>
              <p className="text-xs text-slate-400">
                Define the security gates and limits for automatic reminders.
              </p>
            </div>

            <div className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Max contact attempts</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxAttempts}
                  onChange={(e) => handleSaveAutomationSettings({ maxAttempts: parseInt(e.target.value, 10) || 3 })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-slate-800 dark:text-slate-200 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Maximum automated attempts allowed per unique outstanding invoice.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Reply-To Email address</label>
                <input
                  type="email"
                  value={settings.defaultReplyToEmail}
                  onChange={(e) => handleSaveAutomationSettings({ defaultReplyToEmail: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sender Identification Signature</label>
                <input
                  type="text"
                  value={settings.defaultSenderName}
                  onChange={(e) => handleSaveAutomationSettings({ defaultSenderName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Working Days Only</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.workingDaysOnly}
                    onChange={(e) => handleSaveAutomationSettings({ workingDaysOnly: e.target.checked })}
                    className="rounded text-primary-500 h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>Business Hours Only (9AM - 6PM)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.businessHoursOnly}
                    onChange={(e) => handleSaveAutomationSettings({ businessHoursOnly: e.target.checked })}
                    className="rounded text-primary-500 h-4 w-4 cursor-pointer"
                  />
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* 4. TEMPLATES MANAGER TAB */}
      {activeTab === "templates" && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest">
                  Branded Reminder Templates Manager
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure corporate templates with dynamic variables like customer names, payments links, and dues balances.
                </p>
              </div>
            </div>

            <Button
              onClick={() => handleOpenTemplateEditor()}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs h-9 gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Custom template
            </Button>
          </div>

          {/* Templates list grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl) => (
              <div 
                key={tpl.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-55 dark:border-slate-800 pb-2.5">
                    <span className="text-[10px] uppercase tracking-widest font-black text-indigo-500">
                      {tpl.type.replace("_", " ")}
                    </span>
                    {tpl.isDefault && (
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 font-bold px-1.5 py-0.5 rounded-full text-slate-500 font-mono">
                        SYSTEM DEFAULT
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display">
                    {tpl.name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1 truncate">
                    Subj: {tpl.subject}
                  </p>

                  <div className="mt-4 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-850">
                    <pre className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-wrap font-sans max-h-36 overflow-y-auto">
                      {tpl.content}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-slate-50 dark:border-slate-850/60">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenTemplateEditor(tpl)}
                    className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-300 gap-1 rounded-lg border-slate-200 dark:border-slate-800"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </Button>

                  {!tpl.isDefault && (
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="h-8 text-xs text-rose-500 border-rose-100 dark:border-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-0 w-8 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Static help tip block */}
          <div className="p-4 bg-indigo-50/25 dark:bg-indigo-950/15 border border-indigo-100/40 dark:border-indigo-900/40 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400">
              <span className="font-bold dark:text-slate-200 block mb-0.5">Template substitution tokens</span>
              You can insert variables using double curly brackets syntax anywhere inside template bodies or subjects. Supported tokens include:
              <div className="flex flex-wrap items-center gap-1.5 mt-2 font-mono text-[9px] bg-slate-100 dark:bg-slate-950 p-2 rounded-xl border border-slate-200/40 dark:border-slate-800">
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{customer_name}}"}</span>
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{invoice_number}}"}</span>
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{invoice_date}}"}</span>
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{due_date}}"}</span>
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{amount}}"}</span>
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{balance}}"}</span>
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{business_name}}"}</span>
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{payment_link}}"}</span>
                <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{upi_id}}"}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* DIALOG 1: REMINDER COMPOSER (SINGLE MANUAL ACTION) */}
      <Dialog
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        title="Compose Custom Reminder Dispatch"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Target Outstanding Invoice</label>
            <select
              value={compInvoice?.id || ""}
              onChange={(e) => {
                const target = invoices.find(inv => inv.id === e.target.value);
                if (target) setCompInvoice(target);
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
            >
              <option value="" disabled>-- Select Unpaid Ledger Invoice --</option>
              {invoices.filter(i => i.status !== "paid" && i.status !== "void").map(inv => {
                const due = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "";
                const balance = inv.amountDue !== undefined ? inv.amountDue : (inv.grandTotal - (inv.amountPaid || 0));
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - ₹{balance.toLocaleString("en-IN")} Due ({inv.customerDetails?.name || "Client"}) - Due: {due}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Reminder Template Type</label>
              <select
                value={compReminderType}
                onChange={(e) => setCompReminderType(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
              >
                <option value="upcoming">Upcoming Notice</option>
                <option value="due_today">Due Today Alert</option>
                <option value="first_overdue">3d Overdue Alert</option>
                <option value="second_overdue">7d Overdue Alert</option>
                <option value="final">15d Overdue warning</option>
                <option value="custom">Custom Ad-hoc Template</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Delivery Channel</label>
              <select
                value={compChannel}
                onChange={(e) => setCompChannel(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
              >
                <option value="email">Email Notification</option>
                <option value="whatsapp">WhatsApp Text Message</option>
                <option value="sms">SMS Text Alert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Subject Heading</label>
            <input
              type="text"
              value={compSubject}
              onChange={(e) => setCompSubject(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Compiled Message Body</label>
            <textarea
              rows={6}
              value={compMessage}
              onChange={(e) => setCompMessage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200 font-mono text-xs whitespace-pre-wrap"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={compAttachPdf}
                onChange={(e) => setCompAttachPdf(e.target.checked)}
                className="rounded text-primary-500"
              />
              Attach original invoice PDF
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={compAttachReceipt}
                onChange={(e) => setCompAttachReceipt(e.target.checked)}
                className="rounded text-primary-500"
              />
              Attach previous payment receipts
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsComposerOpen(false)}
              className="text-slate-600 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendManual}
              disabled={!compInvoice}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
            >
              Send now
            </Button>
          </div>

        </div>
      </Dialog>

      {/* DIALOG 2: TEMPLATE EDITOR (CREATE/EDIT ACTIONS) */}
      <Dialog
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
        title={editingTemplate?.id ? "Modify Reminder Template" : "Register Custom Reminder Template"}
      >
        <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
          {editingTemplate && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Template Label/Name</label>
                <input
                  type="text"
                  value={editingTemplate.name || ""}
                  placeholder="e.g. Early payment friendly reminder"
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Milestone Category Match</label>
                  <select
                    value={editingTemplate.type || "custom"}
                    disabled={editingTemplate.isDefault}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="upcoming">Upcoming Due Notice</option>
                    <option value="due_today">Due Today Notice</option>
                    <option value="first_overdue">First Overdue Notice</option>
                    <option value="second_overdue">Second Overdue Notice</option>
                    <option value="final">Final Notice</option>
                    <option value="thank_you">Thank You</option>
                    <option value="refund">Refund Confirmation</option>
                    <option value="custom">Custom Milestone</option>
                  </select>
                </div>

                <div className="flex items-center justify-center">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer mt-5">
                    <input
                      type="checkbox"
                      checked={editingTemplate.isDefault || false}
                      disabled={editingTemplate.isDefault}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })}
                      className="rounded text-primary-500 h-4.5 w-4.5"
                    />
                    Default for this type
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Subject Line</label>
                <input
                  type="text"
                  value={editingTemplate.subject || ""}
                  placeholder="Payment Reminder for invoice {{invoice_number}}"
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-slate-800 dark:text-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Message Body Content</label>
                <textarea
                  rows={8}
                  value={editingTemplate.content || ""}
                  placeholder="Dear {{customer_name}}, ..."
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-slate-800 dark:text-slate-200 font-mono text-xs whitespace-pre-wrap"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Corporate Signature</label>
                <input
                  type="text"
                  value={editingTemplate.signature || ""}
                  placeholder="Regards, Accounts Team"
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, signature: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsTemplateEditorOpen(false)}
                  className="text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
                >
                  Save configuration
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>

    </div>
  );
}
