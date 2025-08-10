"use client";

import React, { useState, useEffect } from "react";
import useAxios from "@/utils/useAxios";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Check, ChevronsUpDown, ArrowLeft } from "lucide-react";
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
import Sidebar from "@/components/allsidebar";

export default function EditAllVendorTransactionForm() {
  const api = useAxios();
  const navigate = useNavigate();
  const { vendorTransactionId } = useParams();
  const { branchId }= useParams();

  const [originalVendorTransactionData, setOriginalVendorTransactionData] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    cashout_date: "",
    amount: "",
    cheque_number: "",
    method: "",
    vendor: "",
    desc:"",
  });
  const [vendors, setVendors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewVendorDialog, setShowNewVendorDialog] = useState(false);
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false);
  const [newVendorData, setNewVendorData] = useState({ name: "", brand: "" });
  const [newBrandName, setNewBrandName] = useState("");
  const [openVendor, setOpenVendor] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendorsResponse, brandsResponse, vendorTransactionResponse] = await Promise.all([
          api.get("alltransaction/vendor/branch/" + branchId + "/"),
          api.get("allinventory/brand/branch/" + branchId + "/"),
          api.get(`alltransaction/vendortransaction/${vendorTransactionId}/`)
        ]);
        setVendors(vendorsResponse.data);
        setBrands(brandsResponse.data);
        setOriginalVendorTransactionData(vendorTransactionResponse.data);
        setFormData({
          date: vendorTransactionResponse.data.date,
          cashout_date: vendorTransactionResponse.data.cashout_date || "",
          cheque_number: vendorTransactionResponse.data.cheque_number || "",
          vendor: vendorTransactionResponse.data.vendor.toString(),
          amount: vendorTransactionResponse.data.amount.toString(),
          method: vendorTransactionResponse.data.method,
          desc: vendorTransactionResponse.data.desc
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, [vendorTransactionId]);

  const handleDelete = async () => {
    try {
      await api.delete(`alltransaction/vendortransaction/${vendorTransactionId}/`);
      navigate("/vendor-transactions/branch/" + branchId);
    } catch (error) {
      console.error("Error deleting vendor transaction:", error);
      setError("Failed to delete vendor transaction. Please try again.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleVendorChange = (value) => {
    if (value === "new") {
      setShowNewVendorDialog(true);
    } else {
      setFormData({ ...formData, vendor: value });
    }
    setOpenVendor(false);
  };

  const handleNewVendorChange = (e) => {
    const { name, value } = e.target;
    setNewVendorData({ ...newVendorData, [name]: value });
  };

  const handleNewVendorBrandChange = (value) => {
    if (value === "new") {
      setShowNewBrandDialog(true);
    } else {
      setNewVendorData({ ...newVendorData, brand: value });
    }
    setOpenBrand(false);
  };

  const handleNewBrandChange = (e) => {
    setNewBrandName(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubLoading(true);
      const response = await api.patch(`alltransaction/vendortransaction/${vendorTransactionId}/`, formData);
      console.log("Response:", response.data);
      navigate("/vendor-transactions/branch/" + branchId);
    } catch (error) {
      console.error("Error updating data:", error);
      setError("Failed to update vendor transaction. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("alltransaction/vendor/", newVendorData);
      console.log("New Vendor Added:", response.data);
      setVendors((prevVendors) => [...prevVendors, response.data]);
      setFormData({ ...formData, vendor: response.data.id.toString() });
      setNewVendorData({ name: "", brand: "" });
      setShowNewVendorDialog(false);
    } catch (error) {
      console.error("Error adding vendor:", error);
      setError("Failed to add new vendor. Please try again.");
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("allinventory/brand/", { name: newBrandName });
      console.log("New Brand Added:", response.data);
      setBrands((prevBrands) => [...prevBrands, response.data]);
      setNewBrandName("");
      setShowNewBrandDialog(false);
      setNewVendorData((prevData) => ({ ...prevData, brand: response.data.id.toString() }));
    } catch (error) {
      console.error("Error adding brand:", error);
      setError("Failed to add new brand. Please try again.");
    }
  };

  const hasFormChanged = () => {
    if (!originalVendorTransactionData) return false;
    
    return (
      formData.date !== originalVendorTransactionData.date ||
      formData.vendor !== originalVendorTransactionData.vendor.toString() ||
      formData.amount !== originalVendorTransactionData.amount.toString() ||
      formData.method !== originalVendorTransactionData.method ||
      formData.cashout_date !== (originalVendorTransactionData.cashout_date || "") ||
      formData.cheque_number !== (originalVendorTransactionData.cheque_number || "") ||
      formData.desc !== originalVendorTransactionData.desc
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate("/vendor-transactions/branch/" + branchId)}
            variant="outline"
            className="mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vendor Transactions
          </Button>

          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">
              Edit Vendor Transaction
            </h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label
                    htmlFor="date"
                    className="text-sm font-medium text-white mb-2"
                  >
                    Date
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
                  <Label
                    htmlFor="method"
                    className="text-sm font-medium text-white mb-2"
                  >
                    Payment Method
                  </Label>
                  <select
                    id="method"
                    name="method"
                    value={formData.method}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 h-9 p-2 focus:border-purple-500 rounded-md"
                    required
                  >
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>

                  </select>
                </div>

                {formData.method === "cheque" && (
                  <>
                    <div className="flex flex-col">
                      <Label
                        htmlFor="cashout_date"
                        className="text-sm font-medium text-white mb-2"
                      >
                        cashout Date
                      </Label>
                      <Input
                        type="date"
                        id="cashout_date"
                        name="cashout_date"
                        value={formData.cashout_date}
                        onChange={handleChange}
                        className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label
                        htmlFor="cheque_number"
                        className="text-sm font-medium text-white mb-2"
                      >
                        Cheque No.
                      </Label>
                      <Input
                        type="text"
                        id="cheque_number"
                        name="cheque_number"
                        placeholder="Enter cheque number"
                        value={formData.cheque_number}
                        onChange={handleChange}
                        className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col">
                <Label
                  htmlFor="vendor"
                  className="text-sm font-medium text-white mb-2"
                >
                  Vendor
                </Label>
                <Popover open={openVendor} onOpenChange={setOpenVendor}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openVendor}
                      className="w-full justify-between bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      {formData.vendor
                        ? vendors.find(
                            (vendor) => vendor.id.toString() === formData.vendor
                          )?.name
                        : "Select a vendor..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-slate-800 border-slate-700">
                    <Command className="bg-slate-700 border-slate-600">
                      <CommandInput
                        placeholder="Search vendor..."
                        className="bg-slate-700 text-white"
                      />
                      <CommandList>
                        <CommandEmpty>No vendor found.</CommandEmpty>
                        <CommandGroup>
                          {vendors.map((vendor) => (
                            <CommandItem
                              key={vendor.id}
                              onSelect={() =>
                                handleVendorChange(vendor.id.toString())
                              }
                              className="text-white hover:bg-slate-600"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.vendor === vendor.id.toString()
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {vendor.name}
                            </CommandItem>
                          ))}
                          <CommandItem
                            onSelect={() => handleVendorChange("new")}
                            className="text-white hover:bg-slate-600"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add a new vendor
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col">
                <Label
                  htmlFor="amount"
                  className="text-sm font-medium text-white mb-2"
                >
                  Amount
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
              <div className="flex flex-col">
                <Label
                  htmlFor="amount"
                  className="text-sm font-medium text-white mb-2"
                >
                  Description
                </Label>
                <Input
                  type="desc"
                  id="desc"
                  name="desc"
                  value={formData.desc}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter description"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={!hasFormChanged() || subLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Update Vendor Transaction
              </Button>
            </form>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  className="w-full bg-red-600 mt-6 hover:bg-red-700 text-white"
                >
                  Delete Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    This action cannot be undone. This will permanently delete your vendor transaction
                    and remove your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <Button
                  type="button"
                  className="w-full bg-red-600 mt-6 hover:bg-red-700 text-white"
                  onClick={handleDelete}
                >
                  Delete Transaction
                </Button>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showNewVendorDialog}
              onOpenChange={setShowNewVendorDialog}
            >
              <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Add New Vendor</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Enter the details of the new vendor you want to add.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="newVendorName"
                      className="text-right text-white"
                    >
                      Name
                    </Label>
                    <Input
                      id="newVendorName"
                      name="name"
                      value={newVendorData.name}
                      onChange={handleNewVendorChange}
                      className="col-span-3 bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter vendor name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="newVendorBrand"
                      className="text-right text-white"
                    >
                      Brand
                    </Label>
                    <div className="col-span-3">
                      <Popover open={openBrand} onOpenChange={setOpenBrand}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openBrand}
                            className="w-full justify-between bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                          >
                            {newVendorData.brand
                              ? brands.find(
                                  (brand) =>
                                    brand.id.toString() === newVendorData.brand
                                )?.name
                              : "Select a brand..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-slate-700 border-slate-600">
                          <Command className="bg-slate-700 border-slate-600">
                            <CommandInput
                              placeholder="Search brand..."
                              className="bg-slate-700 text-white"
                            />
                            <CommandList>
                              <CommandEmpty>No brand found.</CommandEmpty>
                              <CommandGroup>
                                {brands.map((brand) => (
                                  <CommandItem
                                    key={brand.id}
                                    onSelect={() =>
                                      handleNewVendorBrandChange(
                                        brand.id.toString()
                                      )
                                    }
                                    className="text-white hover:bg-slate-600"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        newVendorData.brand ===
                                          brand.id.toString()
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {brand.name}
                                  </CommandItem>
                                ))}
                                <CommandItem
                                  onSelect={() =>
                                    handleNewVendorBrandChange("new")
                                  }
                                  className="text-white hover:bg-slate-600"
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add a new brand
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={handleAddVendor}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Add Vendor
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showNewBrandDialog}
              onOpenChange={setShowNewBrandDialog}
            >
              <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Enter the name of the new category you want to add.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="newBrandName"
                      className="text-right text-white"
                    >
                      Brand Name
                    </Label>
                    <Input
                      id="newBrandName"
                      value={newBrandName}
                      onChange={handleNewBrandChange}
                      className="col-span-3 bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter brand name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={handleAddBrand}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Add Brand
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}