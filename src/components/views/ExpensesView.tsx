import { useState } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import { TrendingDown, Search, Plus, Calendar, FileText, Download, CheckSquare } from "lucide-react";

export function ExpensesView() {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const expenses = [
    {
      id: "EXP-0928",
      supplier: "Vercel Enterprise Servers",
      category: "Software Subscriptions",
      date: "08 Jul 2026",
      amount: "₹18,500.00",
      gstClaimed: "₹2,822.00 (18% GST)",
      supplierGstin: "9919USA290123S1"
    },
    {
      id: "EXP-0912",
      supplier: "Nexus Space Rentals Pvt Ltd",
      category: "Office Co-working Rent",
      date: "01 Jul 2026",
      amount: "₹45,000.00",
      gstClaimed: "₹8,100.00 (18% GST)",
      supplierGstin: "27AAACN1928K1Z3"
    },
    {
      id: "EXP-0849",
      supplier: "BlueDart Logistical Services",
      category: "Courier & Courier Charges",
      date: "25 Jun 2026",
      amount: "₹3,200.00",
      gstClaimed: "₹576.00 (18% GST)",
      supplierGstin: "27AABCB8192C1ZX"
    }
  ];

  const handleCreateExpense = () => {
    toast.success("Outflow Log Ready", "Create detailed supplier expenses with GST claims.");
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (exp.supplierGstin && exp.supplierGstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold font-display text-slate-900 dark:text-white">Business Outflow Ledger</h1>
          <p className="text-sm text-slate-500">Record supplier purchases, overhead office expenses, and claim input tax credits (ITC)</p>
        </div>
        
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreateExpense}>
          Record Supplier Expense
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase">Monthly Procurement Outflow</p>
          <h3 className="text-2xl font-bold font-display text-rose-500 mt-1">₹66,700.00</h3>
        </Card>
        
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase">Input Tax Credit (ITC) Claims</p>
          <h3 className="text-2xl font-bold font-display text-emerald-600 mt-1">₹11,498.00</h3>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase">Audit Status</p>
          <h3 className="text-2xl font-bold font-display text-indigo-600 mt-1 flex items-center gap-1.5">
            <CheckSquare className="w-5 h-5 text-emerald-500" /> Compliant
          </h3>
        </Card>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="Search expenses by supplier name, category, or supplier GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={<TrendingDown className="w-12 h-12 text-slate-400" />}
          title="No Outflows Logged"
          description="Enrolling procurement logs allows our engine to map outward vs inward GST ledgers, displaying net tax balances."
          action={<Button variant="primary" onClick={handleCreateExpense}>Record Supplier Purchase</Button>}
        />
      ) : (
        <Card className="p-0 overflow-hidden border border-slate-200/60 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/60">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Expense ID</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category Category</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase Date</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier GSTIN</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Net Amount</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">ITC Claimable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 text-xs font-bold font-mono text-slate-500">{exp.id}</td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{exp.supplier}</div>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-400">{exp.category}</td>
                    <td className="p-4 text-xs text-slate-500">{exp.date}</td>
                    <td className="p-4 text-xs font-mono text-slate-500">{exp.supplierGstin || "N/A"}</td>
                    <td className="p-4 text-sm font-bold font-mono text-slate-800 dark:text-slate-200">{exp.amount}</td>
                    <td className="p-4 text-right text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {exp.gstClaimed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
