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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusCircle,
  Trash2,
  Check,
  ChevronsUpDown,
  ArrowLeft,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NewProductDialog from "@/components/newProductDialog"; // Same as in purchase form

function EditAllPurchaseTransactionForm() {
  const api = useAxios();
  const navigate = useNavigate();
  const { purchaseId, branchId } = useParams();

  const [originalPurchaseData, setOriginalPurchaseData] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    branch: "",
    purchase: [],
    vendor: "",
    bill_no: "",
    method: "",
    cheque_number: "",
    cashout_date: "",
  });
  const [products, setProducts] = useState([]);
  const [returned, setReturned] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [branch, setBranch] = useState([]);
  const [userBranch, setUserBranch] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [showNewVendorDialog, setShowNewVendorDialog] = useState(false);
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: "",
    brand: "",
    cost_price: "",
    selling_price: "",
    branch: branchId,
  });
  const [newVendorData, setNewVendorData] = useState({ name: "", brand: "" , branch: branchId});
  const [newBrandName, setNewBrandName] = useState("");
  const [openProduct, setOpenProduct] = useState([]);
  const [openVendor, setOpenVendor] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [returns, setReturns] = useState([]);
  
  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [currentReturnPurchase, setCurrentReturnPurchase] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          productsResponse,
          vendorsResponse,
          brandsResponse,
          purchaseResponse,
          branchResponse,
          userBranchResponse,
        ] = await Promise.all([
          api.get("allinventory/product/branch/" + branchId + "/"),
            api.get("alltransaction/vendor/branch/" + branchId + "/"),
            api.get("allinventory/brand/branch/" + branchId + "/"),
          api.get(`alltransaction/purchasetransaction/${purchaseId}/`),
          api.get("enterprise/branch/" + branchId + "/"),
          api.get("enterprise/getbranch/"),
        ]);
        setProducts(productsResponse.data);
        setVendors(vendorsResponse.data);
        setBrands(brandsResponse.data);
        setBranch(branchResponse.data);
        setUserBranch(userBranchResponse.data);
        setOriginalPurchaseData(purchaseResponse.data);
        setFormData({
          date: purchaseResponse.data.date,
          branch: purchaseResponse.data.branch
            ? purchaseResponse.data.branch.toString()
            : "",
          purchase: purchaseResponse.data.purchase.map((p) => ({
            ...p,
            product: p.product.toString(),
            quantity: p.quantity.toString(),
            unit_price: p.unit_price.toString(),
            total_price: p.total_price.toString(),
          })),
          vendor: purchaseResponse.data.vendor.toString(),
          bill_no: purchaseResponse.data.bill_no?.toString(),
          method: purchaseResponse.data.method || "",
          cheque_number: purchaseResponse.data.cheque_number || null,
          cashout_date: purchaseResponse.data.cashout_date || null,
        });
        setOpenProduct(new Array(purchaseResponse.data.purchase.length).fill(false));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, [purchaseId]);


  useEffect(() => {
    const brandToDisplay = vendors?.find(
      (vendor) => vendor.id.toString() === formData.vendor.toString()
    )?.brand;
    console.log(brandToDisplay);
    const filtered = products?.filter(
      (product) => product.brand === brandToDisplay
    );
    setFilteredProducts(filtered);
  }, [vendors]);
  
  
  useEffect(() => {
    originalPurchaseData?.purchase?.map((p => {
      if (p.returned) {
        console.log(p)
        setReturned(true)
      }})
    )
  }, [originalPurchaseData])

  console.log(returned)

  const handleDelete = (e) => {
    api.delete(`alltransaction/purchasetransaction/${purchaseId}/`);
    navigate("/purchases/branch/" + branchId);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleMethodChange = (value) => {
    setFormData({ ...formData, method: value });
  };

  const handlePurchaseChange = (index, e) => {
    if (formData.purchase[index].returned) return;
    const { name, value } = e.target;
    const newPurchase = [...formData.purchase];
    newPurchase[index] = { ...newPurchase[index], [name]: value };
    // Update total price if unit price and quantity are available
    const { unit_price, quantity } = newPurchase[index];
    if (unit_price && quantity) {
      newPurchase[index].total_price = calculateTotal(unit_price, quantity);
    }
    setFormData({ ...formData, purchase: newPurchase });
  };

  const handleProductChange = (index, value) => {
    if (value === "new") {
      setShowNewProductDialog(true);
    } else {
      const newPurchase = [...formData.purchase];
      newPurchase[index] = { ...newPurchase[index], product: value };
      setFormData((prevState) => ({
        ...prevState,
        purchase: newPurchase,
      }));
    }
    const newOpenProduct = [...openProduct];
    newOpenProduct[index] = false;
    setOpenProduct(newOpenProduct);
  };

  const handleVendorChange = (value) => {
    if (value === "new") {
      setShowNewVendorDialog(true);
    } else {
      setFormData((prevState) => ({
        ...prevState,
        vendor: value,
      }));
      const selectedVendor = vendors.find(
        (vendor) => vendor.id.toString() === value
      );
      if (selectedVendor) {
        const filtered = products.filter(
          (product) => product.brand === selectedVendor.brand
        );
        setFilteredProducts(filtered);
      }
    }
    setOpenVendor(false);
  };

  const handleNewProductChange = (e) => {
    const { name, value } = e.target;
    setNewProductData({ ...newProductData, [name]: value });
  };

  const handleNewVendorChange = (e) => {
    const { name, value } = e.target;
    setNewVendorData({ ...newVendorData, [name]: value });
  };

  const handleNewProductBrandChange = (value) => {
    if (value === "new") {
      setShowNewBrandDialog(true);
    } else {
      setNewProductData({ ...newProductData, brand: value });
    }
    setOpenBrand(false);
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

  const handleAddPurchase = () => {
    setFormData((prevState) => ({
      ...prevState,
      purchase: [
        ...prevState.purchase,
        { product: "", unit_price: "", quantity: "", total_price: "" },
      ],
    }));
    setOpenProduct((prevState) => [...prevState, false]);
  };

  const handleRemovePurchase = (index) => {
    if (formData.purchase[index].returned) return;
    setFormData((prevState) => ({
      ...prevState,
      purchase: prevState.purchase.filter((_, i) => i !== index),
    }));
    setOpenProduct((prevState) => prevState.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubLoading(true);
      const response = await api.patch(
        `alltransaction/purchasetransaction/${purchaseId}/`,
        formData
      );
      console.log("Response:", response.data);
      navigate("/purchases/branch/" + branchId);
    } catch (error) {
      console.error("Error updating data:", error);
      setError("Failed to update purchase transaction. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("allinventory/product/", newProductData);
      console.log("New Product Added:", response.data);
      setProducts((prevProducts) => [...prevProducts, response.data]);
      setNewProductData({ name: "", brand: "", cost_price: "", selling_price: "", branch: branchId });
      setShowNewProductDialog(false);
    } catch (error) {
      console.error("Error adding product:", error);
      setError("Failed to add new product. Please try again.");
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("alltransaction/vendor/", newVendorData);
      console.log("New Vendor Added:", response.data);
      setVendors((prevVendors) => [...prevVendors, response.data]);
      setFormData((prevState) => ({
        ...prevState,
        vendor: response.data.id.toString(),
      }));
      setNewVendorData({ name: "", brand: "", branch: branchId, due: 0 });
      setShowNewVendorDialog(false);
    } catch (error) {
      console.error("Error adding vendor:", error);
      setError("Failed to add new vendor. Please try again.");
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("allinventory/brand/", {
        name: newBrandName,
        branch: branchId,
      });
      console.log("New Brand Added:", response.data);
      setBrands((prevBrands) => [...prevBrands, response.data]);
      setNewBrandName("");
      setShowNewBrandDialog(false);
      setNewProductData((prevData) => ({
        ...prevData,
        brand: response.data.id.toString(),
      }));
      setNewVendorData((prevData) => ({
        ...prevData,
        brand: response.data.id.toString(),
      }));
    } catch (error) {
      console.error("Error adding brand:", error);
      setError("Failed to add new brand. Please try again.");
    }
  };

  const calculateTotal = (price, quantity) => {
    return (price * quantity).toFixed(2);
  };

  // Modified return handlers
  const handleReturnClick = (purchase) => {
    setCurrentReturnPurchase(purchase);
    setReturnQuantity("");
    setReturnDialogOpen(true);
  };

  const handleReturnConfirm = () => {
    if (!currentReturnPurchase || !returnQuantity) return;

    const qty = parseFloat(returnQuantity);
    const maxQty = parseFloat(currentReturnPurchase.quantity);

    if (qty <= 0 || qty > maxQty) {
      setError(`Return quantity must be between 1 and ${maxQty}`);
      return;
    }

    setReturns((r) => [
      ...r,
      {
        id: currentReturnPurchase.id,
        quantity: qty,
      },
    ]);

    setFormData((prev) => ({
      ...prev,
      purchase: prev.purchase.map((p) =>
        p.id === currentReturnPurchase.id ? { ...p, returned: true } : p
      ),
    }));

    setReturnDialogOpen(false);
    setCurrentReturnPurchase(null);
    setReturnQuantity("");
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    setSubLoading(true);
    try {
      await api.post("alltransaction/purchase-return/", {
        returns: returns, // Changed to send array of {id, quantity}
        purchase_transaction_id: purchaseId,
        branch: branchId,
      });
      navigate("/purchases/branch/" + branchId);
    } catch (err) {
      console.error(err);
      setError("Failed to process return. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  const hasFormChanged = () => {
    if (!originalPurchaseData) return false;
    return (
      formData.date !== originalPurchaseData.date ||
      formData.branch !== originalPurchaseData.branch.toString() ||
      formData.vendor !== originalPurchaseData.vendor.toString() ||
      formData.bill_no !== originalPurchaseData.bill_no?.toString() ||
      formData.purchase.length !== originalPurchaseData.purchase.length ||
      formData.method !== originalPurchaseData.method ||
      formData.cheque_number !== originalPurchaseData.cheque_number ||
      formData.cashout_date !== originalPurchaseData.cashout_date ||
      formData.purchase.some((purchase, index) => {
        const originalPurchase = originalPurchaseData.purchase[index];
        return (
          purchase.product !== originalPurchase.product.toString() ||
          purchase.imei_number !== originalPurchase.imei_number ||
          purchase.unit_price !== originalPurchase.unit_price.toString() ||
          purchase.quantity !== originalPurchase.quantity.toString() ||
          purchase.total_price !== originalPurchase.total_price.toString()
        );
      })
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        Loading...
      </div>
    );
  }
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow p-4 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto lg:ml-64">
          <div className="mb-6 flex justify-end">
            <Button
            onClick={() => navigate("/purchases/branch/" + branchId)}
              variant="outline"
              className="px-4 py-2 text-black text-right border-white hover:bg-gray-700 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Button>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">
              Edit Purchase Transaction
            </h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label htmlFor="date" className="text-sm font-medium text-white mb-2">
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
                  <Label htmlFor="bill_no" className="text-sm font-medium text-white mb-2">
                    Bill No.
                  </Label>
                  <Input
                    type="text"
                    id="bill_no"
                    name="bill_no"
                    placeholder="Enter bill number"
                    value={formData.bill_no}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Branch Select */}
              {/* <div className="flex flex-col">
                <Label htmlFor="branch" className="text-sm font-medium text-white mb-2">
                  Branch
                </Label>
                <Select
                  onValueChange={(value) => setFormData({ ...formData, branch: value })}
                  value={formData.branch}
                >
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {userBranch && Object.keys(userBranch).length > 0 ? (
                      <SelectItem value={userBranch.id.toString()} className="text-white">
                        {userBranch.name}
                      </SelectItem>
                    ) : (
                      branch.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()} className="text-white">
                          {b.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Vendor Select */}
              <div className="flex flex-col">
                <Label htmlFor="vendor" className="text-sm font-medium text-white mb-2">
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
                        ? vendors.find((vendor) => vendor.id.toString() === formData.vendor)
                            ?.name
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
                      <CommandList className="max-h-[200px] overflow-auto">
                        <CommandEmpty>No vendor found.</CommandEmpty>
                        <CommandGroup>
                          {vendors.map((vendor) => (
                            <CommandItem
                              key={vendor.id}
                              onSelect={() => handleVendorChange(vendor.id.toString())}
                              className="text-white hover:bg-slate-600"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.vendor === vendor.id.toString() ? "opacity-100" : "opacity-0"
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

              <h3 className="text-xl font-semibold mb-2 text-white">Purchases</h3>
              {formData.purchase.map((purchase, index) => (
                <div key={index} className="bg-slate-700 p-4 rounded-md shadow mb-4">
                  <div className="flex justify-between">
                    <h4 className="text-lg font-semibold mb-4 text-white">Purchase {index + 1}</h4>
                    <Button
                      type="button"
                      className="bg-blue-500 hover:bg-blue-600"
                      disabled={purchase.returned}
                      onClick={() => handleReturnClick(purchase)}
                    >
                      Return
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <Label htmlFor={`product-${index}`} className="text-sm font-medium text-white mb-2">
                        Product
                      </Label>
                      <Popover
                        open={openProduct[index]}
                        onOpenChange={(open) => {
                          const newOpenProduct = [...openProduct];
                          newOpenProduct[index] = open;
                          setOpenProduct(newOpenProduct);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={purchase.returned}
                            aria-expanded={openProduct[index]}
                            className="w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                          >
                            {purchase.product
                              ? products.find((product) => product.id.toString() === purchase.product)
                                  ?.name
                              : "Select a product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-slate-700 border-slate-600">
                          <Command className="bg-slate-700 border-slate-600">
                            <CommandInput
                              placeholder="Search product..."
                              className="bg-slate-700 text-white"
                            />
                            <CommandList className="max-h-[200px] overflow-auto">
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {filteredProducts.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    onSelect={() => handleProductChange(index, product.id.toString())}
                                    className="text-white hover:bg-slate-600"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        purchase.product === product.id.toString() ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {product.name}
                                  </CommandItem>
                                ))}
                                <CommandItem
                                  onSelect={() => handleProductChange(index, "new")}
                                  className="text-white hover:bg-slate-600"
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add a new product
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor={`quantity-${index}`} className="text-sm font-medium text-white mb-2">
                        Quantity
                      </Label>
                      <Input
                        type="number"
                        id={`quantity-${index}`}
                        name="quantity"
                        value={purchase.quantity}
                        onChange={(e) => handlePurchaseChange(index, e)}
                        className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter quantity"
                        disabled={purchase.returned}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor={`price-${index}`} className="text-sm font-medium text-white mb-2">
                        Unit Price
                      </Label>
                      <Input
                        type="number"
                        id={`price-${index}`}
                        name="unit_price"
                        value={purchase.unit_price}
                        onChange={(e) => handlePurchaseChange(index, e)}
                        className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter unit price"
                        disabled={purchase.returned}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor={`total_price-${index}`} className="text-sm font-medium text-white mb-2">
                        Total Price
                      </Label>
                      <Input
                        type="number"
                        id={`total_price-${index}`}
                        name="total_price"
                        value={calculateTotal(purchase.unit_price, purchase.quantity)}
                        onChange={(e) => handlePurchaseChange(index, e)}
                        className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                        required
                      />
                    </div>
                  </div>
                  {index > 0 && !purchase.returned && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleRemovePurchase(index)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Purchase
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex flex-col">
                <Label htmlFor="method" className="text-sm font-medium text-white mb-2">
                  Payment Method
                </Label>
                <Select onValueChange={handleMethodChange} value={formData.method}>
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="cash" className="text-white">Cash</SelectItem>
                    <SelectItem value="cheque" className="text-white">Cheque</SelectItem>
                    <SelectItem value="credit" className="text-white">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.method === "cheque" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <Label htmlFor="cheque_number" className="text-sm font-medium text-white mb-2">
                      Cheque Number
                    </Label>
                    <Input
                      type="text"
                      id="cheque_number"
                      name="cheque_number"
                      value={formData.cheque_number}
                      onChange={handleChange}
                      className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label htmlFor="cashout_date" className="text-sm font-medium text-white mb-2">
                      Cheque Date
                    </Label>
                    <Input
                      type="date"
                      id="cashout_date"
                      name="cashout_date"
                      value={formData.cashout_date}
                      onChange={handleChange}
                      className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </div>
              )}
            </form>

            {
              returned && (
                <p className="text-red-400 mt-4">
                  Returned purchases cannot be modified or deleted. Please delete the purchase return if you want to make changes.
                </p>
              )
            }

            <Button
              type="button"
              className="w-full bg-green-600 hover:bg-green-700 text-white mt-5"
              onClick={(e) => handleReturn(e)}
              disabled={returns.length === 0 || subLoading || returned}
            >
              Process Returns
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" className="w-full bg-red-600 mt-6 hover:bg-red-700 text-white" disabled={returned}>
                  Delete Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    This action cannot be undone. This will permanently delete your transaction.
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

            {/* Return Quantity Dialog */}
            <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
              <DialogContent className="bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Return Item</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Enter the quantity you'd like to return for this item. Maximum
                    allowed: {currentReturnPurchase?.quantity}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <Label htmlFor="returnQuantity" className="text-sm mb-1 block">
                    Quantity to return
                  </Label>
                  <Input
                    id="returnQuantity"
                    type="number"
                    value={returnQuantity}
                    min="1"
                    max={currentReturnPurchase?.quantity}
                    onChange={(e) => setReturnQuantity(e.target.value)}
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>
                {error && <p className="text-red-400 mt-2">{error}</p>}
                <DialogFooter className="flex justify-end space-x-2 mt-4">
                  <Button
                    onClick={() => setReturnDialogOpen(false)}
                    variant="outline"
                    className="text-white bg-gray-600 hover:bg-gray-700 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReturnConfirm}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Confirm Return
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New Product Dialog */}
            <NewProductDialog
              open={showNewProductDialog}
              setOpen={setShowNewProductDialog}
              newProductData={newProductData}
              handleNewProductChange={handleNewProductChange}
              handleNewProductBrandChange={handleNewProductBrandChange}
              handleAddProduct={handleAddProduct}
              brands={brands}
              openBrand={openBrand}
              setOpenBrand={setOpenBrand}
              branches={branch}
              userBranch={userBranch}
              selectedBranch={formData.branch}
            />

            {/* Add New Vendor Dialog */}
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
                    <Label htmlFor="newVendorName" className="text-right text-white">
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
                    <Label htmlFor="newVendorBrand" className="text-right text-white">
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
                                  (brand) => brand.id.toString() === newVendorData.brand
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
                            <CommandList className="max-h-[200px] overflow-auto">
                              <CommandEmpty>No brand found.</CommandEmpty>
                              <CommandGroup>
                                {brands.map((brand) => (
                                  <CommandItem
                                    key={brand.id}
                                    onSelect={() =>
                                      handleNewVendorBrandChange(brand.id.toString())
                                    }
                                    className="text-white hover:bg-slate-600"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        newVendorData.brand === brand.id.toString()
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {brand.name}
                                  </CommandItem>
                                ))}
                                <CommandItem
                                  onSelect={() => handleNewVendorBrandChange("new")}
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

            {/* Add New Brand Dialog */}
            <Dialog
              open={showNewBrandDialog}
              onOpenChange={setShowNewBrandDialog}
            >
              <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Add New Brand</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Enter the name of the new brand you want to add.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newBrandName" className="text-right text-white">
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

export default EditAllPurchaseTransactionForm;