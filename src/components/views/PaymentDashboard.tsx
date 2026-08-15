import React, { useMemo } from "react";
import { Card } from "../ui/Card";
import { QrCode, IndianRupee, AlertCircle, TrendingUp } from "lucide-react";
import { Payment, Invoice } from "../../types";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

interface PaymentDashboardProps {
  totalReceived: number;
  totalOutstanding: number;
  totalOverdue: number;
  payments: Payment[];
  invoices: Invoice[];
}

export function PaymentDashboard({ 
  totalReceived, 
  totalOutstanding, 
  totalOverdue, 
  payments,
  invoices
}: PaymentDashboardProps) {
  
  const { upiReceived, upiPending } = useMemo(() => {
    let received = 0;
    let pending = 0;
    payments.forEach(p => {
      if (p.paymentMethod === "upi") {
        if (p.status === "paid" || p.status === "partially_paid") {
          received += p.amount;
        } else if (p.status === "pending" || p.status === "processing") {
          pending += p.amount;
        }
      }
    });
    return { upiReceived: received, upiPending: pending };
  }, [payments]);

  const paymentSuccessRate = useMemo(() => {
    if (payments.length === 0) return 0;
    const successful = payments.filter(p => p.status === 'paid' || p.status === 'partially_paid').length;
    return (successful / payments.length) * 100;
  }, [payments]);

  const monthlyData = useMemo(() => {
    const data: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      data[monthName] = 0;
    }
    
    payments.forEach(p => {
      if (p.status === 'paid' || p.status === 'partially_paid') {
        const d = p.paymentDate instanceof Date ? p.paymentDate : new Date(p.paymentDate);
        const monthName = d.toLocaleString('default', { month: 'short' });
        if (data[monthName] !== undefined) {
          data[monthName] += p.amount;
        }
      }
    });
    
    return Object.keys(data).map(name => ({ name, value: data[name] }));
  }, [payments]);

  const methodData = useMemo(() => {
    const counts: Record<string, number> = {};
    payments.forEach(p => {
      if (p.status === 'paid' || p.status === 'partially_paid') {
        const method = p.paymentMethod?.replace("_", " ").toUpperCase() || "OTHER";
        counts[method] = (counts[method] || 0) + 1;
      }
    });
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [payments]);

  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">UPI Collections</p>
            <p className="text-lg font-black text-indigo-700 dark:text-indigo-400 mt-0.5">{formatINR(upiReceived)}</p>
          </div>
          <div className="bg-white dark:bg-indigo-950 p-2 rounded-lg text-indigo-600">
            <QrCode className="w-4 h-4" />
          </div>
        </Card>
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Verification</p>
            <p className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5">{formatINR(upiPending)}</p>
          </div>
          <div className="bg-white dark:bg-amber-950 p-2 rounded-lg text-amber-600">
            <AlertCircle className="w-4 h-4" />
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 flex items-start justify-between border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Received</p>
            <h3 className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-500 mt-1.5">{formatINR(totalReceived)}</h3>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl group-hover:scale-105 transition-transform">
            <IndianRupee className="w-5 h-5" />
          </div>
        </Card>
        
        <Card className="p-5 flex items-start justify-between border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Amount</p>
            <h3 className="text-2xl font-black font-display text-cyan-600 dark:text-cyan-500 mt-1.5">{formatINR(totalOutstanding)}</h3>
          </div>
          <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-500 rounded-xl group-hover:scale-105 transition-transform">
            <QrCode className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-start justify-between border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Amount</p>
            <h3 className="text-2xl font-black font-display text-rose-600 dark:text-rose-500 mt-1.5">{formatINR(totalOverdue)}</h3>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl group-hover:scale-105 transition-transform">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-start justify-between border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Success Rate</p>
            <h3 className="text-2xl font-black font-display text-indigo-600 dark:text-indigo-500 mt-1.5">{paymentSuccessRate.toFixed(1)}%</h3>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5 border border-slate-200/60 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6">Collections Trend (Last 6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" style={{ color: "#000", fill: "#000" }}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatINR(value), 'Collection']}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/60 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6">Payment Methods Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" style={{ color: "#000", fill: "#000" }}>
                <PieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value} payments`, 'Count']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400">No payment data available</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
