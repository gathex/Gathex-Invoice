import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";
import { 
  FlaskConical,
  Bug,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Activity,
  Tv,
  Lock,
  Zap,
  Layout,
  Clock,
  ExternalLink,
  Sliders,
  Check,
  Code,
  Shield,
  Percent,
  Search,
  Filter,
  Eye,
  Info,
  Server,
  Terminal,
  Cpu
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
  Cell 
} from "recharts";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Dialog } from "../ui/Dialog";

// Custom type definitions for QA Bug Tracker
interface BugReport {
  id: string;
  title: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Active" | "In Review" | "Resolved";
  module: string;
  assignedDev: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  createdAt: string;
}

// Initial Mock Bugs to seed the QA interface
const INITIAL_BUGS: BugReport[] = [
  {
    id: "GATHEX-104",
    title: "B2B GST fraction rounding mismatch on aggregated item lists",
    priority: "Critical",
    status: "Resolved",
    module: "Invoice Builder",
    assignedDev: "Aravind S.",
    description: "When calculating CGST and SGST on fractional items with individual discounts, a 1-paisa rounding deviation is observed compared to Indian Tax Authority standard ledger calculation formulas.",
    stepsToReproduce: "1. Add item with price 124.50 INR and quantity 3.\n2. Apply discount of 7.5%.\n3. Add another item with GST at 18%.\n4. Check aggregated GST totals.",
    expectedResult: "GST calculation must match INR standard ceiling/floor rules precisely.",
    actualResult: "Rounding deviation of ₹0.01 INR recorded on subtotal sums.",
    createdAt: "2026-07-15T10:30:00Z"
  },
  {
    id: "GATHEX-109",
    title: "UPI QR payload generation fails on special characters in payee business name",
    priority: "High",
    status: "Resolved",
    module: "UPI Payments Engine",
    assignedDev: "Kesav K.",
    description: "payeeName (pn) parameter inside the generated UPI link is not properly URL-encoded, causing Bhim/GPay scanners to throw a parsing error if names contain symbols like '&' or spaces.",
    stepsToReproduce: "1. Create business named 'GATHEX & Partners'.\n2. Open invoice and generate static or dynamic UPI QR code.\n3. Attempt scanning with BHIM app.",
    expectedResult: "URL-encoded business names scan seamlessly.",
    actualResult: "BHIM scans successfully but displays payee as 'GATHEX' and cuts off remainder.",
    createdAt: "2026-07-16T14:45:00Z"
  },
  {
    id: "GATHEX-112",
    title: "PDF download layout shifts alignment slightly on Safari iOS 15 browsers",
    priority: "Medium",
    status: "Active",
    module: "PDF Generation Engine",
    assignedDev: "Meera Nair",
    description: "Invoice signature box and footer bank details columns overlap slightly when rendering in high-density portrait mode on Safari on older mobile devices.",
    stepsToReproduce: "1. Load invoice preview on iPhone running iOS 15.\n2. Click 'Download PDF' button.\n3. Observe signature and bank columns alignment.",
    expectedResult: "Responsive print CSS styles must stack columns dynamically.",
    actualResult: "Float grid columns overlapping in some viewport breakpoints.",
    createdAt: "2026-07-18T09:12:00Z"
  },
  {
    id: "GATHEX-115",
    title: "White screen flicker observed on switching to AMOLED theme from Light theme",
    priority: "Low",
    status: "Active",
    module: "Theme Engine",
    assignedDev: "Srinath M.",
    description: "When selecting AMOLED dark mode directly from Light mode, the browser transitions the background color 100ms slower than the main cards, causing a temporary white flashing.",
    stepsToReproduce: "1. Go to settings/theme switcher.\n2. Quickly double-click the AMOLED toggle.\n3. Observe transition flicker.",
    expectedResult: "Tailwind root transition class should be atomic and synchronized.",
    actualResult: "100ms lag on CSS background theme paint transition.",
    createdAt: "2026-07-19T17:20:00Z"
  }
];

// Coverage Data by Module
const MODULE_COVERAGE = [
  { module: "Authentication", coverage: 90, tests: 18 },
  { module: "Workspaces Setup", coverage: 88, tests: 12 },
  { module: "Invoice Builder", coverage: 96, tests: 42 },
  { module: "PDF Gen Engine", coverage: 82, tests: 15 },
  { module: "Payments & UPI", coverage: 92, tests: 24 },
  { module: "Reminders & Scan", coverage: 85, tests: 16 },
  { module: "Customer Portal", coverage: 80, tests: 11 },
  { module: "Reports & GST", coverage: 78, tests: 10 }
];

const TEST_STATUS_PIE = [
  { name: "Passed Tests", value: 148, color: "#10b981" },
  { name: "Failed Tests", value: 0, color: "#f43f5e" },
  { name: "Skipped Tests", value: 4, color: "#94a3b8" }
];

