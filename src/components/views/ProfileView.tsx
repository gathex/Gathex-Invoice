import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../ui/Toast";
import { supabase } from "../../supabase/config";
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  Calendar, 
  CloudLightning,
  Lock,
  Moon,
  Sun,
  Crown
} from "lucide-react";

export function ProfileView() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [language, setLanguage] = useState(profile?.language || "en");
  const [subTier, setSubTier] = useState(profile?.subscriptionTier || "Pro Tier");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.displayName || "");
      setPhone(profile.phone || "");
      setLanguage(profile.language || "en");
      setSubTier(profile.subscriptionTier || "Pro Tier");
    }
  }, [profile, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: displayName.trim(),
          phone: phone.trim(),
          language,
          subscription_tier: subTier
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile Updated", "Your personal details have been safely updated.");
    } catch (err: any) {
      toast.error("Update Failed", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-6 h-6 text-primary-500" /> My Account & Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your personal details, preferred regional settings, and check SaaS tier parameters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Profile Card & Info */}
        <form onSubmit={handleSaveProfile} className="md:col-span-8 space-y-6">
          <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
            <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm uppercase tracking-wider">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                leftIcon={<User className="w-4 h-4 text-slate-400" />}
              />
              <Input
                label="Email Address (Login ID)"
                value={user?.email || ""}
                disabled
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                helperText="Email changes must be requested through secure support routes."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                placeholder="+91 XXXXX XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
              />
              <Select
                label="Preferred Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={[
                  { value: "en-IN", label: "English (India)" },
                  { value: "en-US", label: "English (US)" },
                  { value: "hi-IN", label: "Hindi (हिंदी)" }
                ]}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? "Saving Profile..." : "Save Profile Details"}
              </Button>
            </div>
          </Card>

          {/* Quick Preferences Accent card */}
          <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm uppercase tracking-wider">
              Visual Preferences
            </h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">System Theme Layout</h4>
                <p className="text-xs text-slate-400 mt-0.5">Toggle default appearance between light-washed or eye-safe slate layouts.</p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                onClick={toggleTheme}
                className="flex items-center gap-1.5 font-bold text-xs py-1.5 px-3 cursor-pointer"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Switch Light
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-500" /> Switch Dark
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>

        {/* Subscription & Account Tier Details (Module 9, Module 11) */}
        <div className="md:col-span-4 space-y-6">
          <Card className="bg-gradient-to-b from-slate-900 to-[#111c30] text-white border-none shadow-xl relative overflow-hidden p-6 flex flex-col justify-between min-h-[340px]">
            <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

            <div className="space-y-4 z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/20 text-cyan-300 border border-primary-500/30 text-[10px] font-bold uppercase tracking-wider">
                  <Crown className="w-3 h-3 text-amber-400" /> GATHEX Partner Tier
                </span>
                <Crown className="w-6 h-6 text-amber-400" />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block">CURRENT SERVICE PACKAGE</span>
                <h3 className="text-3xl font-black font-display tracking-tight text-white flex items-baseline gap-1">
                  {subTier} <span className="text-xs text-emerald-400 font-bold font-sans">Active</span>
                </h3>
              </div>

              {/* Tier options selector */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Simulated Tier Adjuster</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg">
                  {["Starter", "Growth", "Enterprise"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSubTier(t)}
                      className={`py-1.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        subTier === t 
                          ? "bg-primary-600 text-white" 
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-[11px] text-slate-300 font-semibold pt-2 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span>Outward invoices / mo:</span>
                  <span className="font-mono text-white">
                    {subTier === "Starter" ? "50 limit" : subTier === "Growth" ? "500 limit" : "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>MSME & GSTIN verification:</span>
                  <span className="font-mono text-white">
                    {subTier === "Starter" ? "Manual" : "Instant API Auto-link"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Corporate assets storage:</span>
                  <span className="font-mono text-white">
                    {subTier === "Starter" ? "10MB" : subTier === "Growth" ? "100MB" : "1GB"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 z-10">
              <Button type="button" className="w-full bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs cursor-pointer">
                Manage Billing Cycle
              </Button>
            </div>
          </Card>

          {/* Secure Node Info */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 shadow-sm">
            <Lock className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">Identity Security Status</h5>
              <p className="text-[10px] text-slate-400 leading-normal">
                Your authorization vector is linked securely using Firebase Auth protocols. Data transactions are encrypted end-to-end to our Firestore shards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
