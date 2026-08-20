import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "../../context/RouterContext";
import { productService } from "../../services/productService";
import { supabase } from "../../supabase/config";

import { 
  Package, 
  Search, 
  Plus, 
  Hash, 
  Sparkles, 
  Check, 
  Trash2, 
  Edit3, 
  AlertCircle,
  Tag,
  Hammer,
  ShieldCheck,
  TrendingDown,
  Boxes
} from "lucide-react";
import { ProductService } from "../../types";

export function ProductsView() {
  const toast = useToast();
  const { user, activeBusiness } = useAuth();
  const { currentRoute } = useRouter();

  // Data states
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loading, setLoading] = useState(true);

  // UI Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductService | null>(null);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [type, setType] = useState<"product" | "service">("product");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("Pcs");
  const [gstRate, setGstRate] = useState("18");
  const [cessRate, setCessRate] = useState("0");
  
  // Future Inventory Skeleton States
  const [quantityInStock, setQuantityInStock] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "service">("all");
  const [gstFilter, setGstFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sync state with route presets (Products vs Services)
  useEffect(() => {
    if (currentRoute === "products") {
      setTypeFilter("product");
      setType("product");
    } else if (currentRoute === "services") {
      setTypeFilter("service");
      setType("service");
    } else {
      setTypeFilter("all");
    }
  }, [currentRoute]);

  // Sync Products from Supabase
  useEffect(() => {
    if (!user || !activeBusiness) return;

    setLoading(true);
    const unsubscribe = productService.subscribeToProducts(
      user.uid,
      activeBusiness.id,
      (items) => {
        setProducts(items);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeBusiness]);

  const gstRatesOptions = [
    { value: "0", label: "0% GST (Exempt Outward Supplies)" },
    { value: "5", label: "5% GST (Essential Goods / Services)" },
    { value: "12", label: "12% GST (Processed Foods / Standalone)" },
    { value: "18", label: "18% GST (Standard slab - SaaS, Consultants, Agencies)" },
    { value: "28", label: "28% GST (Luxury items / Sin tax)" }
  ];

  const typeOptions = [
    { value: "product", label: "Physical Goods (HSN Classified)" },
    { value: "service", label: "Consultancy & Services (SAC Classified)" }
  ];

  const unitOptions = [
    { value: "Pcs", label: "Pieces (Pcs)" },
    { value: "Box", label: "Boxes (Box)" },
    { value: "Kg", label: "Kilograms (Kg)" },
    { value: "Ltr", label: "Litres (Ltr)" },
    { value: "Hrs", label: "Hours (Hrs)" },
    { value: "Days", label: "Days (Days)" },
    { value: "Month", label: "Months (Month)" },
    { value: "Nos", label: "Numbers (Nos)" }
  ];

  // Save / Update product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeBusiness) return;

    if (!name.trim()) {
      toast.error("Required fields missing", "Please enter an item name.");
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Invalid price", "Base price must be a positive number.");
      return;
    }

    const payload: any = {
      type,
      name: name.trim(),
      skuCode: sku.trim() || undefined,
      hsnSacCode: hsnSac.trim() || undefined,
      description: description.trim() || undefined,
      price: parsedPrice,
      unit,
      gstRate: Number(gstRate),
      cessRate: Number(cessRate || 0)
    };

    try {
      if (isEditing) {
        await productService.updateProduct(editingId, payload);
        toast.success("Catalog Item Saved", `${name} specifications have been updated.`);
      } else {
        await productService.createProduct(user.uid, activeBusiness.id, payload);
        toast.success("Catalog Item Enrolled", `${name} registered successfully with standard tax mapping.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Save Failed", err.message || "Could not save product.");
    }
  };

  // Delete product confirmation
  const triggerDeleteConfirm = (prod: ProductService) => {
    setProductToDelete(prod);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!user || !activeBusiness || !productToDelete) return;

    try {
      await productService.deleteProduct(productToDelete.id);
      toast.success("Catalog Item Removed", `${productToDelete.name} was successfully deleted.`);
      setIsConfirmDeleteOpen(false);
      setProductToDelete(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Delete Failed", err.message || "Could not delete product.");
    }
  };

  // Edit Trigger
  const initEditProduct = (prod: ProductService) => {
    setIsEditing(true);
    setEditingId(prod.id);
    setType(prod.type);
    setName(prod.name);
    setSku(prod.skuCode || "");
    setHsnSac(prod.hsnSacCode || "");
    setDescription(prod.description || "");
    setPrice(String(prod.price));
    setUnit(prod.unit);
    setGstRate(String(prod.gstRate));
    setCessRate(String(prod.cessRate || 0));
    
    // Inventory state restoration
    const casted = prod as any;
    setQuantityInStock(String(casted.quantityInStock !== undefined ? casted.quantityInStock : "0"));
    setLowStockThreshold(String(casted.lowStockThreshold !== undefined ? casted.lowStockThreshold : "10"));

    setIsModalOpen(true);
  };

  // Handle classification selections automatically based on type selection
  useEffect(() => {
    if (type === "service" && hsnSac.trim() === "") {
      setUnit("Hrs");
    } else if (type === "product" && hsnSac.trim() === "") {
      setUnit("Pcs");
    }
  }, [type]);

  // Compute Search, category filters
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.skuCode && p.skuCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.hsnSacCode && p.hsnSacCode.includes(searchQuery)) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "all" ? true : p.type === typeFilter;
    const matchesGst = gstFilter === "all" ? true : String(p.gstRate) === gstFilter;

    return matchesSearch && matchesType && matchesGst;
  });

  // Client-side pagination bounds
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, gstFilter]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white">Inventory & Tax Catalog</h1>
          <p className="text-sm text-slate-500">Configure cataloged goods and billing services with native HSN/SAC codes and standard GST slabs.</p>
        </div>
        
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => {
          setIsEditing(false);
          setEditingId("");
          setType("product");
          setName("");
          setSku("");
          setHsnSac("");
          setDescription("");
          setPrice("");
          setUnit("Pcs");
          setGstRate("18");
          setCessRate("0");
          setQuantityInStock("0");
          setLowStockThreshold("10");
          setIsModalOpen(true);
        }}>
          Add Item
        </Button>
      </div>

      {/* Interactive Filter Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm items-center">
        {/* Search */}
        <div className="md:col-span-5">
          <Input
            placeholder="Search by catalog name, SKU, or HSN/SAC code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Type selection */}
        <div className="md:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">Category: All Types</option>
            <option value="product">Goods Only (Physical)</option>
            <option value="service">Services Only (SAC)</option>
          </select>
        </div>

        {/* GST slab filter */}
        <div className="md:col-span-4">
          <select
            value={gstFilter}
            onChange={(e) => setGstFilter(e.target.value)}
            className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">GST Slab: All Slabs</option>
            <option value="0">0% GST (Exempt)</option>
            <option value="5">5% GST Slab</option>
            <option value="12">12% GST Slab</option>
            <option value="18">18% GST Slab</option>
            <option value="28">28% GST Slab</option>
          </select>
        </div>
      </div>

      {/* Table grid of products */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : paginatedProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12 text-slate-400" />}
          title={searchQuery || typeFilter !== "all" || gstFilter !== "all" ? "No Matching Items" : "Tax Catalog Empty"}
          description={searchQuery || typeFilter !== "all" || gstFilter !== "all" ? "Try loosening filters or refining search keywords." : "Enroll catalog entries to quick-insert items with precise precalculated GST on the invoice creator page."}
          action={!(searchQuery || typeFilter !== "all" || gstFilter !== "all") && (
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Enroll First Item
            </Button>
          )}
        />
      ) : (
        <>
          <Card className="p-0 overflow-hidden border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800/60">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Classification</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">SKU / Code</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">HSN / SAC</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Price (Base)</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tax Slab</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Status</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {paginatedProducts.map((p, index) => {
                    const casted = p as any;
                    const isProduct = p.type === "product";
                    const isLowStock = isProduct && casted.quantityInStock !== null && casted.quantityInStock <= (casted.lowStockThreshold || 0);

                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: Math.min(index * 0.04, 0.4) }}
                        className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors"
                      >
                        <td className="p-4 whitespace-nowrap">
                          {p.type === "product" ? (
                            <Badge variant="primary">Goods</Badge>
                          ) : (
                            <Badge variant="accent">Services</Badge>
                          )}
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-display">{p.name}</div>
                          {p.description && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{p.description}</p>
                          )}
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-500 whitespace-nowrap">{p.skuCode || "N/A"}</td>
                        <td className="p-4">
                          {p.hsnSacCode ? (
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md w-fit">
                              <Hash className="w-3 h-3 text-slate-400" />
                              <span>{p.hsnSacCode}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-mono font-extrabold text-slate-800 dark:text-slate-100">
                          ₹{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          <span className="text-[10px] font-semibold text-slate-400"> / {p.unit}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                            {p.gstRate}% GST
                          </span>
                          {p.cessRate ? (
                            <span className="block text-[9px] text-slate-400 mt-0.5">+{p.cessRate}% Cess</span>
                          ) : null}
                        </td>
                        
                        {/* Stock status skeleton column */}
                        <td className="p-4">
                          {isProduct ? (
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold font-mono ${isLowStock ? "text-rose-500" : "text-slate-600 dark:text-slate-300"}`}>
                                {casted.quantityInStock !== undefined ? casted.quantityInStock : 0} {p.unit}
                              </span>
                              {isLowStock ? (
                                <span className="text-[10px] text-rose-500 flex items-center gap-0.5 mt-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" /> Low Stock
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 mt-0.5">Active catalog</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Billable Service</span>
                          )}
                        </td>

                        {/* Actions column */}
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => initEditProduct(p)}
                              title="Edit specifications"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-indigo-500 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => triggerDeleteConfirm(p)}
                              title="Delete from Catalog"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Simple Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Showing page <b>{currentPage}</b> of <b>{totalPages}</b> ({filteredProducts.length} items cataloged)
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 text-xs"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Catalog Item Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Modify Cataloged Specifications" : "Enroll Inventory Item / Service"}
        size="md"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 py-2 font-sans max-h-[85vh] overflow-y-auto pr-1">
          <Select
            label="Category Classification *"
            options={typeOptions}
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          />

          <Input
            label="Product or Service Name *"
            placeholder="e.g. Enterprise Consulting Hour or Aluminum casting slab"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Detailed Description"
            placeholder="Add brief details about the catalog entry..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU Code"
              placeholder="e.g. SKU-AL-204"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
            <Input
              label={type === "product" ? "Government HSN Code *" : "Government SAC Code *"}
              placeholder={type === "product" ? "e.g. 760120 (Aluminum)" : "e.g. 998311 (Software support)"}
              value={hsnSac}
              onChange={(e) => setHsnSac(e.target.value.replace(/[^0-9]/g, ""))}
              className="font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Base Unit Price (Before GST) *"
              placeholder="e.g. 1250"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <Select
              label="Billing Unit Metric *"
              options={unitOptions}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Standard GST Slab *"
              options={gstRatesOptions}
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
            />
            <Input
              label="Additional Compensation Cess (%)"
              placeholder="0"
              type="number"
              value={cessRate}
              onChange={(e) => setCessRate(e.target.value)}
            />
          </div>

          {/* Future Stock / Inventory Management Skeleton Section */}
          {type === "product" && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <Boxes className="w-4 h-4 text-indigo-500" /> Inventory Stock Tracking (Future Feature)
              </div>
              <p className="text-xs text-slate-400">Initialize stock metrics below. Future updates will automatically deduct stock upon invoice approvals.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Initial Stock Quantity"
                  type="number"
                  value={quantityInStock}
                  onChange={(e) => setQuantityInStock(e.target.value)}
                />
                <Input
                  label="Low Stock Threshold"
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800/80">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" icon={<Check className="w-4 h-4" />}>
              {isEditing ? "Save Specifications" : "Enroll Catalog Item"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirmation Dialog for Permanent Deletion */}
      <Dialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title="Confirm permanent deletion"
        size="sm"
      >
        <div className="space-y-4 py-2 font-sans text-center">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full w-fit mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Delete Cataloged Item?</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Are you absolutely sure you want to permanently delete <b>{productToDelete?.name}</b>? 
            This will remove the default unit price and tax slab calculations for future invoices.
          </p>
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 justify-center">
            <Button variant="outline" className="px-5" onClick={() => setIsConfirmDeleteOpen(false)}>
              No, Keep Item
            </Button>
            <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30 px-5" onClick={handleDeleteProduct}>
              Yes, Delete Permanently
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
