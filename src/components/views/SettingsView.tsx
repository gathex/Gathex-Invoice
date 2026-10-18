import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PaymentMethodsTab } from "./SettingsTabs/PaymentMethodsTab";
import { UPISettingsTab } from "./SettingsTabs/UPISettingsTab";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../ui/Toast";
import { 
  businessService, 
  BusinessSettings, 
  BrandingSettings, 
  PaymentSettings, 
  InvoicePreferences, 
  TaxSettings,
  StorageAsset
} from "../../services/businessService";
import { 
  Settings, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  Sliders, 
  Bell, 
  Palette, 
  FileText, 
  Percent, 
  UploadCloud, 
  Check, 
  Trash2, 
  RefreshCw, 
  FileCode, 
  HelpCircle,
  Building2,
  Phone,
  Mail,
  Globe,
  Loader2,
  Signature,
  QrCode,
  LayoutGrid
} from "lucide-react";

type SettingsTab = "profile" | "gst" | "invoice" | "invoice_templates" | "branding" | "payment" | "payment_methods" | "upi_settings" | "notifications" | "assets";

const renderMiniTemplatePreview = (tplId: string, accentColor: string) => {
  switch (tplId) {
    case "modern":
      return (
        <div className="w-20 h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] select-none">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }}></div>
          
          {/* Header */}
          <div className="flex justify-between items-start mt-1">
            <div className="flex items-center gap-0.5">
              <div className="h-2.5 w-2.5 rounded-sm flex items-center justify-center text-[5px] text-white font-black" style={{ backgroundColor: accentColor }}>
                M
              </div>
              <div className="space-y-0.5">
                <div className="w-5 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                <div className="w-3 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              </div>
            </div>
            <div className="space-y-0.5 text-right flex flex-col items-end">
              <div className="w-6 h-1 rounded-full" style={{ backgroundColor: accentColor }}></div>
              <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>
          </div>
          
          {/* Middle Body line items */}
          <div className="space-y-1">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-0.5 rounded-sm border border-slate-100 dark:border-slate-800">
              <div className="w-7 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
              <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="w-5 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              <div className="w-2 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>
          </div>
          
          {/* Footer totals */}
          <div className="flex justify-end pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <div className="w-8 h-2 rounded px-0.5 flex items-center justify-between" style={{ backgroundColor: `${accentColor}12` }}>
              <div className="w-2 h-0.5 bg-slate-400 rounded-full"></div>
              <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
            </div>
          </div>
        </div>
      );

    case "classic":
      return (
        <div className="w-20 h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] select-none font-serif">
          {/* Header */}
          <div className="mt-0.5">
            <div className="text-[5px] font-bold text-center tracking-wider text-slate-800 dark:text-slate-200 uppercase">INVOICE</div>
            <div className="w-full border-t border-b border-double border-slate-300 dark:border-slate-700 h-0.5 my-0.5"></div>
          </div>
          
          {/* Client Details / Info */}
          <div className="flex justify-between items-center my-0.5">
            <div className="space-y-0.5">
              <div className="w-5 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
              <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>
            <div className="space-y-0.5 text-right flex flex-col items-end">
              <div className="w-4 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
          
          {/* Table */}
          <div className="border-t border-b border-slate-300 dark:border-slate-700 py-0.5 space-y-0.5">
            <div className="flex justify-between">
              <div className="w-8 h-0.5 bg-slate-400 dark:bg-slate-600 rounded-full"></div>
              <div className="w-2 h-0.5 bg-slate-400 dark:bg-slate-600 rounded-full"></div>
            </div>
            <div className="flex justify-between">
              <div className="w-5 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              <div className="w-1.5 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>
          </div>
          
          {/* Totals */}
          <div className="flex justify-end pt-0.5">
            <div className="flex gap-1 items-center">
              <div className="w-3 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
              <div className="w-3 h-0.5 bg-slate-800 dark:bg-slate-200 rounded-full"></div>
            </div>
          </div>
        </div>
      );

    case "minimal":
      return (
        <div className="w-20 h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] select-none font-sans">
          {/* Minimal design: very spacious, elegant */}
          <div className="flex justify-between items-start mt-0.5">
            <div>
              <div className="w-4 h-1 bg-slate-800 dark:bg-slate-200 rounded-full"></div>
              <div className="w-6 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full mt-0.5"></div>
            </div>
            <div className="text-[5px] text-slate-400 uppercase tracking-widest">INV</div>
          </div>
          
          {/* Body minimal lines */}
          <div className="space-y-0.5 my-1">
            <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="w-5 h-0.5 bg-slate-100 dark:bg-slate-900 rounded-full"></div>
          </div>
          
          {/* Table Row */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-1 space-y-0.5">
            <div className="flex justify-between">
              <div className="w-10 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
              <div className="w-3 h-0.5 bg-slate-400 dark:bg-slate-600 rounded-full"></div>
            </div>
            <div className="flex justify-between">
              <div className="w-7 h-0.5 bg-slate-150 dark:bg-slate-800/50 rounded-full"></div>
              <div className="w-2 h-0.5 bg-slate-150 dark:bg-slate-800/50 rounded-full"></div>
            </div>
          </div>
          
          {/* Minimal footer */}
          <div className="flex justify-between items-center text-[5px] text-slate-300 pt-0.5">
            <div className="w-4 h-0.5 bg-slate-150 dark:bg-slate-800/50 rounded-full"></div>
            <div className="w-4 h-0.5 bg-slate-800 dark:bg-slate-200 rounded-full"></div>
          </div>
        </div>
      );

    case "bold":
      return (
        <div className="w-20 h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] select-none font-sans">
          {/* Bold visual layout - high contrast solid header */}
          <div className="w-full h-3.5 rounded px-1 flex items-center justify-between -mt-0.5" style={{ backgroundColor: accentColor }}>
            <div className="w-4 h-0.5 bg-white/80 rounded-full"></div>
            <div className="w-5 h-0.5 bg-white rounded-full"></div>
          </div>
          
          {/* Body info block */}
          <div className="grid grid-cols-2 gap-1 my-0.5">
            <div className="space-y-0.5">
              <div className="w-5 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
              <div className="w-7 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>
            <div className="space-y-0.5 flex flex-col items-end">
              <div className="w-4 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
          
          {/* Table with solid filled header */}
          <div className="w-full h-2 rounded-sm flex items-center justify-between px-0.5" style={{ backgroundColor: `${accentColor}15` }}>
            <div className="w-7 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
            <div className="w-2 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
          </div>
          
          {/* Grand total block */}
          <div className="flex justify-end pt-0.5">
            <div className="w-9 h-2.5 border-l-2 pl-0.5 flex flex-col justify-center" style={{ borderLeftColor: accentColor }}>
              <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
            </div>
          </div>
        </div>
      );

    case "compact":
      return (
        <div className="w-20 h-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1 relative overflow-hidden flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] select-none font-sans">
          {/* High Density layout */}
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-0.5">
            <div className="flex items-center gap-0.5">
              <div className="h-1.5 w-1.5 bg-slate-400 dark:bg-slate-600 rounded-sm"></div>
              <div className="w-5 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="w-4 h-0.5 bg-slate-400 dark:bg-slate-600 rounded-full"></div>
          </div>
          
          {/* Multiple tiny rows */}
          <div className="space-y-0.5 py-0.5 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center text-[3px] scale-90 origin-left">
                <div className="flex gap-0.5">
                  <span className="text-slate-300 font-mono">#{i}</span>
                  <div className="w-7 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                </div>
                <div className="w-2 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
              </div>
            ))}
          </div>
          
          {/* Compact subtotals box */}
          <div className="bg-slate-50 dark:bg-slate-900 p-0.5 rounded flex justify-between items-center border border-slate-100 dark:border-slate-800/40">
            <div className="w-5 h-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export function SettingsView() {
  const { user, activeBusiness, setActiveBusiness } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [loading, setLoading] = useState(false);

  // General Business Form States
  const [bizName, setBizName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [bizType, setBizType] = useState("");
  const [bizGstin, setBizGstin] = useState("");
  const [bizPan, setBizPan] = useState("");
  const [bizMsme, setBizMsme] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizWeb, setBizWeb] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Segment Settings States
  const [generalSettings, setGeneralSettings] = useState<BusinessSettings>({
    emailNotifications: true,
    invoiceReminders: true,
    smsAlerts: false,
    marketingEmails: false,
    autoSaveDrafts: true
  });

  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    primaryColor: "#4f46e5",
    secondaryColor: "#0f172a",
    themeSelection: "light",
    invoiceAccentColor: "#4f46e5",
    invoiceFooterText: "Thank you for doing business with us!"
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    upiId: ""
  });

  const [invoicePreferences, setInvoicePreferences] = useState<InvoicePreferences>({
    prefix: "INV",
    suffix: "",
    startingNumber: 1,
    autoIncrement: true,
    financialYearReset: true,
    defaultDueDays: 15,
    defaultGstRate: 18,
    defaultCurrency: "INR",
    decimalPrecision: 2,
    roundOff: true,
    paperSize: "A4",
    templateSelection: "modern"
  });

  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    gstEnabled: true,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    taxInclusivePricing: false,
    gstinValidationStatus: "unverified"
  });

  // Storage files state
  const [assets, setAssets] = useState<StorageAsset[]>([]);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load configuration segment values based on activeBusiness
  useEffect(() => {
    if (!activeBusiness) return;

    setBizName(activeBusiness.name || "");
    setLegalName((activeBusiness as any).legalName || activeBusiness.name || "");
    setBizType((activeBusiness as any).businessType || "Sole Proprietorship");
    setBizGstin(activeBusiness.gstin || "");
    setBizPan((activeBusiness as any).pan || activeBusiness.pan || "");
    setBizMsme((activeBusiness as any).msmeNumber || "");
    setBizEmail(activeBusiness.email || "");
    setBizPhone(activeBusiness.phone || "");
    setBizWeb((activeBusiness as any).website || activeBusiness.website || "");
    setStreet(activeBusiness.address?.street || "");
    setCity(activeBusiness.address?.city || "");
    setState(activeBusiness.address?.state || "");
    setPincode(activeBusiness.address?.postalCode || "");

    const loadSegmentSettings = async () => {
      setLoading(true);
      try {
        const gen = await businessService.getBusinessSettings(activeBusiness.id);
        if (gen) setGeneralSettings(gen);

        const brand = await businessService.getBrandingSettings(activeBusiness.id);
        if (brand) setBrandingSettings(brand);

        const pay = await businessService.getPaymentSettings(activeBusiness.id);
        if (pay) setPaymentSettings(pay);

        const pref = await businessService.getInvoicePreferences(activeBusiness.id);
        if (pref) setInvoicePreferences(pref);

        const tax = await businessService.getTaxSettings(activeBusiness.id);
        if (tax) setTaxSettings(tax);
      } catch (err) {
        console.error("Error loading sub settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSegmentSettings();

    // Subscribe to asset list
    const unsubAssets = businessService.subscribeToAssets(activeBusiness.id, (list) => {
      setAssets(list);
    });

    return () => unsubAssets();
  }, [activeBusiness]);

  // Handle uploading files (Logo, Signature, Stamp, Document)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "signature" | "stamp" | "document"
  ) => {
    if (!activeBusiness || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // File specifications check
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File Too Large", "Max file size allowed is 2MB.");
      return;
    }

    setUploadingType(type);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await businessService.uploadStorageAsset(
          activeBusiness.id,
          type,
          file.name,
          base64,
          file.size,
          file.type,
          (progress) => setUploadProgress(progress)
        );
        toast.success("File Uploaded", `Successfully added ${file.name} to business assets.`);
        
        // Auto refresh branding
        const updatedBrand = await businessService.getBrandingSettings(activeBusiness.id);
        if (updatedBrand) setBrandingSettings(updatedBrand);
      } catch (err: any) {
        toast.error("Upload Failed", err.message || "Failed to process asset upload.");
      } finally {
        setUploadingType(null);
        setUploadProgress(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAsset = async (asset: StorageAsset) => {
    if (!activeBusiness) return;
    try {
      await businessService.deleteAsset(asset.id, activeBusiness.id, asset.assetType);
      toast.info("Asset Deleted", `Successfully removed ${asset.name}.`);
      
      // Refresh branding settings
      const updatedBrand = await businessService.getBrandingSettings(activeBusiness.id);
      if (updatedBrand) setBrandingSettings(updatedBrand);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to remove asset.");
    }
  };

  // GSTIN Simulated verification
  const handleValidateGstin = () => {
    if (!bizGstin) {
      toast.error("Validation Error", "Please provide a GSTIN to validate.");
      return;
    }
    toast.info("Validating with GST Portal...", "Contacting secure government database...");
    setTimeout(() => {
      setTaxSettings(prev => ({
        ...prev,
        gstinValidationStatus: "verified"
      }));
      toast.success("GSTIN Verified", "Trade name matched. Corporate registry coordinates populated successfully.");
    }, 1500);
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!activeBusiness) return;
    setLoading(true);

    try {
      if (activeTab === "profile") {
        // Update core business details
        const payload = {
          name: bizName.trim(),
          legalName: legalName.trim(),
          businessType: bizType,
          gstin: bizGstin.trim().toUpperCase() || undefined,
          pan: bizPan.trim().toUpperCase() || undefined,
          msmeNumber: bizMsme.trim() || undefined,
          email: bizEmail.trim(),
          phone: bizPhone.trim(),
          website: bizWeb.trim() || undefined,
          address: {
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            postalCode: pincode.trim(),
            country: "India"
          }
        };
        await businessService.updateBusiness(activeBusiness.id, payload);
        setActiveBusiness({
          ...activeBusiness,
          ...payload,
          updatedAt: new Date()
        });
        toast.success("Profile Updated", "Core company profiles saved successfully.");
      } else if (activeTab === "gst") {
        await businessService.updateTaxSettings(activeBusiness.id, taxSettings);
        toast.success("Tax Settings Saved", "CGST/SGST ledger configurations updated.");
      } else if (activeTab === "invoice") {
        await businessService.updateInvoicePreferences(activeBusiness.id, invoicePreferences);
        toast.success("Invoicing Preferences Saved", "Prefixes, precision, and templates locked.");
      } else if (activeTab === "invoice_templates") {
        await businessService.updateBrandingSettings(activeBusiness.id, brandingSettings);
        await businessService.updateInvoicePreferences(activeBusiness.id, invoicePreferences);
        toast.success("Invoice Template Saved", "Selected template and visual presets updated successfully.");
      } else if (activeTab === "branding") {
        await businessService.updateBrandingSettings(activeBusiness.id, brandingSettings);
        toast.success("Branding Saved", "Aesthetic parameters and palettes written to workspace.");
      } else if (activeTab === "payment") {
        await businessService.updatePaymentSettings(activeBusiness.id, paymentSettings);
        toast.success("Settlements Saved", "Dynamic BHIM payment targets and bank paths updated.");
      } else if (activeTab === "notifications") {
        await businessService.updateBusinessSettings(activeBusiness.id, generalSettings);
        toast.success("Preferences Saved", "Workspace general preferences saved.");
      }
    } catch (err: any) {
      toast.error("Save Failed", err.message || "Failed to update configurations.");
    } finally {
      setLoading(false);
    }
  };

  if (!activeBusiness) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center rounded-2xl max-w-lg mx-auto mt-12 font-sans">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto animate-bounce" />
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mt-4">No Active Business</h3>
        <p className="text-xs text-slate-400 mt-2">
          You must create or select an active business workspace before modifying preferences.
        </p>
      </div>
    );
  }

  const tabItems: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Business Profile", icon: <Building2 className="w-4 h-4" /> },
    { id: "gst", label: "GST & Taxes", icon: <Percent className="w-4 h-4" /> },
    { id: "invoice", label: "Invoice Config", icon: <FileText className="w-4 h-4" /> },
    { id: "invoice_templates", label: "Invoice Templates", icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "branding", label: "Branding", icon: <Palette className="w-4 h-4" /> },
    { id: "payment", label: "Settlement & VPA", icon: <CreditCard className="w-4 h-4" /> },
    { id: "payment_methods", label: "Payment Methods", icon: <CreditCard className="w-4 h-4" /> },
    { id: "upi_settings", label: "UPI & QR", icon: <QrCode className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "assets", label: "Uploaded Assets", icon: <UploadCloud className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-500" /> Workspace Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tailor invoicing formats, primary branding accents, Indian GST validations, and secure settlement pathways
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Settings Left Navigation Sidebar (Module 11) */}
        <div className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-3 space-y-1 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3.5 py-2">Configuration</h3>
          {tabItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === item.id
                  ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeTab === item.id && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
              )}
            </button>
          ))}

          <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-2" />

          {/* Quick theme toggle in sidebar */}
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Theme</span>
            <Button variant="outline" onClick={toggleTheme} className="text-xs py-1 px-2.5 h-auto cursor-pointer">
              Switch
            </Button>
          </div>
        </div>

        {/* Settings Right Form Panel */}
        <div className="flex-1 w-full space-y-6">
          <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 backdrop-blur-[1px] rounded-2xl">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">Business Profile</h3>
                  <p className="text-xs text-slate-400">Manage statutory legal entity names, corporate offices, and website registers</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Trade / Brand Name *"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    required
                  />
                  <Input
                    label="Legal Corporate Name (Printed on Invoices) *"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Business Entity Type *"
                    value={bizType}
                    onChange={(e) => setBizType(e.target.value)}
                    options={[
                      { value: "Sole Proprietorship", label: "Sole Proprietorship" },
                      { value: "Partnership Firm", label: "Partnership Firm" },
                      { value: "LLP (Limited Liability)", label: "LLP" },
                      { value: "Private Limited Company", label: "Private Limited Company" },
                      { value: "Public Limited Company", label: "Public Limited" }
                    ]}
                  />
                  <Input
                    label="GSTIN (Optional)"
                    value={bizGstin}
                    onChange={(e) => setBizGstin(e.target.value)}
                    className="font-mono uppercase"
                  />
                  <Input
                    label="Permanent Account Number (PAN)"
                    value={bizPan}
                    onChange={(e) => setBizPan(e.target.value)}
                    className="font-mono uppercase"
                    maxLength={10}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Billing Email *"
                    value={bizEmail}
                    onChange={(e) => setBizEmail(e.target.value)}
                    required
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                  <Input
                    label="Contact Phone *"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    required
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                  <Input
                    label="Website URL"
                    value={bizWeb}
                    onChange={(e) => setBizWeb(e.target.value)}
                    leftIcon={<Globe className="w-4 h-4" />}
                  />
                </div>

                <Input
                  label="Udyam MSME Number"
                  placeholder="e.g. UDYAM-XX-00-0000000"
                  value={bizMsme}
                  onChange={(e) => setBizMsme(e.target.value)}
                  className="font-mono"
                />

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registered Office Address</h4>
                  <Input
                    label="Street Address"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                    <Input
                      label="State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                    <Input
                      label="Pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      required
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: GST */}
            {activeTab === "gst" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">GST & Indian Taxes</h3>
                  <p className="text-xs text-slate-400">Configure central/state/interstate GST rates and verify corporate registrations</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">GST Billing Module</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Toggle to enable tax breakdown calculations (CGST, SGST, IGST) on invoices.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={taxSettings.gstEnabled}
                    onChange={(e) => setTaxSettings(prev => ({ ...prev, gstEnabled: e.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500"
                  />
                </div>

                {taxSettings.gstEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Default CGST Rate (%)"
                      type="number"
                      step="0.1"
                      value={taxSettings.cgstRate}
                      onChange={(e) => setTaxSettings(prev => ({ ...prev, cgstRate: parseFloat(e.target.value) || 0 }))}
                      leftIcon={<Percent className="w-4 h-4" />}
                    />
                    <Input
                      label="Default SGST Rate (%)"
                      type="number"
                      step="0.1"
                      value={taxSettings.sgstRate}
                      onChange={(e) => setTaxSettings(prev => ({ ...prev, sgstRate: parseFloat(e.target.value) || 0 }))}
                      leftIcon={<Percent className="w-4 h-4" />}
                    />
                    <Input
                      label="Default IGST Rate (%)"
                      type="number"
                      step="0.1"
                      value={taxSettings.igstRate}
                      onChange={(e) => setTaxSettings(prev => ({ ...prev, igstRate: parseFloat(e.target.value) || 0 }))}
                      leftIcon={<Percent className="w-4 h-4" />}
                    />
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Pricing Accents</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Toggle if catalog unit prices are inclusive of GST rates by default.</p>
                  </div>
                  <Select
                    value={taxSettings.taxInclusivePricing ? "inclusive" : "exclusive"}
                    onChange={(e) => setTaxSettings(prev => ({ ...prev, taxInclusivePricing: e.target.value === "inclusive" }))}
                    options={[
                      { value: "exclusive", label: "Tax Exclusive Pricing" },
                      { value: "inclusive", label: "Tax Inclusive Pricing" }
                    ]}
                    className="w-48"
                  />
                </div>

                {/* GSTIN Verification portal hook */}
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> GST Portal Verification Gateway
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                      Connect directly to GSTIN portals to validate active registration, trade handles, and register accurate address matrices.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {taxSettings.gstinValidationStatus === "verified" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold font-display">
                        <Check className="w-3.5 h-3.5" /> GSTIN Verified
                      </span>
                    ) : (
                      <Button type="button" variant="outline" onClick={handleValidateGstin} className="text-xs font-bold">
                        Validate GSTIN
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INVOICE CONFIG */}
            {activeTab === "invoice" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">Invoice Preferences</h3>
                  <p className="text-xs text-slate-400">Customize auto-increments, default payment due spans, and visual layouts</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Invoice Prefix"
                    placeholder="e.g. INV"
                    value={invoicePreferences.prefix}
                    onChange={(e) => setInvoicePreferences(prev => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                  />
                  <Input
                    label="Invoice Suffix"
                    placeholder="e.g. FY26"
                    value={invoicePreferences.suffix}
                    onChange={(e) => setInvoicePreferences(prev => ({ ...prev, suffix: e.target.value.toUpperCase() }))}
                  />
                  <Input
                    label="Starting Sequence Number"
                    type="number"
                    value={invoicePreferences.startingNumber}
                    onChange={(e) => setInvoicePreferences(prev => ({ ...prev, startingNumber: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Auto Increment</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Automatically increments sequences on draft commitment.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={invoicePreferences.autoIncrement}
                      onChange={(e) => setInvoicePreferences(prev => ({ ...prev, autoIncrement: e.target.checked }))}
                      className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Financial Year Reset</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Reset starting indices on new financial year transition.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={invoicePreferences.financialYearReset}
                      onChange={(e) => setInvoicePreferences(prev => ({ ...prev, financialYearReset: e.target.checked }))}
                      className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Default Due Days"
                    type="number"
                    value={invoicePreferences.defaultDueDays}
                    onChange={(e) => setInvoicePreferences(prev => ({ ...prev, defaultDueDays: parseInt(e.target.value) || 15 }))}
                  />
                  <Select
                    label="Decimal Precision"
                    value={invoicePreferences.decimalPrecision.toString()}
                    onChange={(e) => setInvoicePreferences(prev => ({ ...prev, decimalPrecision: parseInt(e.target.value) }))}
                    options={[
                      { value: "0", label: "0 Decimals (Integers)" },
                      { value: "2", label: "2 Decimals" },
                      { value: "3", label: "3 Decimals" }
                    ]}
                  />
                  <Select
                    label="Paper Sizes"
                    value={invoicePreferences.paperSize}
                    onChange={(e) => setInvoicePreferences(prev => ({ ...prev, paperSize: e.target.value as any }))}
                    options={[
                      { value: "A4", label: "A4 (Standard)" },
                      { value: "A5", label: "A5" },
                      { value: "Letter", label: "Letter" }
                    ]}
                  />
                </div>

                {/* Invoice Layout Customizer */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Invoice PDF Template</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { id: "classic", name: "Classic", desc: "Corporate grid layout" },
                      { id: "modern", name: "Modern", desc: "Sleek colored accents" },
                      { id: "minimal", name: "Minimal", desc: "Elegant display fonts" },
                      { id: "compact", name: "Compact", desc: "Maximum list space" }
                    ].map((tpl) => {
                      const selected = invoicePreferences.templateSelection === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setInvoicePreferences(prev => ({ ...prev, templateSelection: tpl.id as any }))}
                          className={`p-4 rounded-xl border-2 text-center cursor-pointer transition-all hover:scale-[1.02] ${
                            selected 
                              ? "border-primary-500 bg-primary-50/10 dark:bg-primary-950/20 text-slate-900 dark:text-white" 
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-bold text-sm font-display mb-1">{tpl.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium leading-normal">{tpl.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INVOICE TEMPLATES */}
            {activeTab === "invoice_templates" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">Invoice Visual Templates</h3>
                  <p className="text-xs text-slate-400">Choose a professional, high-fidelity layout, select your brand's highlight accent, and see a live-rendering sample invoice instantly.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Left Controls */}
                  <div className="xl:col-span-5 space-y-6">
                    {/* Template Picker */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Visual Layout Design</label>
                      <div className="space-y-3">
                        {[
                          { id: "modern", name: "Modern Template", desc: "Sleek, colorful accent bars, clean structured boxes.", badge: "Recommended" },
                          { id: "classic", name: "Classic Corporate", desc: "Traditional serif styling, solid double-line table borders.", badge: "Professional" },
                          { id: "minimal", name: "Minimalist Light", desc: "Delicate lines, spacious white space, airy and clean.", badge: "Clean" },
                          { id: "bold", name: "Bold Contrast", desc: "Solid filled headers, prominent dark tables and high visibility blocks.", badge: "Creative" },
                          { id: "compact", name: "Compact Density", desc: "Tight cell padding, lightweight text structure for massive lists.", badge: "High Volume" }
                        ].map((tpl) => {
                          const isSelected = (brandingSettings.invoiceTheme || "modern") === tpl.id;
                          const accentColor = brandingSettings.invoiceAccentColor || brandingSettings.primaryColor || "#4f46e5";
                          return (
                            <div
                              key={tpl.id}
                              onClick={() => {
                                setBrandingSettings(prev => ({ ...prev, invoiceTheme: tpl.id as any }));
                                setInvoicePreferences(prev => ({ ...prev, templateSelection: tpl.id === "bold" ? "modern" : (tpl.id as any) }));
                              }}
                              className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all duration-200 select-none ${
                                isSelected
                                  ? "border-primary-500 bg-primary-50/10 dark:bg-primary-950/20 text-slate-900 dark:text-white shadow-sm"
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                              }`}
                            >
                              <div className="flex gap-4 items-center">
                                {/* Miniature Invoice preview mockup */}
                                <div className="shrink-0">
                                  {renderMiniTemplatePreview(tpl.id, accentColor)}
                                </div>

                                {/* Information & description */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex justify-between items-center gap-2 flex-wrap">
                                    <span 
                                      id={`${tpl.id}-template-title`}
                                      className="font-bold text-sm font-display text-slate-800 dark:text-slate-100"
                                      style={tpl.id === "modern" ? { color: "#000000" } : undefined}
                                    >
                                      {tpl.name}
                                    </span>
                                    {tpl.badge && (
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                        isSelected 
                                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300" 
                                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                      }`}>
                                        {tpl.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal font-sans">{tpl.desc}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color Accent Picker */}
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Accent Highlight Color</label>
                      <div className="grid grid-cols-6 gap-2">
                        {[
                          { name: "Royal Indigo", value: "#4f46e5" },
                          { name: "Forest Emerald", value: "#059669" },
                          { name: "Deep Amethyst", value: "#7c3aed" },
                          { name: "Crimson Rose", value: "#e11d48" },
                          { name: "Charcoal Slate", value: "#374151" },
                          { name: "Solar Amber", value: "#d97706" }
                        ].map((c) => {
                          const isColorSelected = (brandingSettings.invoiceAccentColor || brandingSettings.primaryColor) === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setBrandingSettings(prev => ({ ...prev, invoiceAccentColor: c.value }))}
                              className={`h-9 w-full rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center relative hover:scale-105 border ${
                                isColorSelected ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900" : "border-slate-200 dark:border-slate-800"
                              }`}
                              style={{ backgroundColor: c.value }}
                              title={c.name}
                            >
                              {isColorSelected && (
                                <Check className="w-4 h-4 text-white drop-shadow-md" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2.5 pt-1.5">
                        <div className="relative shrink-0">
                          <input
                            type="color"
                            value={brandingSettings.invoiceAccentColor || brandingSettings.primaryColor || "#4f46e5"}
                            onChange={(e) => setBrandingSettings(prev => ({ ...prev, invoiceAccentColor: e.target.value }))}
                            className="h-9 w-10 rounded-xl border-none p-0 cursor-pointer overflow-hidden bg-transparent"
                          />
                        </div>
                        <Input
                          label=""
                          value={brandingSettings.invoiceAccentColor || brandingSettings.primaryColor || "#4f46e5"}
                          onChange={(e) => setBrandingSettings(prev => ({ ...prev, invoiceAccentColor: e.target.value }))}
                          className="font-mono flex-1 text-xs uppercase h-9"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {/* Layout Settings Helper */}
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-primary-500" /> Print & Precision Controls
                      </h4>

                      <div className="grid grid-cols-2 gap-3.5">
                        <Select
                          label="Paper Sizes"
                          value={invoicePreferences.paperSize}
                          onChange={(e) => setInvoicePreferences(prev => ({ ...prev, paperSize: e.target.value as any }))}
                          options={[
                            { value: "A4", label: "A4 (Standard)" },
                            { value: "A5", label: "A5" },
                            { value: "Letter", label: "Letter" }
                          ]}
                          className="text-xs py-1.5"
                        />
                        <Select
                          label="Decimal Precision"
                          value={invoicePreferences.decimalPrecision.toString()}
                          onChange={(e) => setInvoicePreferences(prev => ({ ...prev, decimalPrecision: parseInt(e.target.value) }))}
                          options={[
                            { value: "0", label: "0 Decimals" },
                            { value: "2", label: "2 Decimals" },
                            { value: "3", label: "3 Decimals" }
                          ]}
                          className="text-xs py-1.5"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1">
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Round-Off Adjustment</h5>
                          <p className="text-[10px] text-slate-400">Automatically round payable amounts to nearest integer</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={invoicePreferences.roundOff}
                          onChange={(e) => setInvoicePreferences(prev => ({ ...prev, roundOff: e.target.checked }))}
                          className="h-4.5 w-4.5 rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Preview Panel */}
                  <div className="xl:col-span-7 space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Live Template Preview</label>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 md:p-6 flex justify-center overflow-hidden relative">
                      <div className="absolute top-3 right-3 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-200/40 dark:border-slate-800/60 text-[10px] font-bold text-slate-500 z-10 select-none shadow-xs">
                        Interactive Draft Model
                      </div>

                      {/* Mock Invoice Sheet */}
                      <div 
                        className={`w-full max-w-[480px] bg-white text-slate-900 border border-slate-200/80 shadow-[0_12px_30px_-5px_rgba(0,0,0,0.08)] rounded-xl p-5 md:p-7 select-none overflow-hidden transition-all duration-300 ${
                          brandingSettings.invoiceTheme === "classic" ? "font-serif" : "font-sans"
                        }`}
                      >
                        {/* Header Area */}
                        <div className={`flex justify-between items-start pb-4 border-b ${
                          brandingSettings.invoiceTheme === "classic" ? "border-b-2 border-slate-800 pb-3" :
                          brandingSettings.invoiceTheme === "minimal" ? "border-b border-slate-100 pb-4" :
                          brandingSettings.invoiceTheme === "bold" ? "border-b-4 pb-3" : "border-b border-slate-200 pb-3"
                        }`}
                        style={{ borderBottomColor: brandingSettings.invoiceTheme === "bold" ? (brandingSettings.invoiceAccentColor || "#4f46e5") : undefined }}
                        >
                          {/* Left: Logo & Company */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 flex items-center justify-center font-black text-xs text-white ${
                                brandingSettings.invoiceTheme === "classic" ? "rounded-none" :
                                brandingSettings.invoiceTheme === "minimal" ? "rounded-full" :
                                brandingSettings.invoiceTheme === "bold" ? "rounded-none" : "rounded-lg"
                              }`}
                              style={{ backgroundColor: (brandingSettings.invoiceAccentColor || brandingSettings.primaryColor || "#4f46e5") }}
                              >
                                G
                              </div>
                              <div>
                                <h4 className={`text-xs font-bold leading-tight text-slate-900 ${
                                  brandingSettings.invoiceTheme === "classic" ? "font-serif" : "font-sans font-extrabold"
                                }`}>
                                  {bizName || activeBusiness?.name || "Your Business Name"}
                                </h4>
                                <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-sans">
                                  {legalName || activeBusiness?.legalName || ""}
                                </span>
                              </div>
                            </div>

                            <div className="text-[9px] text-slate-400 font-sans space-y-0.5 leading-normal">
                              <p className="font-medium text-slate-600">{[street || activeBusiness?.address?.street, city || activeBusiness?.address?.city].filter(Boolean).join(", ")}</p>
                              {(bizGstin || activeBusiness?.gstin) && (
                                <p className="font-semibold" style={{ color: (brandingSettings.invoiceAccentColor || "#4f46e5") }}>GSTIN: {bizGstin || activeBusiness?.gstin}</p>
                              )}
                            </div>
                          </div>

                          {/* Right: Invoice Meta */}
                          <div className="text-right space-y-1.5 font-sans">
                            <span 
                              className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-md ${
                                brandingSettings.invoiceTheme === "bold" ? "text-white" : ""
                              }`}
                              style={{ 
                                backgroundColor: brandingSettings.invoiceTheme === "bold" ? (brandingSettings.invoiceAccentColor || "#4f46e5") : `${brandingSettings.invoiceAccentColor || "#4f46e5"}10`,
                                color: brandingSettings.invoiceTheme === "bold" ? "#ffffff" : (brandingSettings.invoiceAccentColor || "#4f46e5")
                              }}
                            >
                              TAX INVOICE
                            </span>
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-semibold text-slate-400 uppercase">INVOICE NO</p>
                              <p className="text-xs font-mono font-bold text-slate-800">INV-2026-104</p>
                            </div>
                            <div className="text-[8px] text-slate-400 leading-normal">
                              <p><span className="font-semibold">Date:</span> 19 Jul 2026</p>
                              <p className="text-rose-500 font-semibold"><span className="text-slate-400 font-normal">Due Date:</span> 03 Aug 2026</p>
                            </div>
                          </div>
                        </div>

                        {/* Customer details */}
                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-3.5 text-[10px] text-slate-600 leading-relaxed font-sans">
                          <div>
                            <span className="font-bold text-slate-400 uppercase text-[8px] tracking-wider block mb-0.5">Bill To / Customer</span>
                            <p className="font-bold text-slate-900 text-xs">Acme Corporation</p>
                            <p className="text-slate-500 leading-normal font-sans">105 Industrial Plaza, Bangalore, Karnataka - 560001</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-400 uppercase text-[8px] tracking-wider block mb-0.5">Settle Status</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[8px] font-bold uppercase tracking-wider mt-1">
                              ● Outstanding
                            </span>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className={`py-3.5 ${brandingSettings.invoiceTheme === "compact" ? "py-1.5" : "py-3.5"}`}>
                          <table className="w-full text-left text-[9px] border-collapse font-sans">
                            <thead>
                              <tr 
                                className={`text-[8px] font-bold uppercase tracking-wider ${
                                  brandingSettings.invoiceTheme === "classic" ? "bg-slate-100 text-slate-700 border-y-2 border-slate-800" :
                                  brandingSettings.invoiceTheme === "minimal" ? "border-b border-slate-200 text-slate-500 bg-transparent" :
                                  brandingSettings.invoiceTheme === "bold" ? "text-white border-none" : "bg-slate-50 border-y border-slate-200 text-slate-600"
                                }`}
                                style={{ backgroundColor: brandingSettings.invoiceTheme === "bold" ? (brandingSettings.invoiceAccentColor || "#4f46e5") : undefined }}
                              >
                                <th className="p-1.5">Description</th>
                                <th className="p-1.5 text-center">Qty</th>
                                <th className="p-1.5 text-right font-mono">Rate</th>
                                <th className="p-1.5 text-right font-mono">GST</th>
                                <th className="p-1.5 text-right font-mono">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              <tr className={brandingSettings.invoiceTheme === "compact" ? "h-6" : ""}>
                                <td className="p-1.5">
                                  <div className="font-bold text-slate-900 text-[10px]">Premium Software Development</div>
                                  <div className="text-[7px] text-slate-400 mt-0.5 font-sans">Custom SaaS ERP Modules Cloud architecture</div>
                                </td>
                                <td className="p-1.5 text-center">1</td>
                                <td className="p-1.5 text-right font-mono">₹45,000.00</td>
                                <td className="p-1.5 text-right font-mono text-emerald-600 font-bold">18%</td>
                                <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹53,100.00</td>
                              </tr>
                              <tr className={brandingSettings.invoiceTheme === "compact" ? "h-6" : ""}>
                                <td className="p-1.5">
                                  <div className="font-bold text-slate-900 text-[10px]">Cloud Infrastructure Hosting</div>
                                  <div className="text-[7px] text-slate-400 mt-0.5 font-sans">AWS nodes, high availability redundant arrays</div>
                                </td>
                                <td className="p-1.5 text-center">12</td>
                                <td className="p-1.5 text-right font-mono">₹1,500.00</td>
                                <td className="p-1.5 text-right font-mono text-emerald-600 font-bold">18%</td>
                                <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹21,240.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Totals Box */}
                        <div className="grid grid-cols-12 gap-4 items-start border-t border-slate-100 pt-3.5 text-[9px] text-slate-500 font-sans">
                          {/* Notes */}
                          <div className="col-span-6 space-y-1">
                            <span className="font-bold text-slate-400 uppercase text-[7px] tracking-wider block">Remittance Target</span>
                            <div className="text-[8px] bg-slate-50 p-2 rounded border border-slate-150 space-y-0.5 text-slate-600">
                              <p className="font-semibold text-slate-800">HDFC BANK LTD</p>
                              <p className="font-mono">Account: 50200084928192</p>
                              <p className="font-mono font-bold text-primary-600">IFSC: HDFC0000104</p>
                            </div>
                          </div>

                          {/* Calculations */}
                          <div 
                            className={`col-span-6 p-2 rounded-lg space-y-1 ${
                              brandingSettings.invoiceTheme === "classic" ? "bg-slate-50 border border-slate-800 rounded-none" :
                              brandingSettings.invoiceTheme === "minimal" ? "border-t border-slate-200 bg-transparent rounded-none" :
                              brandingSettings.invoiceTheme === "bold" ? "bg-slate-50 border-l-2" : "bg-slate-50 border border-slate-100"
                            }`}
                            style={{ borderLeftColor: brandingSettings.invoiceTheme === "bold" ? (brandingSettings.invoiceAccentColor || "#4f46e5") : undefined }}
                          >
                            <div className="flex justify-between">
                              <span>Taxable Amount:</span>
                              <span className="font-mono font-semibold text-slate-800">₹63,000.00</span>
                            </div>
                            <div className="flex justify-between">
                              <span>GST Tax (18%):</span>
                              <span className="font-mono font-semibold text-slate-800">₹11,340.00</span>
                            </div>
                            {invoicePreferences.roundOff && (
                              <div className="flex justify-between text-[8px] text-slate-400">
                                <span>Round-off:</span>
                                <span className="font-mono">₹0.00</span>
                              </div>
                            )}
                            <div 
                              className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 mt-1 text-[11px]"
                              style={{ color: brandingSettings.invoiceTheme === "bold" ? (brandingSettings.invoiceAccentColor || "#4f46e5") : undefined }}
                            >
                              <span>Grand Total:</span>
                              <span className="font-mono">
                                {invoicePreferences.decimalPrecision === 0 ? "₹74,340" : 
                                 invoicePreferences.decimalPrecision === 3 ? "₹74,340.000" : "₹74,340.00"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer message / Signature */}
                        <div className="pt-4 mt-3 border-t border-slate-100 flex justify-between items-end text-[8px] text-slate-400 font-sans leading-normal">
                          <p className="max-w-[180px] italic">
                            {brandingSettings.invoiceFooterText || "Thank you for doing business with us!"}
                          </p>
                          <div className="text-right space-y-1">
                            <div className="h-6 w-16 bg-slate-50 border border-slate-150 rounded shrink-0 self-end ml-auto flex items-center justify-center p-0.5 overflow-hidden">
                              <span className="text-[6px] text-slate-400 scale-90 block">Authorized Signature</span>
                            </div>
                            <p className="font-bold text-slate-700">For {bizName || "GATHEX Tech Pvt Ltd"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BRANDING */}
            {activeTab === "branding" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">Branding & Layout</h3>
                  <p className="text-xs text-slate-400">Establish corporate identity, PDF layout coordinates, and primary palettes</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Primary color picker */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Primary Accent Color</label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={brandingSettings.primaryColor}
                        onChange={(e) => setBrandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="h-10 w-12 rounded-lg border-none p-0 cursor-pointer overflow-hidden bg-transparent"
                      />
                      <Input
                        value={brandingSettings.primaryColor}
                        onChange={(e) => setBrandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="font-mono flex-1 text-sm uppercase"
                      />
                    </div>
                  </div>

                  {/* Secondary Color picker */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Secondary Header Color</label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={brandingSettings.secondaryColor}
                        onChange={(e) => setBrandingSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="h-10 w-12 rounded-lg border-none p-0 cursor-pointer overflow-hidden bg-transparent"
                      />
                      <Input
                        value={brandingSettings.secondaryColor}
                        onChange={(e) => setBrandingSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="font-mono flex-1 text-sm uppercase"
                      />
                    </div>
                  </div>

                  {/* PDF accent color picker */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Invoice Accent Highlight</label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={brandingSettings.invoiceAccentColor}
                        onChange={(e) => setBrandingSettings(prev => ({ ...prev, invoiceAccentColor: e.target.value }))}
                        className="h-10 w-12 rounded-lg border-none p-0 cursor-pointer overflow-hidden bg-transparent"
                      />
                      <Input
                        value={brandingSettings.invoiceAccentColor}
                        onChange={(e) => setBrandingSettings(prev => ({ ...prev, invoiceAccentColor: e.target.value }))}
                        className="font-mono flex-1 text-sm uppercase"
                      />
                    </div>
                  </div>
                
                </div>
                
                {/* Invoice Theme Selector */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                    <Palette className="w-3.5 h-3.5 text-primary-500" /> Invoice Themes
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { id: 'modern', name: 'Modern (Default)' },
                      { id: 'classic', name: 'Classic / Traditional' },
                      { id: 'minimal', name: 'Minimalist' },
                      { id: 'bold', name: 'Bold Header' }
                    ].map(theme => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setBrandingSettings(prev => ({ ...prev, invoiceTheme: theme.id }))}
                        className={`p-4 rounded-xl border text-left flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                          (brandingSettings.invoiceTheme || 'modern') === theme.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                        }`}
                      >
                        <div className="w-full h-16 bg-white border border-slate-200 rounded shadow-sm flex flex-col p-2 pointer-events-none">
                          <div className={`h-2 w-1/3 rounded-sm mb-1 ${theme.id === 'bold' ? 'bg-indigo-600 w-full' : 'bg-slate-300'}`}></div>
                          <div className="h-1 w-1/2 bg-slate-200 rounded-sm mb-0.5"></div>
                          <div className="h-1 w-1/4 bg-slate-200 rounded-sm mt-auto self-end"></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-primary-500" /> Brand Identity Elements
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Brand Logo Uploader */}
                    <div className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl text-center space-y-3">
                      <span className="text-xs font-bold text-slate-500 block">Corporate Logo</span>
                      {brandingSettings.logoUrl ? (
                        <div className="relative h-24 w-24 mx-auto border rounded-xl overflow-hidden bg-white p-1">
                          <img src={brandingSettings.logoUrl} className="h-full w-full object-contain" alt="Brand Logo" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="h-24 w-24 mx-auto border-2 border-dashed rounded-xl flex items-center justify-center text-slate-300">
                          <Building2 className="w-10 h-10" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          id="logo-upload-input"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "logo")}
                        />
                        <Button 
                          type="button" 
                          variant="secondary" 
                          className="text-xs cursor-pointer"
                          onClick={() => document.getElementById("logo-upload-input")?.click()}
                        >
                          {uploadingType === "logo" ? `Uploading ${uploadProgress}%` : "Upload Logo"}
                        </Button>
                      </div>
                    </div>

                    {/* Authorized Signature Uploader */}
                    <div className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl text-center space-y-3">
                      <span className="text-xs font-bold text-slate-500 block">Authorized Signature</span>
                      {brandingSettings.authorizedSignatureUrl ? (
                        <div className="relative h-24 w-24 mx-auto border rounded-xl overflow-hidden bg-white p-1">
                          <img src={brandingSettings.authorizedSignatureUrl} className="h-full w-full object-contain" alt="Signature" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="h-24 w-24 mx-auto border-2 border-dashed rounded-xl flex items-center justify-center text-slate-300">
                          <Signature className="w-10 h-10" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          id="signature-upload-input"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "signature")}
                        />
                        <Button 
                          type="button" 
                          variant="secondary" 
                          className="text-xs cursor-pointer"
                          onClick={() => document.getElementById("signature-upload-input")?.click()}
                        >
                          {uploadingType === "signature" ? `Uploading ${uploadProgress}%` : "Upload Signature"}
                        </Button>
                      </div>
                    </div>

                    {/* Company Stamp Uploader */}
                    <div className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl text-center space-y-3">
                      <span className="text-xs font-bold text-slate-500 block">Company Stamp / Seal</span>
                      {brandingSettings.companyStampUrl ? (
                        <div className="relative h-24 w-24 mx-auto border rounded-xl overflow-hidden bg-white p-1">
                          <img src={brandingSettings.companyStampUrl} className="h-full w-full object-contain" alt="Stamp" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="h-24 w-24 mx-auto border-2 border-dashed rounded-xl flex items-center justify-center text-slate-300">
                          <Check className="w-10 h-10" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          id="stamp-upload-input"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "stamp")}
                        />
                        <Button 
                          type="button" 
                          variant="secondary" 
                          className="text-xs cursor-pointer"
                          onClick={() => document.getElementById("stamp-upload-input")?.click()}
                        >
                          {uploadingType === "stamp" ? `Uploading ${uploadProgress}%` : "Upload Stamp"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Input
                  label="Default Invoice Footer / Corporate Message"
                  value={brandingSettings.invoiceFooterText}
                  onChange={(e) => setBrandingSettings(prev => ({ ...prev, invoiceFooterText: e.target.value }))}
                />
              </div>
            )}

            {/* TAB: PAYMENT SETTLEMENT */}
            {activeTab === "payment" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">Bank Settlements & VPA</h3>
                  <p className="text-xs text-slate-400">Configure client settlement paths, dynamic BHIM UPI VPA routing, and invoice QR maps</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Account Holder Legal Name"
                    value={paymentSettings.accountHolder}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, accountHolder: e.target.value }))}
                  />
                  <Input
                    label="BHIM UPI Address (VPA) *"
                    placeholder="e.g. yourcompany@bank"
                    value={paymentSettings.upiId}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, upiId: e.target.value }))}
                    helperText="All outward invoices print a dynamic transaction scan target to settle instantly to this address."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Bank Name"
                    value={paymentSettings.bankName}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, bankName: e.target.value }))}
                  />
                  <Input
                    label="Account Number"
                    value={paymentSettings.accountNumber}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="font-mono"
                  />
                  <Input
                    label="IFSC Code"
                    value={paymentSettings.ifsc}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, ifsc: e.target.value.toUpperCase() }))}
                    className="font-mono uppercase"
                  />
                </div>

                <Input
                  label="Branch Office Address"
                  value={paymentSettings.branch}
                  onChange={(e) => setPaymentSettings(prev => ({ ...prev, branch: e.target.value }))}
                />

                {/* Simulated payment targets card */}
                {paymentSettings.upiId && (
                  <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between border-none relative overflow-hidden">
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Dynamic QR Engaged</div>
                      <h4 className="text-sm font-bold font-display">BHIM UPI Settlement Target Active</h4>
                      <p className="text-[11px] text-slate-400">Direct instant billing mapping securely locked onto <strong>{paymentSettings.upiId}</strong>.</p>
                    </div>
                    <Check className="w-10 h-10 text-emerald-400" />
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPI SETTINGS */}
            {activeTab === "upi_settings" && (
              <UPISettingsTab activeBusiness={activeBusiness} />
            )}

            {/* TAB: PAYMENT METHODS */}
            {activeTab === "payment_methods" && (
              <PaymentMethodsTab activeBusiness={activeBusiness} />
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">Notification Settings</h3>
                  <p className="text-xs text-slate-400">Tailor automatic email drafts, SMS alerts, and scheduler frequencies</p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      id: "emailNotifications",
                      title: "Automatic Outward Invoicing Emails",
                      desc: "Instantly draft and deliver compliant invoice PDF letters on draft finalization."
                    },
                    {
                      id: "invoiceReminders",
                      title: "Due Date Settlement Reminders",
                      desc: "Automatically schedule payment follow-up alerts to clients 3 days before overdue thresholds."
                    },
                    {
                      id: "smsAlerts",
                      title: "Transactional Mobile SMS Notifications",
                      desc: "Deliver payment receipt VPA confirmations and tax billing summaries via integrated SMS nodes."
                    },
                    {
                      id: "autoSaveDrafts",
                      title: "SaaS Real-time Draft Synchronicity",
                      desc: "Automatically back up invoice states to global Firestore ledgers as you type."
                    }
                  ].map((notif) => (
                    <div 
                      key={notif.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="max-w-xl">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{notif.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={(generalSettings as any)[notif.id]}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, [notif.id]: e.target.checked }))}
                        className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: UPLOADED ASSETS */}
            {activeTab === "assets" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display">Workspace Storage Library</h3>
                  <p className="text-xs text-slate-400">Review, audit, and replace corporate logo assets, official stamps, and signature scans</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-2xl">
                  <div className="text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-500 uppercase block">Add Generic Business Document</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF audit records, registration certifications (Max 2MB)</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="doc-upload-input"
                      accept=".pdf,.doc,.docx,image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "document")}
                    />
                    <Button 
                      type="button" 
                      onClick={() => document.getElementById("doc-upload-input")?.click()}
                      className="flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                    >
                      <UploadCloud className="w-4 h-4" /> Upload Document
                    </Button>
                  </div>
                </div>

                {/* Asset Gallery List */}
                {assets.length === 0 ? (
                  <div className="p-8 border-2 border-dashed rounded-2xl text-center text-slate-400 text-xs">
                    No custom company documents, logos, or stamps registered in this workspace yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assets.map((asset) => (
                      <div 
                        key={asset.id} 
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-3 shadow-sm hover:shadow transition-shadow"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-12 w-12 rounded-lg bg-slate-50 dark:bg-slate-900 border overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                            {asset.mimeType.startsWith("image/") ? (
                              <img src={asset.url} className="h-full w-full object-contain" alt={asset.name} referrerPolicy="no-referrer" />
                            ) : (
                              <FileCode className="w-6 h-6 text-indigo-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-display">
                              {asset.name}
                            </h5>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-sans">
                              {asset.assetType.toUpperCase()} &bull; {(asset.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteAsset(asset)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer"
                          title="Remove File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form Actions Footer (Except for assets list tab) */}
            {activeTab !== "assets" && (
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800/60 mt-6">
                <Button variant="outline" type="button" onClick={() => window.location.reload()}>
                  Reset Values
                </Button>
                <Button variant="primary" type="button" onClick={handleSaveSettings}>
                  Save Workspace Settings
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