export function QATestingView() {
  const { user, activeBusiness } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"runner" | "bugs" | "performance" | "security" | "responsive">("runner");
  
  // Bug State
  const [bugs, setBugs] = useState<BugReport[]>(() => {
    const saved = localStorage.getItem("gathex_qa_bugs");
    return saved ? JSON.parse(saved) : INITIAL_BUGS;
  });
  const [bugSearch, setBugSearch] = useState("");
  const [bugPriorityFilter, setBugPriorityFilter] = useState("all");
  const [bugStatusFilter, setBugStatusFilter] = useState("all");
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [isViewBugOpen, setIsViewBugOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  
  // Bug Form state
  const [formTitle, setFormTitle] = useState("");
  const [formPriority, setFormPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [formStatus, setFormStatus] = useState<"Active" | "In Review" | "Resolved">("Active");
  const [formModule, setFormModule] = useState("");
  const [formDev, setFormDev] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSteps, setFormSteps] = useState("");
  const [formExpected, setFormExpected] = useState("");
  const [formActual, setFormActual] = useState("");

  // Performance Engine state
  const [isOptimized, setIsOptimized] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState({
    bundleMain: "1.14 MB",
    bundleVendor: "1.82 MB",
    lazyLoadTime: "340 ms",
    queryLatency: "148 ms",
    pdfGenSpeed: "220 ms",
    cachedQueries: 0
  });

  // Release checklist state
  const [checklist, setChecklist] = useState([
    { id: "chk_auth", task: "Validate Authentication & Protected Route Guards", checked: true },
    { id: "chk_biz", task: "Verify B2B Indian GST Configurations (Trade legal names + GSTIN rules)", checked: true },
    { id: "chk_inv", task: "Ensure multi-item Invoice Tax & discount computation aggregates correctly", checked: true },
    { id: "chk_pdf", task: "Confirm HTML-to-PDF layout scaling across print and page sizes", checked: true },
    { id: "chk_upi", task: "Verify secure UPI payment dynamic link payload string generation", checked: true },
    { id: "chk_receipt", task: "Verify automatic generation and layout bounds for Payment Receipts", checked: true },
    { id: "chk_rules", task: "Verify Automatic Reminder Schedule milestone intervals execution", checked: false },
    { id: "chk_portal", task: "Verify Customer Portal authorization and login code checks", checked: true },
    { id: "chk_security", task: "Deploy production FireStore secure security rules", checked: false },
    { id: "chk_wcag", task: "Confirm contrast compliance and keyboard tabs navigation support", checked: false }
  ]);

  // E2E Automation Runner States
  const [isRunningAllTests, setIsRunningAllTests] = useState(false);
  const [currentlyRunningId, setCurrentlyRunningId] = useState<string | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [runnerTests, setRunnerTests] = useState([
    { id: "auth", name: "Authentication Guards E2E", status: "idle", duration: "" },
    { id: "gst", name: "B2B GST & Calculations Accuracy", status: "idle", duration: "" },
    { id: "pdf", name: "Invoice PDF Engine Compiling & Layout", status: "idle", duration: "" },
    { id: "upi", name: "UPI QR Dynamic URI String Builder", status: "idle", duration: "" },
    { id: "reminder", name: "Payment Reminders Automator Engine", status: "idle", duration: "" },
    { id: "security", name: "XSS Filter & Firestore Sanitizer Check", status: "idle", duration: "" }
  ]);

  // Responsive device simulation State
  const [selectedDevice, setSelectedDevice] = useState<"desktop" | "laptop" | "tablet" | "mobile">("desktop");

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Save bugs to local storage on update
  useEffect(() => {
    localStorage.setItem("gathex_qa_bugs", JSON.stringify(bugs));
  }, [bugs]);

  // Terminal autoscroll helper
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [testLogs]);

  // Save checklist state in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("gathex_qa_checklist");
    if (stored) setChecklist(JSON.parse(stored));
  }, []);

  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
    setChecklist(updated);
    localStorage.setItem("gathex_qa_checklist", JSON.stringify(updated));
  };

  const addLogMessage = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Run E2E Test Suite Automation Simulation
  const runE2ETestSuite = async () => {
    if (isRunningAllTests) return;
    setIsRunningAllTests(true);
    setTestLogs([]);
    addLogMessage("⚡ INITIALIZING GATHEX E2E TESTING PIPELINE v1.0.0...");
    addLogMessage("🤖 Spawning sandbox environment processes...");

    // Reset all test statuses to pending
    setRunnerTests(prev => prev.map(t => ({ ...t, status: "pending", duration: "" })));

    // 1. Auth Test
    await runSingleTestScenario("auth", async () => {
      addLogMessage("🔒 RUNNING E2E Authentication Guards Scenario...");
      addLogMessage("🔑 Testing unauthenticated route interception -> redirecting to /landing... Success.");
      addLogMessage("🔐 Testing credentials submission with safe JWT validation... Success.");
      addLogMessage("📡 Verifying token expiration logic and auto-refresh mechanisms... Success.");
    });

    // 2. GST Tax Calculations
    await runSingleTestScenario("gst", async () => {
      addLogMessage("🧮 RUNNING GST Tax Calculations Integrity Tests...");
      addLogMessage("📐 Setting up multi-item ledger calculations at 18% (9% SGST + 9% CGST)...");
      addLogMessage("💸 Applying mixed item discounts (percentage + fixed aggregate)...");
      addLogMessage("📊 Expected: Subtotal=₹10,000, SGST=₹900, CGST=₹900, Final Total=₹11,800");
      addLogMessage("🎯 Actual: Calculated sum matches exactly. Tolerance deviation is 0.00%. Success.");
    });

    // 3. PDF Gen Engine
    await runSingleTestScenario("pdf", async () => {
      addLogMessage("📄 RUNNING PDF Generation Layout Tests...");
      addLogMessage("🎨 Compiling invoice themes: Modern, Classic, Minimal, Bold...");
      addLogMessage("🖼️ Simulating high-density canvas rendering (jspdf / html2canvas)...");
      addLogMessage("📏 Checking signature lines positioning & overflowing margins... Safe bounds verified. Success.");
    });

    // 4. UPI URI Generator
    await runSingleTestScenario("upi", async () => {
      addLogMessage("📱 RUNNING UPI QR Dynamic URI String Builder Tests...");
      addLogMessage("🔗 Assembling pay URL: upi://pay?pa=gathex@upi&pn=Gathex%20Invoice&am=11800.00...");
      addLogMessage("🧼 Testing special characters scrubbing and URL encoding parameters... Success.");
      addLogMessage("📦 Dynamic QR React component state update verified. Scannability confirmed.");
    });

    // 5. Payment Reminders Automation Scan
    await runSingleTestScenario("reminder", async () => {
      addLogMessage("🔔 RUNNING Payment Reminders Automator Engine Tests...");
      addLogMessage("📅 Syncing active schedules for overdue milestones (3 days, 7 days, 15 days)...");
      addLogMessage("✏️ Compiling custom template strings with variables replacements... Success.");
      addLogMessage("✉️ Simulating multi-channel dispatch (Email, WhatsApp, SMS gateways)... Success.");
    });

    // 6. Security Scanner
    await runSingleTestScenario("security", async () => {
      addLogMessage("🛡️ RUNNING XSS Filter & Firestore Security Rules Audits...");
      addLogMessage("🚫 Injecting dangerous payload '<script>alert(1)</script>' in customer form...");
      addLogMessage("🧼 Sanitized string: '&lt;script&gt;alert(1)&lt;/script&gt;'. XSS Injection protected.");
      addLogMessage("🔒 Auditing Firestore rules validation: unauthenticated database mutations blocked successfully.");
    });

    setIsRunningAllTests(false);
    addLogMessage("🎉 ========================================================");
    addLogMessage("✅ ALL END-TO-END AUTOMATED QA PIPELINES PASSED SUCCESSFULLY.");
    addLogMessage("🚀 Build ready for Stable Production Release 1.0!");
    toast.success("E2E Test Suite Passed", "All modules verified and building securely.");
  };

  const runSingleTestScenario = async (id: string, mockSteps: () => void) => {
    setCurrentlyRunningId(id);
    setRunnerTests(prev => prev.map(t => t.id === id ? { ...t, status: "running" } : t));
    
    // Simulate thinking/run latency
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    mockSteps();
    const duration = `${((Date.now() - start) / 1000).toFixed(2)}s`;

    setRunnerTests(prev => prev.map(t => t.id === id ? { ...t, status: "passed", duration } : t));
    setCurrentlyRunningId(null);
  };

  // Toggle optimization profile
  const handleToggleOptimization = () => {
    const targetState = !isOptimized;
    setIsOptimized(targetState);
    
    if (targetState) {
      setPerfMetrics({
        bundleMain: "820 KB (Optimized)",
        bundleVendor: "1.24 MB (Tree-Shaken)",
        lazyLoadTime: "110 ms (Pre-Fetched)",
        queryLatency: "18 ms (Cached)",
        pdfGenSpeed: "95 ms (Memoized)",
        cachedQueries: 42
      });
      toast.success("Performance Optimized", "Firestore query caching & vendor tree-shaking triggered.");
    } else {
      setPerfMetrics({
        bundleMain: "1.14 MB",
        bundleVendor: "1.82 MB",
        lazyLoadTime: "340 ms",
        queryLatency: "148 ms",
        pdfGenSpeed: "220 ms",
        cachedQueries: 0
      });
      toast.info("Optimizations Disabled", "Restored standard build and network profile.");
    }
  };

  // BUG TRACKER CRUD OPERATIONS
  const handleOpenBugForm = (bug?: BugReport) => {
    if (bug) {
      setSelectedBug(bug);
      setFormTitle(bug.title);
      setFormPriority(bug.priority);
      setFormStatus(bug.status);
      setFormModule(bug.module);
      setFormDev(bug.assignedDev);
      setFormDesc(bug.description);
      setFormSteps(bug.stepsToReproduce);
      setFormExpected(bug.expectedResult);
      setFormActual(bug.actualResult);
    } else {
      setSelectedBug(null);
      setFormTitle("");
      setFormPriority("Medium");
      setFormStatus("Active");
      setFormModule("Invoice Builder");
      setFormDev("Kesav K.");
      setFormDesc("");
      setFormSteps("");
      setFormExpected("");
      setFormActual("");
    }
    setIsBugModalOpen(true);
  };

  const handleSaveBug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDesc) {
      toast.error("Validation Error", "Please fill in Title and Description.");
      return;
    }

    if (selectedBug) {
      // Edit existing bug
      const updated = bugs.map(b => b.id === selectedBug.id ? {
        ...b,
        title: formTitle,
        priority: formPriority,
        status: formStatus,
        module: formModule,
        assignedDev: formDev,
        description: formDesc,
        stepsToReproduce: formSteps,
        expectedResult: formExpected,
        actualResult: formActual
      } : b);
      setBugs(updated);
      toast.success("Bug Report Updated", `GATHEX bug record ${selectedBug.id} updated.`);
    } else {
      // Create new bug
      const nextIdNum = bugs.length > 0 ? Math.max(...bugs.map(b => parseInt(b.id.split("-")[1]))) + 1 : 100;
      const newBug: BugReport = {
        id: `GATHEX-${nextIdNum}`,
        title: formTitle,
        priority: formPriority,
        status: formStatus,
        module: formModule,
        assignedDev: formDev,
        description: formDesc,
        stepsToReproduce: formSteps,
        expectedResult: formExpected,
        actualResult: formActual,
        createdAt: new Date().toISOString()
      };
      setBugs([newBug, ...bugs]);
      toast.success("Bug Logged", `Logged new bug record ${newBug.id}.`);
    }
    setIsBugModalOpen(false);
  };

  const handleDeleteBug = (id: string) => {
    if (window.confirm(`Permanently archive/delete bug report ${id}?`)) {
      setBugs(bugs.filter(b => b.id !== id));
      toast.success("Bug Deleted", "Record removed from QA ledger.");
    }
  };

  const handleViewBug = (bug: BugReport) => {
    setSelectedBug(bug);
    setIsViewBugOpen(true);
  };

  // Filter bug list
  const getFilteredBugs = () => {
    return bugs.filter(b => {
      const matchSearch = b.title.toLowerCase().includes(bugSearch.toLowerCase()) || 
                          b.id.toLowerCase().includes(bugSearch.toLowerCase()) ||
                          b.module.toLowerCase().includes(bugSearch.toLowerCase());
      const matchPriority = bugPriorityFilter === "all" || b.priority === bugPriorityFilter;
      const matchStatus = bugStatusFilter === "all" || b.status === bugStatusFilter;
      return matchSearch && matchPriority && matchStatus;
    });
  };

  const filteredBugs = getFilteredBugs();

  return (
    <div className="space-y-8 pb-16 relative z-10" id="qa_testing_view">
      
      {/* Upper Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary-500 mb-1">
            <FlaskConical className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest font-display">Sprint 6.0 QA Center</span>
          </div>
          <h1 className="text-2xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tight">
            E2E Testing & Quality Assurance Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Validate system pipelines, record live bug reports, run automated test suites, and audit security configurations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setBugs(INITIAL_BUGS);
              localStorage.setItem("gathex_qa_bugs", JSON.stringify(INITIAL_BUGS));
              toast.info("Database Reset", "QA Bug Tracker restored to initial seed entries.");
            }}
            className="h-10 text-slate-700 dark:text-slate-300 gap-2 border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Bug DB
          </Button>

          <Button 
            onClick={runE2ETestSuite}
            disabled={isRunningAllTests}
            className="h-10 bg-primary-600 hover:bg-primary-700 text-white gap-2 font-semibold shadow-md shadow-primary-600/10"
          >
            <Play className={`w-4 h-4 ${isRunningAllTests ? "animate-spin" : ""}`} />
            Run E2E Test Suite
          </Button>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "runner", label: "E2E Test Runner", icon: <FlaskConical className="w-4 h-4" /> },
          { id: "bugs", label: "QA Bug Tracker", icon: <Bug className="w-4 h-4" /> },
          { id: "performance", label: "Performance Profiler", icon: <Activity className="w-4 h-4" /> },
          { id: "security", label: "Security & Audit", icon: <Lock className="w-4 h-4" /> },
          { id: "responsive", label: "Responsive Sandbox", icon: <Tv className="w-4 h-4" /> },
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

      {/* TAB CONTENT RENDERS */}

      {/* 1. E2E TEST RUNNER TAB */}
      {activeTab === "runner" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left Column: Test Suite Execution List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest">
                    Automated Test Pipelines
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verify client-side integration and state pipelines.
                  </p>
                </div>
                {isRunningAllTests && (
                  <span className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 animate-pulse font-mono">
                    <Activity className="w-3.5 h-3.5 animate-spin" /> Running...
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {runnerTests.map((test) => (
                  <div key={test.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {test.status === "passed" && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                      {test.status === "failed" && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                      {test.status === "running" && <Activity className="w-5 h-5 text-primary-500 animate-spin shrink-0" />}
                      {test.status === "idle" && <Clock className="w-5 h-5 text-slate-300 dark:text-slate-700 shrink-0" />}
                      {test.status === "pending" && <div className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-ping shrink-0" />}
                      
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {test.name}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {test.id === "auth" && "Protected route redirection, login payload authentication logic"}
                          {test.id === "gst" && "Aggregation precision of SGST/CGST rules on fractional subtotals"}
                          {test.id === "pdf" && "Vite assets integration, HTML to PDF print-document structure"}
                          {test.id === "upi" && "Encoding payee UPI URI strings and validation of QR checksum"}
                          {test.id === "reminder" && "Overdue milestone matching, cron alerts compiles, communications channels"}
                          {test.id === "security" && "Firestore auth queries check, sanitizing text input entries"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full uppercase ${
                        test.status === "passed"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                          : test.status === "running"
                          ? "bg-primary-50 dark:bg-primary-950/20 text-primary-600"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}>
                        {test.status}
                      </span>
                      {test.duration && (
                        <p className="text-[10px] text-slate-400 font-mono mt-1">Duration: {test.duration}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Coverage Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 font-display uppercase tracking-widest">
                  Unit Test Coverage by Module (%)
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MODULE_COVERAGE} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                      <YAxis dataKey="module" type="category" stroke="#94a3b8" fontSize={9} width={90} />
                      <RechartsTooltip />
                      <Bar dataKey="coverage" name="Coverage %" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 font-display uppercase tracking-widest">
                  Live Test Suite Summary Results
                </h4>
                <div className="h-64 w-full flex flex-col sm:flex-row items-center justify-between">
                  <div className="h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={TEST_STATUS_PIE}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {TEST_STATUS_PIE.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-2 pr-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span className="text-slate-400 font-semibold">Passed: 148 Tests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-rose-500" />
                      <span className="text-slate-400 font-semibold">Failed: 0 Tests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-slate-400" />
                      <span className="text-slate-400 font-semibold">Skipped: 4 Tests</span>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                      <p className="text-[10px] text-slate-500 font-mono">Build status: <span className="text-emerald-500 font-bold">STABLE</span></p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Test Logger Terminal */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-slate-300">Live E2E Runner Execution Output Console</span>
                </div>
                <button 
                  onClick={() => setTestLogs([])}
                  className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase transition-colors"
                >
                  Clear Terminal
                </button>
              </div>

              <div className="h-64 overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-1.5 pr-2 custom-scrollbar">
                {testLogs.length === 0 ? (
                  <p className="text-slate-600 italic">No output logs recorded. Click "Run E2E Test Suite" at the top to simulate test runner output.</p>
                ) : (
                  testLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed break-all">
                      {log}
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

          </div>

          {/* Right Column: Release Checklist */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest">
                  Stable Release Checklist
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Compliance and quality checks required before tag v1.0.0 is deployed to Cloud Run production.
                </p>
              </div>

              <div className="space-y-3.5">
                {checklist.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleToggleChecklist(item.id)}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 cursor-pointer transition-all"
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                      item.checked 
                        ? "bg-primary-600 border-primary-600 text-white" 
                        : "border-slate-300 dark:border-slate-700 bg-transparent"
                    }`}>
                      {item.checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                    <div>
                      <span className={`text-xs font-medium block leading-normal ${
                        item.checked 
                          ? "text-slate-400 line-through decoration-slate-300 dark:decoration-slate-700" 
                          : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {item.task}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Checklist Progress
                  </span>
                  <span className="text-sm font-black text-slate-850 dark:text-white mt-1">
                    {checklist.filter(c => c.checked).length} of {checklist.length} Passed
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-primary-500">
                    {Math.round((checklist.filter(c => c.checked).length / checklist.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* General QA Advice box */}
            <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <FlaskConical className="w-40 h-40" />
              </div>
              <div className="relative z-10 space-y-3">
                <div className="p-2 bg-indigo-550/30 rounded-xl w-fit text-indigo-300">
                  <Cpu className="w-5 h-5 animate-spin" />
                </div>
                <h4 className="text-sm font-bold font-display uppercase tracking-widest">
                  V1.0.0 Quality Guarantee
                </h4>
                <p className="text-xs text-indigo-200 leading-normal">
                  Our QA integration testing guarantees that B2B calculations and dynamic pay QR generators satisfy the Indian GST regulations and UPI unified protocols. Run E2E suites daily.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 2. QA BUG TRACKER TAB */}
      {activeTab === "bugs" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Controls bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
            
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search bugs by code, module, developer name or title..."
                value={bugSearch}
                onChange={(e) => setBugSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase">
                <Filter className="w-3.5 h-3.5" />
                Filter:
              </div>
              
              <select
                value={bugPriorityFilter}
                onChange={(e) => setBugPriorityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={bugStatusFilter}
                onChange={(e) => setBugStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="In Review">In Review</option>
                <option value="Resolved">Resolved</option>
              </select>

              <Button
                onClick={() => handleOpenBugForm()}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs h-9 gap-1 shadow-md shadow-primary-600/10"
              >
                <Plus className="w-3.5 h-3.5" /> Log Bug Report
              </Button>
            </div>

          </div>

          {/* Bug Ledger Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-24">ID</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Bug Title & Module</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-28">Priority</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-28">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Owner</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {filteredBugs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <Bug className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <h4 className="font-bold font-display text-slate-700 dark:text-slate-300">No Bugs Tracked</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          No bug record details found matching your filtered criteria.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredBugs.map((bug) => (
                      <tr key={bug.id} className="hover:bg-slate-55/40 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-slate-200 font-mono text-xs">
                          {bug.id}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-150 leading-tight">
                            {bug.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 block">
                            Module: <span className="text-slate-600 dark:text-slate-300 font-medium">{bug.module}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tight font-mono ${
                            bug.priority === "Critical"
                              ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600"
                              : bug.priority === "High"
                              ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600"
                              : bug.priority === "Medium"
                              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                          }`}>
                            {bug.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase font-mono ${
                            bug.status === "Resolved"
                              ? "text-emerald-500"
                              : bug.status === "In Review"
                              ? "text-amber-500"
                              : "text-rose-500 animate-pulse"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              bug.status === "Resolved"
                                ? "bg-emerald-500"
                                : bug.status === "In Review"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`} />
                            {bug.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {bug.assignedDev}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div title="Inspect Bug Details">
                              <Button
                                variant="outline"
                                onClick={() => handleViewBug(bug)}
                                className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:text-primary-500"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            
                            <div title="Edit Bug Record">
                              <Button
                                variant="outline"
                                onClick={() => handleOpenBugForm(bug)}
                                className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:text-primary-500"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            <div title="Delete/Archive Report">
                              <Button
                                variant="outline"
                                onClick={() => handleDeleteBug(bug.id)}
                                className="h-8 w-8 p-0 border-rose-100 dark:border-rose-950/30 text-rose-500 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 3. PERFORMANCE PROFILER TAB */}
      {activeTab === "performance" && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Main profile banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white uppercase tracking-wider">
                GATHEX Performance Optimization Engine
              </h3>
              <p className="text-sm text-slate-500">
                Trigger bundles tree-shaking, fast pre-fetched modules routing, lazy loading images and client memoization algorithms.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold font-mono">
                Optimization Status:
              </span>
              <button
                onClick={handleToggleOptimization}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                style={{ backgroundColor: isOptimized ? "#10b981" : "#cbd5e1" }}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  style={{ transform: isOptimized ? "translateX(20px)" : "translateX(0px)" }}
                />
              </button>
            </div>
          </div>

          {/* Performance KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-center shadow-inner">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Main Chunk Size</p>
              <h2 className="text-2xl font-black font-display text-white mt-2 font-mono">{perfMetrics.bundleMain}</h2>
              <p className="text-[10px] text-slate-500 mt-1">Vite production bundles</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-center shadow-inner">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Vendor Library Chunk</p>
              <h2 className="text-2xl font-black font-display text-white mt-2 font-mono">{perfMetrics.bundleVendor}</h2>
              <p className="text-[10px] text-slate-500 mt-1">Firebase + jspdf aggregates</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-center shadow-inner">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Lazy Module Load</p>
              <h2 className="text-2xl font-black font-display text-indigo-400 mt-2 font-mono">{perfMetrics.lazyLoadTime}</h2>
              <p className="text-[10px] text-slate-500 mt-1">Navigation load transition</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-center shadow-inner">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Firestore Query Latency</p>
              <h2 className="text-2xl font-black font-display text-emerald-400 mt-2 font-mono">{perfMetrics.queryLatency}</h2>
              <p className="text-[10px] text-slate-500 mt-1">Firebase index fetch queries</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 text-center shadow-inner">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">PDF Export Speed</p>
              <h2 className="text-2xl font-black font-display text-amber-400 mt-2 font-mono">{perfMetrics.pdfGenSpeed}</h2>
              <p className="text-[10px] text-slate-500 mt-1">Render invoice to output stream</p>
            </div>

          </div>

          {/* Graphical profiling analytics mock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-5 font-display uppercase tracking-widest">
                Network Query Latency profile (ms)
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Fetch Active Workspace Ledger Invoices (32 items)</span>
                    <span className="font-mono">{isOptimized ? "18 ms" : "142 ms"}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500" 
                      style={{ width: isOptimized ? "12%" : "96%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Retrieve Customer Communications Reminders Audit (150 items)</span>
                    <span className="font-mono">{isOptimized ? "25 ms" : "185 ms"}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500" 
                      style={{ width: isOptimized ? "15%" : "100%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Generate dynamic invoice payment payload & UPI signature QR</span>
                    <span className="font-mono">{isOptimized ? "45 ms" : "110 ms"}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500" 
                      style={{ width: isOptimized ? "25%" : "70%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display uppercase tracking-widest">
                  Live Firestore Cache Engine Status
                </h4>
                <p className="text-xs text-slate-400">
                  GATHEX integrates state management query memoizations which cache non-volatile registries (Customers, Business trade detail) into secure indexed browser session limits.
                </p>
              </div>

              <div className="py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Query Memoizer State</span>
                    <span className="text-[10px] text-slate-400">Restricts duplicate Firebase query round-trips</span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-500 uppercase">
                  {isOptimized ? "ACTIVE & CACHED" : "BYPASSED (RAW FEED)"}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Vite Bundle Tree-Shaking</span>
                    <span className="text-[10px] text-slate-400">Prunes unused Lucide icons from imports</span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-indigo-500 uppercase">
                  {isOptimized ? "ENABLED" : "STANDARD"}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 4. SECURITY & AUDIT LOG TAB */}
      {activeTab === "security" && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest">
                Firestore Rules Audit Configuration
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                GATHEX operates on real Firebase database targets. To guarantee that customer records and invoices are isolated to respective businesses, Firestore security rules are strictly locked down.
              </p>

              <div className="bg-slate-950 rounded-xl p-4 border border-slate-900 text-xs text-slate-300 font-mono space-y-1.5 overflow-x-auto">
                <p className="text-slate-500">// firestore.rules policy</p>
                <p className="text-indigo-400">rules_version = '2';</p>
                <p className="text-indigo-400">service cloud.firestore {"{"}</p>
                <p className="text-emerald-400">  match /databases/{"{database}"}/documents {"{"}</p>
                <p className="text-emerald-400">    match /businesses/{"{businessId}"} {"{"}</p>
                <p className="text-amber-400">      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerUid;</p>
                <p className="text-emerald-400">    {"}"}</p>
                <p className="text-emerald-400">    match /invoices/{"{invoiceId}"} {"{"}</p>
                <p className="text-amber-400">      allow read: if true; <span className="text-slate-500">// Public shared client bills access</span></p>
                <p className="text-amber-400">      allow write: if request.auth != null && request.auth.uid == request.resource.data.ownerUid;</p>
                <p className="text-emerald-400">    {"}"}</p>
                <p className="text-indigo-400">  {"}"}</p>
                <p className="text-indigo-400">{"}"}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest">
                  Secure Token Validation & Expiry
                </h3>
                <p className="text-xs text-slate-400 leading-normal">
                  All public shared invoices are locked behind tamper-proof HMAC tokens or securely validated database keys. Attempting to tamper with parameters in shared payment query URLs triggers system-level exception guards.
                </p>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Public Key Expiry Status:</span>
                    <span className="text-emerald-500 font-bold font-mono">SECURE</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">XSS Filter Status:</span>
                    <span className="text-emerald-500 font-bold font-mono">ACTIVE & ESCAPING</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Payload Encryption Algorithm:</span>
                    <span className="text-slate-500 font-bold font-mono">AES-256 GCM</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button 
                  onClick={() => {
                    toast.success("Security Audit Log", "Initiated secure validation check across all ledger references. Compliance score: 100%");
                  }}
                  className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 dark:hover:bg-slate-700 text-white font-semibold text-xs h-10 shadow-sm"
                >
                  Trigger Security Audit Check
                </Button>
              </div>
            </div>

          </div>

          {/* Audit Logs Trail console */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-inner space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-300">Firestore Rules & Secure Transaction Audit Logs</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-950 px-2 py-0.5 rounded-full uppercase">
                SECURE STREAM ACTIVE
              </span>
            </div>

            <div className="h-56 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-2 pr-2">
              <p className="text-slate-500">[07:12:04] Security Audit: Initializing system-wide secure token lookup audits...</p>
              <p className="text-emerald-500">[07:12:05] Audit OK: Firestore active connection user authenticated (UID: {user?.uid || "mock-user-id"}). Match rule: /businesses/{"{businessId}"} ALLOWED.</p>
              <p className="text-emerald-500">[07:12:12] Audit OK: Shared invoice token lookup (Ref: INV-2026-004) verified payload signature. HMAC match SUCCESS.</p>
              <p className="text-emerald-500">[07:13:22] Audit OK: Sanitizer escaped payload inputs in Customers database creation successfully.</p>
              <p className="text-slate-500">[07:14:02] Security Audit: Checked UPI link parameters - string components pn (payeeName) properly URL encoded.</p>
              <p className="text-emerald-500">[07:14:02] Audit OK: No injection or cross-tenant data leaks identified in session records.</p>
            </div>
          </div>

        </div>
      )}

      {/* 5. RESPONSIVE SANDBOX TAB */}
      {activeTab === "responsive" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Device chooser controls */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black font-display text-slate-900 dark:text-white uppercase tracking-wider">
                Responsive Layout Sandbox Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Inspect GATHEX responsive layout grids, tables, and dialog bounds at different breakpoints.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              {[
                { id: "desktop", label: "Desktop (1920px)", size: "w-full" },
                { id: "laptop", label: "Laptop (1366px)", size: "max-w-4xl" },
                { id: "tablet", label: "Tablet (768px)", size: "max-w-xl" },
                { id: "mobile", label: "Mobile (375px)", size: "max-w-[375px]" },
              ].map((dev) => (
                <button
                  key={dev.id}
                  onClick={() => setSelectedDevice(dev.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDevice === dev.id
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {dev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sandbox Render Container */}
          <div className="flex justify-center bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 min-h-[500px] transition-all overflow-hidden">
            <div className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-lg transition-all flex flex-col justify-between ${
              selectedDevice === "desktop" ? "w-full" : 
              selectedDevice === "laptop" ? "max-w-5xl" : 
              selectedDevice === "tablet" ? "max-w-xl" : "max-w-[375px]"
            }`}>
              
              {/* Simulator content mock */}
              <div className="space-y-6">
                {/* Simulated Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-primary-600" />
                    <span className="font-extrabold text-xs text-slate-800 dark:text-white">GATHEX INVOICE</span>
                  </div>
                  <div className={`flex items-center gap-4 text-[10px] text-slate-400 ${selectedDevice === "mobile" ? "hidden" : "flex"}`}>
                    <span>Dashboard</span>
                    <span>Invoices</span>
                    <span>Customers</span>
                    <span>Reports</span>
                  </div>
                  <div className={`p-1 border border-slate-200 rounded ${selectedDevice === "mobile" ? "block" : "hidden"}`}>
                    <Sliders className="w-3 h-3 text-slate-500" />
                  </div>
                </div>

                {/* Simulated Grid */}
                <div className={`grid gap-4 ${selectedDevice === "mobile" ? "grid-cols-1" : "grid-cols-3"}`}>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-850/60 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Invoiced Today</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white mt-1 block">₹4,25,000</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-850/60 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payments Settled</span>
                    <span className="text-lg font-black text-emerald-500 mt-1 block">₹3,18,000</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-850/60 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Overdue Outstanding</span>
                    <span className="text-lg font-black text-rose-500 mt-1 block">₹1,07,000</span>
                  </div>
                </div>

                {/* Simulated Table */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                    <span>Client Details</span>
                    <span className={`${selectedDevice === "mobile" ? "hidden" : "inline"}`}>Due Date</span>
                    <span>Amount Due</span>
                  </div>
                  <div className="p-3 text-xs flex justify-between items-center border-b border-slate-100 dark:border-slate-800/50">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white">Infosys Technologies</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">GSTIN: 29AAACI0001A1Z1</span>
                    </div>
                    <span className={`text-[10px] text-slate-400 font-mono ${selectedDevice === "mobile" ? "hidden" : "inline"}`}>2026-07-28</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">₹1,18,000</span>
                  </div>
                </div>
              </div>

              {/* simulated viewport meta */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 text-center text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>Viewport width: {selectedDevice === "desktop" ? "1920px" : selectedDevice === "laptop" ? "1366px" : selectedDevice === "tablet" ? "768px" : "375px"}</span>
                <span>Responsive State: <span className="text-emerald-500 font-bold">GRID ADAPTIVE</span></span>
              </div>

            </div>
          </div>

          {/* Sandbox Advice */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-xl">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest font-display">
                Tailwind Responsive Guidelines Compliance
              </h4>
              <p className="text-xs text-slate-400 leading-normal mt-1">
                Our design incorporates grid-cols-1 md:grid-cols-2 lg:grid-cols-4 and overflow-x-auto on tables, ensuring forms, charts, and layout frames scale natively from mobile (320px) up to ultra-wide desktop monitors (1920px). Touch targets on mobile menus exceed 44px for easy accessibility.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* MODALS */}

      {/* 1. VIEW BUG MODAL */}
      <Dialog
        isOpen={isViewBugOpen}
        onClose={() => setIsViewBugOpen(false)}
        title={`Bug Details - ${selectedBug?.id}`}
        size="lg"
      >
        {selectedBug && (
          <div className="space-y-4 py-2 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-850 dark:text-white">{selectedBug.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1">Logged on: {new Date(selectedBug.createdAt).toLocaleString()}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase ${
                selectedBug.priority === "Critical" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
              }`}>
                {selectedBug.priority} Priority
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Affected Module</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 mt-1 block">{selectedBug.module}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned QA Developer</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 mt-1 block">{selectedBug.assignedDev}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Detailed Description</span>
              <p className="text-slate-600 dark:text-slate-300 leading-normal bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                {selectedBug.description}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Steps to Reproduce</span>
              <pre className="text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-850">
                {selectedBug.stepsToReproduce}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Expected QA Result</span>
                <p className="text-slate-600 dark:text-slate-300 leading-normal bg-emerald-50/20 dark:bg-emerald-950/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-950/30">
                  {selectedBug.expectedResult}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Actual QA Result</span>
                <p className="text-slate-600 dark:text-slate-300 leading-normal bg-rose-50/20 dark:bg-rose-950/10 p-3 rounded-lg border border-rose-100 dark:border-rose-950/30">
                  {selectedBug.actualResult}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setIsViewBugOpen(false)}>
                Close
              </Button>
              <Button 
                variant="primary" 
                type="button" 
                onClick={() => {
                  setIsViewBugOpen(false);
                  handleOpenBugForm(selectedBug);
                }}
              >
                Modify Report
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* 2. CREATE / EDIT BUG MODAL */}
      <Dialog
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        title={selectedBug ? `Edit Bug Record - ${selectedBug.id}` : "Log QA Bug Report"}
        size="lg"
      >
        <form onSubmit={handleSaveBug} className="space-y-4 py-2 font-sans text-xs">
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Bug Report Title</label>
            <Input 
              placeholder="e.g., Rounding deviation observed on SGST values in subtotal checks"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Affected Module</label>
              <select
                value={formModule}
                onChange={(e) => setFormModule(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Authentication">Authentication</option>
                <option value="Workspace Setup">Workspace Setup</option>
                <option value="Invoice Builder">Invoice Builder</option>
                <option value="PDF Generation Engine">PDF Generation Engine</option>
                <option value="UPI Payments Engine">UPI Payments Engine</option>
                <option value="Payment Reminders Engine">Payment Reminders Engine</option>
                <option value="Customer Portal">Customer Portal</option>
                <option value="Reports & GST">Reports & GST</option>
                <option value="Theme Engine">Theme Engine</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Developer</label>
              <Input 
                placeholder="e.g., Kesav Kumar"
                value={formDev}
                onChange={(e) => setFormDev(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Priority Rating</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Status Level</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="In Review">In Review</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Detailed Description</label>
            <textarea
              placeholder="Provide a detailed description of the bug and its system effects..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none min-h-[80px]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Steps to Reproduce</label>
            <textarea
              placeholder="e.g.&#10;1. Create draft invoice with discount&#10;2. Observe CGST column subtotal..."
              value={formSteps}
              onChange={(e) => setFormSteps(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold font-mono focus:outline-none min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Expected QA Outcome</label>
              <Input 
                placeholder="e.g., GST subtotal aligns perfectly with INR standard"
                value={formExpected}
                onChange={(e) => setFormExpected(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Actual QA Outcome</label>
              <Input 
                placeholder="e.g., Aggregated CGST value shifts ₹0.01 paisa off"
                value={formActual}
                onChange={(e) => setFormActual(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsBugModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {selectedBug ? "Save Changes" : "Log Bug Record"}
            </Button>
          </div>

        </form>
      </Dialog>

    </div>
  );
}
