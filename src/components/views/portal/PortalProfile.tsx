import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabase/config";
import { useAuth } from "../../../context/AuthContext";
import { Customer } from "../../../types";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { useToast } from "../../ui/Toast";
import { User, Phone, MapPin, Building, Save, Loader2, RefreshCw } from "lucide-react";

export function PortalProfile() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerDoc, setCustomerDoc] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Billing Address States
  const [bStreet, setBStreet] = useState("");
  const [bCity, setBCity] = useState("");
  const [bState, setBState] = useState("");
  const [bPostalCode, setBPostalCode] = useState("");
  const [bCountry, setBCountry] = useState("India");

  // Shipping Address States
  const [sStreet, setSStreet] = useState("");
  const [sCity, setSCity] = useState("");
  const [sState, setSState] = useState("");
  const [sPostalCode, setSPostalCode] = useState("");
  const [sCountry, setSCountry] = useState("India");

  useEffect(() => {
    if (!user) return;
    fetchCustomerProfile();
  }, [user]);

  const fetchCustomerProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (!error && data) {
        setCustomerDoc(data);
        setName(data.name || "");
        setCompanyName(data.company_name || "");
        setPhone(data.phone || "");
        
        if (data.billing_address) {
          setBStreet(data.billing_address.street || "");
          setBCity(data.billing_address.city || "");
          setBState(data.billing_address.state || "");
          setBPostalCode(data.billing_address.postalCode || data.billing_address.postal_code || "");
          setBCountry(data.billing_address.country || "India");
        }

        if (data.shipping_address) {
          setSStreet(data.shipping_address.street || "");
          setSCity(data.shipping_address.city || "");
          setSState(data.shipping_address.state || "");
          setSPostalCode(data.shipping_address.postalCode || data.shipping_address.postal_code || "");
          setSCountry(data.shipping_address.country || "India");
        }
      } else {
        setName(user.displayName || "Demo Customer");
        setCompanyName("Demo Corporation Pvt Ltd");
        setPhone("+91 98765 43210");
        setBStreet("102, Pride Business Plaza, Kothrud");
        setBCity("Pune");
        setBState("Maharashtra");
        setBPostalCode("411038");
        setBCountry("India");
        
        setSStreet("102, Pride Business Plaza, Kothrud");
        setSCity("Pune");
        setSState("Maharashtra");
        setSPostalCode("411038");
        setSCountry("India");
      }
    } catch (err) {
      console.error("Error fetching customer profile:", err);
      toast.error("Fetch Failed", "Could not load customer details from directory.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Validation Error", "Contact name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const updatedData = {
        name: name.trim(),
        company_name: companyName.trim(),
        phone: phone.trim(),
        billing_address: {
          street: bStreet.trim(),
          city: bCity.trim(),
          state: bState.trim(),
          postalCode: bPostalCode.trim(),
          country: bCountry.trim()
        },
        shipping_address: {
          street: sStreet.trim(),
          city: sCity.trim(),
          state: sState.trim(),
          postalCode: sPostalCode.trim(),
          country: sCountry.trim()
        }
      };

      if (customerDoc) {
        await supabase
          .from('customers')
          .update(updatedData)
          .eq('id', customerDoc.id);
        toast.success("Profile Updated", "Your self-service contact card has been saved successfully.");
        await fetchCustomerProfile();
      } else {
        toast.info("Sandbox Mode", "Demo profile changed locally.");
      }
    } catch (err) {
      console.error("Error saving customer profile:", err);
      toast.error("Save Failed", "Could not update customer registry details.");
    } finally {
      setSaving(false);
    }
  };

  const copyBillingToShipping = () => {
    setSStreet(bStreet);
    setSCity(bCity);
    setSState(bState);
    setSPostalCode(bPostalCode);
    setSCountry(bCountry);
    toast.success("Copied", "Billing address copied to shipping address.");
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Profile Card</h2>
          <p className="text-xs sm:text-sm text-slate-500">Self-service updates for your billing and shipping directory details.</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 border-slate-200/60 dark:border-slate-800 shadow-sm text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg mb-4">
              {name.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{name || "Valued Customer"}</h3>
            <p className="text-slate-400 text-xs mt-0.5">{user?.email}</p>

            <div className="w-full border-t border-slate-100 dark:border-slate-800 mt-6 pt-6 space-y-4 text-left">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Representative Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><User className="w-4 h-4" /></span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Company / Trade Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Building className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Contact Phone</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Phone className="w-4 h-4" /></span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Addresses Info */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 border-slate-200/60 dark:border-slate-800 shadow-sm space-y-6">
            {/* Billing Address */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  Billing Address (India Standard GST)
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyBillingToShipping}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Copy to Shipping
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Street Address</label>
                  <input
                    type="text"
                    value={bStreet}
                    onChange={(e) => setBStreet(e.target.value)}
                    placeholder="Flat/Office No, Building name, Street name"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">City</label>
                    <input
                      type="text"
                      value={bCity}
                      onChange={(e) => setBCity(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">State</label>
                    <input
                      type="text"
                      value={bState}
                      onChange={(e) => setBState(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">PIN Code</label>
                    <input
                      type="text"
                      value={bPostalCode}
                      onChange={(e) => setBPostalCode(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <MapPin className="w-4 h-4 text-purple-500" />
                Shipping Address (Delivery Location)
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Street Address</label>
                  <input
                    type="text"
                    value={sStreet}
                    onChange={(e) => setSStreet(e.target.value)}
                    placeholder="Delivery warehouse or secondary address"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">City</label>
                    <input
                      type="text"
                      value={sCity}
                      onChange={(e) => setSCity(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">State</label>
                    <input
                      type="text"
                      value={sState}
                      onChange={(e) => setSState(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">PIN Code</label>
                    <input
                      type="text"
                      value={sPostalCode}
                      onChange={(e) => setSPostalCode(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="primary"
                type="submit"
                loading={saving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Address Card
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
