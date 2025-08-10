"use client";

import React, { useState, useEffect } from "react";
import useAxios from "../utils/useAxios";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  PlusCircle,
  Trash2,
  Check,
  ChevronsUpDown,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Sidebar from "./allsidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NewProductDialog from "@/components/newProductDialog";
import { Checkbox } from "./ui/checkbox";

export default function EditAllSalesTransactionForm() {
  const api = useAxios();
  const navigate = useNavigate();
  const { salesId, branchId } = useParams();

  // Original data
  const [originalSalesData, setOriginalSalesData] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    name: "",
    phone_number: "",
    bill_no: "",
    branch: "",
    sales: [],
    method: "",
    // Debtor fields
    debtor: null,
    amount_paid: null,
    credited_amount: "",
  });

  // Data lists
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [branchList, setBranchList] = useState([]);
  const [userBranch, setUserBranch] = useState({});

  // UI state
  const [openProduct, setOpenProduct] = useState([]);
  const [openBrand, setOpenBrand] = useState(false);
  const [openDebtor, setOpenDebtor] = useState(false);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false);
  const [showNewDebtorDialog, setShowNewDebtorDialog] = useState(false);

  const [vendors, setVendors] = useState([]); // New vendors state
  // New entity data
  const [newProductData, setNewProductData] = useState({ name: "", brand: "" });
  const [newBrandName, setNewBrandName] = useState("");
  const [newDebtorData, setNewDebtorData] = useState({
    name: "",
    phone_number: "",
    due: "",
    branch: branchId, // Assuming debtor belongs to the same branch
  });

  // Loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [returns, setReturns] = useState([]);
  const [returned, setReturned] = useState(false);

  // Delete confirmation
  const [isChecked, setIsChecked] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [modifyStock, setModifyStock] = useState(true);

  // Computed fields
  const [subtotal, setSubtotal] = useState(0);
  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Fetch initial data: products, brands, transaction, debtors
  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, brandRes, saleRes, debtorRes, vendorRes] = await Promise.all([
          api.get(`allinventory/product/branch/${branchId}/`),
          api.get(`allinventory/brand/branch/${branchId}/`),
          api.get(`alltransaction/salestransaction/${salesId}/`),
          api.get(`alltransaction/debtors/branch/${branchId}/`),
          api.get(`alltransaction/vendor/branch/${branchId}/`),
        ]);
        setProducts(prodRes.data);
        setBrands(brandRes.data);
        setDebtors(debtorRes.data);
        setVendors(vendorRes.data);

        const data = saleRes.data;
        setOriginalSalesData(data);
        setFormData({
          date: data.date,
          name: data.name,
          phone_number: data.phone_number,
          bill_no: data.bill_no,
          branch: data.branch?.toString() || "",
          sales: data.sales.map((s) => ({
            ...s,
            product: s.product.toString(),
            unit_price: s.unit_price.toString(),
            quantity: s.quantity.toString(),
            total_price: s.total_price.toString(),
            returned: s.returned,
          })),
          method: data.method,
          debtor: data.debtor,
          amount_paid: data.amount_paid,
          discount: data.discount,
          credited_amount: data.credited_amount?.toString() || "",
        });
        setDiscountValue(data.discount?.toString() || "");
        setOpenProduct(new Array(data.sales.length).fill(false));
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch data");
        setLoading(false);
      }
    }
    fetchData();
  }, [salesId, branchId]);

  // Fetch branch info
  useEffect(() => {
    async function fetchBranch() {
      try {
        const [blRes, ubRes] = await Promise.all([
          api.get("enterprise/branch/"),
          api.get("enterprise/getbranch/"),
        ]);
        setBranchList(blRes.data);
        setUserBranch(ubRes.data);
        if (ubRes.data.id) {
          setFormData((prev) => ({
            ...prev,
            branch: ubRes.data.id.toString(),
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchBranch();
  }, []);

  // Detect if any sale already returned
  useEffect(() => {
    originalSalesData?.sales.forEach((s) => {
      if (s.returned) setReturned(true);
    });
  }, [originalSalesData]);

  // Calculate subtotal
  useEffect(() => {
    const sum = formData.sales.reduce(
      (acc, sale) => acc + (parseFloat(sale.total_price) || 0),
      0
    );
    setSubtotal(sum);
  }, [formData.sales]);

  // Calculate totalAmount after discount
  useEffect(() => {
    const discAmt =
      discountType === "percent"
        ? subtotal * ((parseFloat(discountValue) || 0) / 100)
        : parseFloat(discountValue) || 0;
    setTotalAmount(subtotal - discAmt);
  }, [subtotal, discountType, discountValue]);

  // Update credited_amount when amount_paid changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      credited_amount: (
        totalAmount - (parseFloat(prev.amount_paid) || 0)
      ).toFixed(2),
    }));
  }, [formData.amount_paid, totalAmount]);

  // Handlers
  // Checkbox confirmation handlers
  const handleCheckboxClick = () => {
    // Open confirmation dialog when checking
    if (!isChecked) {
      setIsDialogOpen(true);
    } else {
      // Unchecking resets selection
      setIsChecked(false);
      setModifyStock(true);
    }
  };
  const handleConfirm = () => {
    // User confirmed not to modify stock
    setIsChecked(true);
    setModifyStock(false);
    setIsDialogOpen(false);
  };
  const handleCancel = () => {
    // Close confirmation without changing checkbox
    setIsDialogOpen(false);
  };

  // Handlers
  const calculateTotalPrice = (price, qty) => price * qty;

  // add this alongside your other handlers
