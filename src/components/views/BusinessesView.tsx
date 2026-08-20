import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { businessService } from "../../services/businessService";
import { 
  Building2, 
  Search, 
  Plus, 
  Check, 
  Trash2, 
  Edit, 
  Archive, 
  ArrowRight, 
  Globe, 
  Phone, 
  Mail, 
  ShieldCheck, 
  MapPin, 
  LayoutDashboard,
  AlertTriangle,
  FolderSync
} from "lucide-react";

export function BusinessesView() {
  const toast = useToast();
  const { user, activeBusiness, setActiveBusiness } = useAuth();

  // Data states
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<any | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState("Sole Proprietorship");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [msmeNumber, setMsmeNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  
  // Address states
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<"all" | "active" | "archived">("active");

  // Real-time Firestore sync for Businesses
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = businessService.subscribeToBusinesses(
      user.uid,
      (list) => {
        setBusinesses(list);
        setLoading(false);
      },
      (error) => {
        console.error("Businesses load error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId("");
    setName("");
    setLegalName("");
    setBusinessType("Sole Proprietorship");
    setGstin("");
    setPan("");
    setMsmeNumber("");
    setEmail(user?.email || "");
    setPhone("");
    setWebsite("");
    setStreet("");
    setCity("");
    setState("");
    setPincode("");
    setCountry("India");
    setIsModalOpen(true);
  };

  const openEditModal = (biz: any) => {
    setIsEditing(true);
    setEditingId(biz.id);
    setName(biz.name || "");
    setLegalName(biz.legalName || "");
    setBusinessType(biz.businessType || "Sole Proprietorship");
    setGstin(biz.gstin || "");
    setPan(biz.pan || "");
    setMsmeNumber(biz.msmeNumber || "");
    setEmail(biz.email || "");
    setPhone(biz.phone || "");
    setWebsite(biz.website || "");
    setStreet(biz.address?.street || "");
    setCity(biz.address?.city || "");
    setState(biz.address?.state || "");
    setPincode(biz.address?.postalCode || "");
    setCountry(biz.address?.country || "India");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    // Validate GSTIN format if provided
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase())) {
      toast.error("Invalid GSTIN", "Please enter a valid 15-digit Indian GSTIN format.");
      return;
    }

    const payload = {
      name: name.trim(),
      legalName: legalName.trim() || name.trim(),
      businessType,
      gstin: gstin.trim().toUpperCase() || undefined,
      pan: pan.trim().toUpperCase() || undefined,
      msmeNumber: msmeNumber.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      website: website.trim() || undefined,
      address: {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postalCode: pincode.trim()
      }
    };

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await businessService.updateBusiness(editingId, payload);
        toast.success("Business Updated", `Successfully updated ${name} profile.`);
        
        // If this is the active business, update active business state in auth
        if (activeBusiness && activeBusiness.id === editingId) {
          setActiveBusiness({
            id: editingId,
            ownerUid: user.uid,
            ...payload,
            createdAt: activeBusiness.createdAt,
            updatedAt: new Date()
          });
        }
      } else {
        const newId = await businessService.createBusiness(user.uid, payload);
        toast.success("Business Registered", `${name} is ready for invoicing.`);
        
        // If no active business, set this one as active automatically
        if (!activeBusiness || businesses.length === 0) {
          setActiveBusiness({
            id: newId,
            ownerUid: user.uid,
            ...payload,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error("Operation Failed", err.message || "Could not save business details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (biz: any) => {
    try {
      await businessService.toggleArchiveBusiness(biz.id, !!biz.isArchived);
      toast.info(
        biz.isArchived ? "Business Restored" : "Business Archived",
        `${biz.name} has been ${biz.isArchived ? "restored to active listing" : "moved to archives"}.`
      );
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to alter business archive status.");
    }
  };

  const handleTriggerDelete = (biz: any) => {
    setBusinessToDelete(biz);
    setDeleteConfirmationText("");
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!businessToDelete) return;
    try {
      await businessService.deleteBusiness(businessToDelete.id);
      toast.success("Business Permanently Removed", `${businessToDelete.name} has been deleted.`);
      
      // If deleted business was active, set active to another or null
      if (activeBusiness && activeBusiness.id === businessToDelete.id) {
        const fallback = businesses.find(b => b.id !== businessToDelete.id && !b.isArchived);
        if (fallback) {
          setActiveBusiness(fallback);
        } else {
          setActiveBusiness(null);
        }
      }
      setIsConfirmDeleteOpen(false);
      setBusinessToDelete(null);
    } catch (err: any) {
      toast.error("Delete Failed", err.message || "Failed to delete business.");
    }
  };

  const handleSwitchActive = (biz: any) => {
    if (activeBusiness?.id === biz.id) {
      toast.info("Already Active", `${biz.name} is already your active workspace.`);
      return;
    }
    setActiveBusiness(biz);
    toast.success("Workspace Switched", `Switched active ledger target to ${biz.name}.`);
  };

  // Filter businesses
  const filtered = businesses.filter((biz) => {
    const matchesSearch = biz.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (biz.gstin && biz.gstin.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (archiveFilter === "active") return matchesSearch && !biz.isArchived;
    if (archiveFilter === "archived") return matchesSearch && biz.isArchived;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Title and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-500" /> Multi-Business Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Provision, manage, and switch billing records across multiple corporate entities from a single terminal
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-1.5 self-start cursor-pointer">
          <Plus className="w-4 h-4" /> Add New Business
        </Button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="Search business name or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            className="w-full"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setArchiveFilter("active")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
              archiveFilter === "active"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 font-bold"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            Active Workspaces
          </button>
          <button
            onClick={() => setArchiveFilter("archived")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
              archiveFilter === "archived"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 font-bold"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            Archived
          </button>
          <button
            onClick={() => setArchiveFilter("all")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
              archiveFilter === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 font-bold"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            All List
          </button>
        </div>
      </div>

      {/* Grid List of Businesses */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-12 text-center max-w-xl mx-auto">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto stroke-[1.5]" />
          <h3 className="font-bold font-display text-slate-800 dark:text-slate-200 mt-4">No businesses registered</h3>
          <p className="text-xs text-slate-400 mt-2">
            {archiveFilter === "archived" 
              ? "No archived business workspaces found matching your query." 
              : "Register your first business workspace to unlock professional GST invoicing, catalog mappings, and accounts tracking."}
          </p>
          {archiveFilter !== "archived" && (
            <Button onClick={openCreateModal} className="mt-6 cursor-pointer">
              Register First Business
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((biz, index) => {
            const isActive = activeBusiness?.id === biz.id;
            return (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(index * 0.05, 0.3) }}
              >
                <Card 
                  className={`transition-all relative border flex flex-col justify-between p-6 h-full ${
                    isActive 
                      ? "border-primary-500/80 ring-2 ring-primary-500/10 dark:ring-primary-400/20 shadow-md bg-white dark:bg-slate-950" 
                      : "border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 bg-white dark:bg-slate-900"
                  }`}
                >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3.5">
                      <div className={`p-3 rounded-xl ${isActive ? "bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400" : "bg-slate-50 dark:bg-slate-950 text-slate-500"}`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 font-display">
                            {biz.name}
                          </h3>
                          {isActive && (
                            <Badge variant="primary" className="text-[10px] font-bold py-0.5 px-2">
                              Active Workspace
                            </Badge>
                          )}
                          {biz.isArchived && (
                            <Badge variant="neutral" className="text-[10px] font-semibold py-0.5 px-2">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-sans">
                          {biz.businessType || "Corporation"} &bull; {biz.address?.city || "India"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Registered Details Block */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 my-5 pt-4 border-t border-slate-100 dark:border-slate-800/40 text-[11px] font-semibold font-mono">
                    <div>
                      <span className="text-black dark:text-slate-400 uppercase text-[9px] block tracking-wide">GSTIN</span>
                      <span className="text-emerald-600 dark:text-emerald-400 truncate block">
                        {biz.gstin || "Not Registered"}
                      </span>
                    </div>
                    <div>
                      <span className="text-black dark:text-slate-400 uppercase text-[9px] block tracking-wide">PAN</span>
                      <span className="text-indigo-600 dark:text-indigo-400 truncate block">
                        {biz.pan || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[9px] block tracking-wide">Email</span>
                      <span className="text-slate-600 dark:text-slate-300 truncate block">
                        {biz.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[9px] block tracking-wide">Phone</span>
                      <span className="text-slate-600 dark:text-slate-300 truncate block">
                        {biz.phone || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/40 gap-2 mt-4 flex-wrap">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEditModal(biz)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Edit Business Profile"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(biz)}
                      className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer ${
                        biz.isArchived ? "text-amber-500 hover:text-amber-600" : "hover:text-slate-800"
                      }`}
                      title={biz.isArchived ? "Restore to Active" : "Archive Workspace"}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTriggerDelete(biz)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Permanently Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!isActive && !biz.isArchived && (
                    <button
                      onClick={() => handleSwitchActive(biz)}
                      className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-primary-600/10 cursor-pointer active:scale-95"
                    >
                      Switch Workspace <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
          })}
        </div>
      )}

      {/* Business registration/editing dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Edit Business Workspace" : "Register Corporate Workspace"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Business/Trade Name *"
              placeholder="e.g. Acme Technologies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Legal Entity Name (Printed on Invoices) *"
              placeholder="e.g. Acme Technologies Private Limited"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Business Type *"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              options={[
                { value: "Sole Proprietorship", label: "Sole Proprietorship" },
                { value: "Partnership Firm", label: "Partnership Firm" },
                { value: "LLP (Limited Liability)", label: "LLP" },
                { value: "Private Limited Company", label: "Private Limited Company" },
                { value: "Public Limited Company", label: "Public Limited" },
                { value: "One Person Company", label: "One Person Company" }
              ]}
            />
            <Input
              label="GSTIN (15-digit)"
              placeholder="e.g. 27AAPCA1234A1Z5"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="font-mono uppercase"
            />
            <Input
              label="PAN Number (10-digit)"
              placeholder="e.g. AAPCA1234A"
              value={pan}
              onChange={(e) => setPan(e.target.value)}
              className="font-mono uppercase"
              maxLength={10}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Business Email *"
              type="email"
              placeholder="support@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            />
            <Input
              label="Business Phone *"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
            />
            <Input
              label="Website Domain"
              placeholder="https://company.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              leftIcon={<Globe className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* MSME registration ID */}
          <Input
            label="Udyam MSME Registration Number (Optional)"
            placeholder="UDYAM-XX-00-0000000"
            value={msmeNumber}
            onChange={(e) => setMsmeNumber(e.target.value)}
            className="font-mono"
          />

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary-500" /> Registered Headquarters Address
            </h4>
            <Input
              label="Street Address / Room / Tower"
              placeholder="e.g. 402 Supreme Chambers, Link Road"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                label="City"
                placeholder="Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Input
                label="State"
                placeholder="e.g. Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
              <Input
                label="Pincode"
                placeholder="400053"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required
                className="font-mono"
                maxLength={6}
              />
              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                disabled
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting} disabled={isSubmitting}>
              {isEditing ? "Save Changes" : "Register Business"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title="Permanently Delete Workspace"
        size="sm"
      >
        <div className="space-y-4 py-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 text-rose-500">
            <AlertTriangle className="w-10 h-10 animate-bounce" />
            <div>
              <h4 className="font-bold font-display">Destructive Action</h4>
              <p className="text-xs text-slate-400">This operation cannot be reversed.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you absolutely sure you want to delete <strong className="text-slate-800 dark:text-white">{businessToDelete?.name}</strong>? 
            This will permanently erase all associated catalogs, payment configurations, and invoices from our nodes.
          </p>
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Please type <strong>{businessToDelete?.name}</strong> to confirm:
            </label>
            <Input
              placeholder={businessToDelete?.name}
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleConfirmDelete}
              disabled={deleteConfirmationText !== businessToDelete?.name}
            >
              Confirm Permanent Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
