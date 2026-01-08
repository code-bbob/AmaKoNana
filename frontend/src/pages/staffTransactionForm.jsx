"use client";

import React, { useState, useEffect } from "react";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ChevronsUpDown, Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/allsidebar";
import { useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function StaffTransactionForm() {
  const api = useAxios();
  const navigate = useNavigate();
  const { branchId } = useParams();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    staff: "",
    amount: "",
    desc: "",
    branch: branchId,
    staff_type: "salary",
    transaction_type: "Payment",
  });
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openStaff, setOpenStaff] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  console.log(formData)

  // Incentive entries: dynamic rows with product selection
  const [entries, setEntries] = useState([{ product: "", product_name: "", quantity: "", rate: "" }]);
  const [openProduct, setOpenProduct] = useState([false]);
  const [products, setProducts] = useState([]);
  const [showNewIncentive, setShowNewIncentive] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [newIncentive, setNewIncentive] = useState({ name: "", rate: "" });
  const [savingIncentive, setSavingIncentive] = useState(false);

  // Auto-calc amount for incentive type
  useEffect(() => {
    if (formData.staff_type === "incentive") {
        const total = entries.reduce((sum, e) => {
          const q = parseFloat(e.quantity) || 0;
          const r = parseFloat(e.rate) || 0;
          return sum + q * r;
        }, 0);
      setFormData((prev) => ({ ...prev, amount: total }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, formData.staff_type]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Adjust this endpoint to match your API for staff retrieval
  const staffResponse = await api.get(`alltransaction/staff/branch/${branchId}/`);
  const productRes = await api.get(`allinventory/incentiveproduct/branch/${branchId}/`);
        setStaffMembers(staffResponse.data);
  setProducts(productRes.data?.results ?? productRes.data ?? []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleStaffChange = (value) => {
    setFormData((prevState) => ({
      ...prevState,
      staff: value,
    }));
    setOpenStaff(false);
  };

  // Validation helper
  const isFormValid = () => {
    if (!formData.date?.trim()) return false;
    if (!formData.staff?.trim()) return false;
    if (!formData.amount || parseFloat(formData.amount) <= 0) return false;
    if (!formData.desc?.trim()) return false;
    if (!formData.staff_type?.trim()) return false;
    if (!formData.transaction_type?.trim()) return false;
    
    if (formData.staff_type === "incentive") {
      const hasValidEntry = entries.some(
        (e) => e.product && e.quantity && e.rate && 
               parseFloat(e.quantity) > 0 && parseFloat(e.rate) > 0
      );
      if (!hasValidEntry) return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.date.trim()) {
      setError("Date is required");
      return;
    }
    if (!formData.staff.trim()) {
      setError("Staff member is required");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Amount is required and must be greater than 0");
      return;
    }
    if (!formData.desc.trim()) {
      setError("Description is required");
      return;
    }
    if (!formData.staff_type.trim()) {
      setError("Staff Type is required");
      return;
    }
    if (!formData.transaction_type.trim()) {
      setError("Transaction Type is required");
      return;
    }
    
    // For incentive type, validate that at least one entry has all fields filled
    if (formData.staff_type === "incentive") {
      const hasValidEntry = entries.some(
        (e) => e.product && e.quantity && e.rate && 
               parseFloat(e.quantity) > 0 && parseFloat(e.rate) > 0
      );
      if (!hasValidEntry) {
        setError("At least one complete incentive entry (product, quantity, rate) is required");
        return;
      }
    }
    
    try {
      setSubLoading(true);
      setError(null);
      // Build payload, including incentive details when applicable
      const payload = { ...formData };
      if (formData.staff_type === "incentive") {
        const details = entries
          .filter((e) => (e.product || e.quantity || e.rate))
          .map((e) => {
            const quantity = parseFloat(e.quantity) || 0;
            const rate = parseFloat(e.rate) || 0;
            return {
              product: e.product ? Number(e.product) : null,
              quantity,
              rate,
              total: quantity * rate,
            };
          });
        payload.staff_transaction_details = details;
      }
      const response = await api.post("alltransaction/stafftransaction/", payload);
      console.log("Response:", response.data);
      navigate("/staff-transactions/branch/" + branchId);
    } catch (err) {
      console.error("Error posting data:", err);
      setError("Failed to submit staff transaction. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  const saveNewIncentive = async () => {
    if (!newIncentive.name?.trim() || isNaN(parseFloat(newIncentive.rate))) return;
    try {
      setSavingIncentive(true);
      const payload = { name: newIncentive.name.trim(), rate: parseFloat(newIncentive.rate), branch: Number(branchId) };
      const r = await api.post("allinventory/incentiveproduct/", payload);
      const created = r.data;
      setProducts((prev) => [created, ...prev]);
      if (activeRow !== null) {
        setEntries((prev) => prev.map((it, i) => (
          i === activeRow ? { ...it, product: created.id.toString(), product_name: created.name, rate: created.rate } : it
        )));
      }
      setShowNewIncentive(false);
      setNewIncentive({ name: "", rate: "" });
      setActiveRow(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingIncentive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate("/staff-transactions/branch/" + branchId)}
            variant="outline"
            className="mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Staff Transactions
          </Button>

          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">
              Add Staff Transaction
            </h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex flex-col">
                  <Label htmlFor="date" className="text-sm font-medium text-white mb-2">
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="staff" className="text-sm font-medium text-white mb-2">
                    Staff <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={openStaff} onOpenChange={setOpenStaff}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openStaff}
                        className="w-full justify-between bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                      >
                        {formData.staff
                          ? staffMembers.find(
                            (staff) => staff.id.toString() === formData.staff
                          )?.name
                          : "Select a staff..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-slate-800 border-slate-700">
                      <Command className="bg-slate-700 border-slate-600">
                        <CommandInput placeholder="Search staff..." className="bg-slate-700 text-white" />
                        <CommandList>
                          <CommandEmpty>No staff found.</CommandEmpty>
                          <CommandGroup>
                            {staffMembers.map((staff) => (
                              <CommandItem
                                key={staff.id}
                                onSelect={() => handleStaffChange(staff.id.toString())}
                                className="text-white hover:bg-slate-600"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.staff === staff.id.toString() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {staff.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="staff_type" className="text-sm font-medium text-white mb-2">
                    Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.staff_type} onValueChange={(value) => handleChange({ target: { name: "staff_type", value } })}>
                    <SelectTrigger className=" bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="incentive">Incentive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="transaction_type" className="text-sm font-medium text-white mb-2">
                    Transaction Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.transaction_type} onValueChange={(value) => handleChange({ target: { name: "transaction_type", value } })}>
                    <SelectTrigger className=" bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500">
                      <SelectValue placeholder="Transaction Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="Payment">Payment</SelectItem>
                      <SelectItem value="Salary Credited">Salary Credited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col">
                <Label htmlFor="desc" className="text-sm font-medium text-white mb-2">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="desc"
                  name="desc"
                  value={formData.desc}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter description"
                  required
                />
              </div>

              {formData.staff_type === "incentive" && (
                <div className="space-y-4">
                  {entries.map((entry, idx) => (
                    <div key={idx} className="bg-slate-700 text-white p-4 rounded-md shadow mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {/* Product combobox */}
                        <div className="flex flex-col">
                          <Label className="text-sm font-medium text-white mb-2">Product</Label>
                          <Popover open={openProduct[idx]} onOpenChange={(o) => setOpenProduct((prev) => {
                            const copy = [...prev];
                            copy[idx] = o;
                            return copy;
                          })}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openProduct[idx]}
                                className="w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                              >
                                {entry.product
                                  ? (products.find((p) => p.id.toString() === entry.product)?.name || "Select a product...")
                                  : "Select a product..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0 bg-slate-800 border-slate-700">
                              <Command className="bg-slate-700 border-slate-600">
                                <CommandInput placeholder="Search product..." className="bg-slate-700 text-white" />
                                <CommandList>
                                  <CommandEmpty>No product found.</CommandEmpty>
                                  {/* New Incentive option inside combobox */}
                                  <CommandItem
                                    key="__new_incentive__"
                                    onSelect={() => {
                                      setActiveRow(idx);
                                      setShowNewIncentive(true);
                                      setOpenProduct((prev) => {
                                        const copy = [...prev];
                                        copy[idx] = false;
                                        return copy;
                                      });
                                    }}
                                    className="text-purple-300 hover:bg-slate-600"
                                  >
                                    <Plus className="mr-2 h-4 w-4" /> Add New Incentive
                                  </CommandItem>
                                  <CommandGroup>
                                    {products.map((p) => (
                                      <CommandItem
                                        key={p.id}
                                        onSelect={() => {
                                          setEntries((prev) => prev.map((it, i) => (
                                            i === idx
                                              ? { ...it, product: p.id.toString(), product_name: p.name, rate: p.rate }
                                              : it
                                          )));
                                          setOpenProduct((prev) => {
                                            const copy = [...prev];
                                            copy[idx] = false;
                                            return copy;
                                          });
                                        }}
                                        className="text-white hover:bg-slate-600"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            entry.product === p.id.toString() ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {p.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Quantity */}
                        <div>
                          <Label className="text-sm font-medium text-white mb-2 block">Quantity</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={entry.quantity}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEntries((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: v } : it)));
                            }}
                            className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                            placeholder="0"
                          />
                        </div>

                        {/* Rate (auto-filled on select; editable if needed) */}
                        <div>
                          <Label className="text-sm font-medium text-white mb-2 block">Rate</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={entry.rate}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEntries((prev) => prev.map((it, i) => (i === idx ? { ...it, rate: v } : it)));
                            }}
                            className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {entries.length > 1 && (
                        <Button
                          type="button"
                          aria-label="Remove item"
                          size="sm"
                          className="bg-red-600 mt-3 hover:bg-red-700 text-white"
                          onClick={() => setEntries((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" /> Remove Item
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      setEntries((prev) => [...prev, { product: "", product_name: "", quantity: "", rate: "" }]);
                      setOpenProduct((prev) => [...prev, false]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Another
                  </Button>
                </div>
              )}
              <div className="flex flex-col">
                <Label htmlFor="amount" className="text-sm font-medium text-white mb-2">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={subLoading || !isFormValid()}
                className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {subLoading ? "Submitting..." : "Submit Staff Transaction"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      {/* New Incentive Dialog */}
      <Dialog open={showNewIncentive} onOpenChange={(o) => { setShowNewIncentive(o); if (!o) { setNewIncentive({ name: "", rate: "" }); setActiveRow(null); } }}>
        <DialogContent className="bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New Incentive</DialogTitle>
            <DialogDescription className="text-slate-300">Add a new incentive product for this branch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_name">Name</Label>
              <Input id="new_name" className="mt-1 bg-slate-700 border-slate-600 text-white" value={newIncentive.name} onChange={(e) => setNewIncentive((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., Delivery Bonus" />
            </div>
            <div>
              <Label htmlFor="new_rate">Rate</Label>
              <Input id="new_rate" type="number" step="0.01" className="mt-1 bg-slate-700 border-slate-600 text-white" value={newIncentive.rate} onChange={(e) => setNewIncentive((p) => ({ ...p, rate: e.target.value }))} placeholder="e.g., 25" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveNewIncentive} disabled={savingIncentive} className="w-full bg-purple-600 hover:bg-purple-700">
              {savingIncentive ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StaffTransactionForm;

// New Incentive Dialog (mounted within the page tree)