const handleNewProductVendorChange = (ids) => {
  setNewProductData(prev => ({ ...prev, vendor: ids }));
};


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaleChange = (index, e) => {
    if (formData.sales[index].returned) return;
    const { name, value } = e.target;
    const updated = [...formData.sales];
    updated[index] = { ...updated[index], [name]: value };
    const { unit_price, quantity } = updated[index];
    if (unit_price && quantity) {
      updated[index].total_price = calculateTotalPrice(
        parseFloat(unit_price),
        parseFloat(quantity)
      ).toString();
    }
    setFormData({ ...formData, sales: updated });
  };

  const handleProductChange = (index, value) => {
    if (value === "new") {
      setShowNewProductDialog(true);
    } else {
      const prod = products.find((p) => p.id.toString() === value);
      const updated = [...formData.sales];
      updated[index] = {
        ...updated[index],
        product: value,
        unit_price: prod
          ? prod.selling_price.toString()
          : updated[index].unit_price,
      };
      updated[index].total_price = calculateTotalPrice(
        parseFloat(updated[index].unit_price),
        parseFloat(updated[index].quantity) || 0
      ).toString();
      setFormData({ ...formData, sales: updated });
    }
    const op = [...openProduct];
    op[index] = false;
    setOpenProduct(op);
  };

  const appendReturn = (id) => {
    setReturns((r) => [...r, id]);
    setFormData((prev) => ({
      ...prev,
      sales: prev.sales.map((s) =>
        s.id === id ? { ...s, returned: true } : s
      ),
    }));
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    setSubLoading(true);
    try {
      await api.post("alltransaction/sales-return/", {
        sales_ids: returns,
        sales_transaction_id: salesId,
        branch: branchId,
      });
      navigate("/sales/branch/" + branchId);
    } catch (err) {
      console.error(err);
      setError("Failed to process return. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleAddSale = () => {
    setFormData({
      ...formData,
      sales: [
        ...formData.sales,
        {
          product: "",
          unit_price: "",
          quantity: "",
          total_price: "",
          returned: false,
        },
      ],
    });
    setOpenProduct((o) => [...o, false]);
  };

  const handleRemoveSale = (index) => {
    if (formData.sales[index].returned) return;
    setFormData({
      ...formData,
      sales: formData.sales.filter((_, i) => i !== index),
    });
    setOpenProduct((o) => o.filter((_, i) => i !== index));
  };

  const handleDelete = async () => {
    try {
      const url = modifyStock === false
        ? `alltransaction/salestransaction/${salesId}/?flag=${modifyStock}`
        : `alltransaction/salestransaction/${salesId}/`;
      await api.delete(url);
      navigate("/sales/branch/" + branchId);
    } catch (err) {
      console.error(err);
      setError("Failed to delete sales transaction. Please try again.");
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("allinventory/product/", newProductData);
      setProducts((p) => [...p, res.data]);
      setNewProductData({ name: "", brand: "", branch: branchId });
      setShowNewProductDialog(false);
    } catch (err) {
      console.error(err);
      setError("Failed to add new product");
    }
  };

  const handleNewProductChange = (e) => {
    const { name, value } = e.target;
    setNewProductData({ ...newProductData, [name]: value });
  };

  const handleNewProductBrandChange = (value) => {
    if (value === "new") {
      setShowNewBrandDialog(true);
    } else {
      setNewProductData({ ...newProductData, brand: value });
    }
    setOpenBrand(false);
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("allinventory/brand/", { name: newBrandName, branch: branchId });
      setBrands((b) => [...b, res.data]);
      setNewBrandName("");
      setShowNewBrandDialog(false);
      setNewProductData((prev) => ({ ...prev, brand: res.data.id.toString() }));
    } catch (err) {
      console.error(err);
      setError("Failed to add new brand");
    }
  };

  const addNewDebtor = async () => {
    try {
      const res = await api.post("alltransaction/debtors/", newDebtorData);
      setDebtors((d) => [...d, res.data]);
      setFormData((prev) => ({ ...prev, debtor: res.data.id }));
      setNewDebtorData({ name: "", phone_number: "", due: "", branch: branchId });
      setShowNewDebtorDialog(false);
    } catch (err) {
      console.error(err);
      setError("Failed to add debtor");
    }
  };
  console.log("Form Data:", discountValue);
  console.log("original Sales Data:", originalSalesData?.discount);
  console.log(formData.discount == originalSalesData?.discount);
  const hasFormChanged = () => {
    if (!originalSalesData) return false;
    // compare top-level fields
    if (
      formData.date !== originalSalesData.date ||
      formData.name !== originalSalesData.name ||
      formData.phone_number !== originalSalesData.phone_number?.toString() ||
      formData.bill_no !== originalSalesData.bill_no ||
      formData.branch !== originalSalesData.branch?.toString() ||
      formData.method !== originalSalesData.method ||
      formData.debtor !== originalSalesData.debtor ||
      formData.amount_paid !== originalSalesData.amount_paid ||
      parseFloat(discountValue || 0) !== parseFloat(originalSalesData.discount || 0) ||

      formData.sales.length !== originalSalesData.sales.length
    )
      return true;
    // compare each sale
    for (let i = 0; i < formData.sales.length; i++) {
      const s = formData.sales[i];
      const o = originalSalesData.sales[i];
      if (
        s.product !== o.product.toString() ||
        s.unit_price !== o.unit_price.toString() ||
        s.quantity !== o.quantity.toString() ||
        s.total_price !== o.total_price.toString()
      )
        return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubLoading(true);
    try {
      const discAmt =
        discountType === "percent"
          ? subtotal * ((parseFloat(discountValue) || 0) / 100)
          : parseFloat(discountValue) || 0;
      const payload = {
        ...formData,
        subtotal,
        discount: discAmt,
        total_amount: totalAmount,
      };
      await api.patch(`alltransaction/salestransaction/${salesId}/`, payload);
      navigate("/sales/branch/" + branchId);
    } catch (err) {
      console.error(err);
      setError("Failed to update sales transaction. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  if (loading) return <div className="text-white min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar />
      <div className="flex-1 p-4 lg:ml-64">
        <div className="flex justify-end mt-10 lg:mt-3">
          <Button
            onClick={() => navigate("/sales/branch/" + branchId)}
            variant="outline"
            className="mb-4 w-full sm:w-auto px-5 text-black border-white hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-3" /> Back to Sales
          </Button>
        </div>
        <div className="max-w-2xl mx-auto bg-slate-800 p-4 sm:p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-white">
            Edit Sales Transaction
          </h2>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div className="flex flex-col">
              <Label
                htmlFor="date"
                className="text-lg font-medium text-white mb-2"
              >
                Date
              </Label>
              <Input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            {/* Name */}
            <div className="flex flex-col">
              <Label
                htmlFor="name"
                className="text-lg font-medium text-white mb-2"
              >
                Customer's Name
              </Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            {/* Phone */}
            <div className="flex flex-col">
              <Label
                htmlFor="phone_number"
                className="text-lg font-medium text-white mb-2"
              >
                Customer's Phone number
              </Label>
              <Input
                type="text"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            {/* Bill No */}
            <div className="flex flex-col">
              <Label
                htmlFor="bill_no"
                className="text-lg font-medium text-white mb-2"
              >
                Bill No.
              </Label>
              <Input
                type="text"
                id="bill_no"
                name="bill_no"
                value={formData.bill_no}
                onChange={handleChange}
                className="w-full bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            {/* Sales items */}
            <h3 className="text-xl font-semibold mb-2 text-white">Sales</h3>
            {formData.sales.map((sale, index) => (
              <div
                key={index}
                className="bg-slate-700 p-4 rounded-md shadow mb-4"
              >
                <div className="flex justify-between">
                  <h4 className="text-lg font-semibold text-white">
                    Sale {index + 1}
                  </h4>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-500" disabled={sale.returned}>
                        Returned
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 text-white">
                      <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently
                          save your purchase as returned.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogClose asChild>
                        <Button
                          onClick={() => appendReturn(sale.id)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white mt-6"
                        >
                          Yes
                        </Button>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                </div>
                {/* Product */}
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`product-${index}`}
                      className="text-sm font-medium text-white mb-1"
                    >
                      Product
                    </Label>
                    <Popover
                      open={openProduct[index]}
                      onOpenChange={(o) => {
                        const op = [...openProduct];
                        op[index] = o;
                        setOpenProduct(op);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openProduct[index]}
                          disabled={sale.returned}
                          className="w-full bg-slate-600 border-slate-500 text-white hover:bg-slate-500 justify-between"
                        >
                          {sale.product
                            ? products.find(
                                (p) => p.id.toString() === sale.product
                              )?.name
                            : "Select a product..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-slate-700 border-slate-600">
                        <Command className="bg-slate-700">
                          <CommandInput
                            placeholder="Search product..."
                            className="bg-slate-700 text-white"
                          />
                          <CommandList>
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  onSelect={() =>
                                    handleProductChange(index, p.id.toString())
                                  }
                                  className="text-white hover:bg-slate-600"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      sale.product === p.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {p.name}
                                </CommandItem>
                              ))}
                              <CommandItem
                                onSelect={() =>
                                  handleProductChange(index, "new")
                                }
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
                  {/* Unit price */}
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`unit_price-${index}`}
                      className="text-sm font-medium text-white mb-1"
                    >
                      Unit Price
                    </Label>
                    <Input
                      type="number"
                      id={`unit_price-${index}`}
                      name="unit_price"
                      value={sale.unit_price}
                      onChange={(e) => handleSaleChange(index, e)}
                      disabled={sale.returned}
                      className="w-full bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  {/* Quantity */}
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`quantity-${index}`}
                      className="text-sm font-medium text-white mb-1"
                    >
                      Quantity
                    </Label>
                    <Input
                      type="number"
                      id={`quantity-${index}`}
                      name="quantity"
                      value={sale.quantity}
                      onChange={(e) => handleSaleChange(index, e)}
                      disabled={sale.returned}
                      className="w-full bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  {/* Total price */}
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`total_price-${index}`}
                      className="text-sm font-medium text-white mb-1"
                    >
                      Total Price
                    </Label>
                    <Input
                      type="number"
                      id={`total_price-${index}`}
                      name="total_price"
                      value={sale.total_price}
                      disabled
                      className="w-full bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
                {/* Remove sale */}
                {formData.sales.length > 1 && !sale.returned && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-4 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleRemoveSale(index)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Sale
                  </Button>
                )}
              </div>
            ))}
            {/* Totals and discount */}
            <div className="bg-slate-700 text-white p-4 rounded-md shadow mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <Label
                    htmlFor="subtotal"
                    className="text-sm font-medium mb-2"
                  >
                    Subtotal
                  </Label>
                  <Input
                    type="number"
                    id="subtotal"
                    name="subtotal"
                    value={subtotal.toFixed(2)}
                    readOnly
                    className="bg-slate-600 border-slate-500"
                  />
                </div>
                <div className="flex flex-col">
                  <Label
                    htmlFor="discount"
                    className="text-sm font-medium mb-2"
                  >
                    Discount
                  </Label>
                  <div className="flex space-x-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="bg-slate-600 border-slate-500 p-2 rounded"
                    >
                      <option value="amount">Amount</option>
                      <option value="percent">Percent</option>
                    </select>
                    <Input
                      type="number"
                      id="discountValue"
                      name="discountValue"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="Enter discount"
                      className="bg-slate-600 border-slate-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <Label
                    htmlFor="total_amount"
                    className="text-sm font-medium mb-2"
                  >
                    Total Amount
                  </Label>
                  <Input
                    type="number"
                    id="total_amount"
                    name="total_amount"
                    value={totalAmount.toFixed(2)}
                    readOnly
                    className="bg-slate-600 border-slate-500"
                  />
                </div>
                {/* Payment method */}
                <div className="flex flex-col">
                  <Label htmlFor="method" className="text-sm font-medium mb-2">
                    Payment Method
                  </Label>
                  <Select
                    onValueChange={(v) =>
                      setFormData({ ...formData, method: v })
                    }
                    value={formData.method}
                    required
                    className="bg-slate-600 border-slate-500 p-2 rounded text-white"
                  >
                    <SelectTrigger className="w-full bg-slate-600 border-slate-500">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 text-white border-slate-700">
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {formData.method === "credit" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="flex flex-col">
                                <Label
                                  htmlFor="debtor"
                                  className="text-sm font-medium text-white mb-2"
                                >
                                  Debtor
                                </Label>
                                <Popover open={openDebtor} onOpenChange={setOpenDebtor}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={openDebtor}
                                      className="w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                                    >
                                      {formData?.debtor
                                        ? debtors.find(
                                            (d) => d.id === formData.debtor
                                          )?.name
                                        : "Select a debtor..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0 bg-slate-700 border-slate-600">
                                    <Command className="bg-slate-700 border-slate-600">
                                      <CommandInput
                                        placeholder="Search debtor..."
                                        className="bg-slate-700 text-white"
                                      />
                                      <CommandList>
                                        <CommandEmpty>No debtor found.</CommandEmpty>
                                        <CommandGroup>
                                          {debtors.map((debtor) => (
                                            <CommandItem
                                              key={debtor.id}
                                              onSelect={() => {
                                                setFormData({
                                                  ...formData,
                                                  debtor: debtor.id.toString(),
                                                });
                                                setOpenDebtor(false);
                                              }}
                                              className="text-white hover:bg-slate-600"
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  formData.debtor === debtor?.id?.toString()
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                )}
                                              />
                                              {debtor.name}
                                            </CommandItem>
                                          ))}
                                          <CommandItem
                                            onSelect={() => {
                                              setShowNewDebtorDialog(true);
                                              setOpenDebtor(false);
                                            }}
                                            className="text-white hover:bg-slate-600"
                                          >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add a new debtor
                                          </CommandItem>
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
            
                                
                              </div>
                              <div className="flex flex-col">
                                <Label
                                  htmlFor="amount_paid"
                                  className="text-sm font-medium text-white mb-2"
                                >
                                  Amount Paid
                                </Label>
                                <Input
                                  type="number"
                                  id="amount_paid"
                                  name="amount_paid"
                                  value={formData.amount_paid}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      amount_paid: e.target.value,
                                    })
                                  }
                                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                                  
                                />
                                </div>
                              <div className="flex flex-col">
                                <Label
                                  htmlFor="cashout_date"
                                  className="text-sm font-medium text-white mb-2"
                                >
                                  Credited Amount
                                </Label>
                                <Input
                                  type="number"
                                  id="credited_amount"
                                  name="credited_amount"
                                  value={formData.credited_amount}
                                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                                  required
                                />
                              </div>
                            </div>
                          )}
            {/* Add sale & submit */}
            <Button
              type="button"
              onClick={handleAddSale}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Another Sale
            </Button>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={!hasFormChanged() || subLoading || returned}
            >
              Update Sales Transaction
            </Button>
          </form>
          {/* Return & delete actions */}
          <Button
            type="button"
            onClick={handleReturn}
            disabled={returns.length === 0 || subLoading || returned}
            className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
          >
            Return Sales
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white mt-4">
                Delete Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription className="text-slate-300">
                  This action cannot be undone. Permanently delete this
                  transaction.
                  <div className="flex items-center my-4 space-x-2">
                    <Checkbox
                      id="terms"
                      checked={isChecked}
                      onCheckedChange={handleCheckboxClick}
                      className="border-white"
                    />
                    <Label htmlFor="terms" className="text-sm leading-none">
                      Do not modify stock
                    </Label>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Action</DialogTitle>
                        <DialogDescription>
                          Are you sure you do not want to modify the stock?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="flex justify-end space-x-2">
                        <Button onClick={handleCancel}>Cancel</Button>
                        <Button
                          onClick={handleConfirm}
                          className="bg-red-700 hover:bg-red-900"
                        >
                          Confirm
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </DialogDescription>
              </DialogHeader>
              <DialogClose asChild>
                <Button
                  onClick={handleDelete}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Transaction
                </Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* New Product Dialog */}
      <NewProductDialog
        open={showNewProductDialog}
        setOpen={setShowNewProductDialog}
        newProductData={newProductData}
        handleNewProductChange={handleNewProductChange}
        handleNewProductBrandChange={handleNewProductBrandChange}
        handleNewProductVendorChange={handleNewProductVendorChange}
        handleAddProduct={handleAddProduct}
        brands={brands}
        openBrand={openBrand}
        setOpenBrand={setOpenBrand}
        branches={branchList}
        userBranch={userBranch}
        vendors={vendors}
      />
      {/* New Brand Dialog */}
      <Dialog open={showNewBrandDialog} onOpenChange={setShowNewBrandDialog}>
        <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Enter category name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newBrandName" className="text-right">
                Category Name
              </Label>
              <Input
                id="newBrandName"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="col-span-3 bg-slate-700 border-slate-600 text-white"
                placeholder="Enter brand name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddBrand}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Add Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* New Debtor Dialog */}
      <Dialog open={showNewDebtorDialog} onOpenChange={setShowNewDebtorDialog}>
        <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New Debtor</DialogTitle>
            <DialogDescription>
              Fill in the debtor's details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="debtor_name" className="text-right">
                Name
              </Label>
              <Input
                id="debtor_name"
                value={newDebtorData.name}
                onChange={(e) =>
                  setNewDebtorData({ ...newDebtorData, name: e.target.value })
                }
                className="col-span-3 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="debtor_phone" className="text-right">
                Phone Number
              </Label>
              <Input
                id="debtor_phone"
                value={newDebtorData.phone_number}
                onChange={(e) =>
                  setNewDebtorData({
                    ...newDebtorData,
                    phone_number: e.target.value,
                  })
                }
                className="col-span-3 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="debtor_due" className="text-right">
                Due
              </Label>
              <Input
                id="debtor_due"
                type="number"
                value={newDebtorData.due}
                onChange={(e) =>
                  setNewDebtorData({ ...newDebtorData, due: e.target.value })
                }
                className="col-span-3 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={addNewDebtor}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Add Debtor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
