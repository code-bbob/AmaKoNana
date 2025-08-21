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
  const [customerTotal, setCustomerTotal] = useState("");

  // Delete confirmation
  const [isChecked, setIsChecked] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [modifyStock, setModifyStock] = useState(true);

  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [currentReturnSale, setCurrentReturnSale] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState("");

  // Computed fields
  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
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
          sales: data.sales.map((s) => {
            // Determine discount type based on the original discount amount
            const lineSubtotal = s.quantity * s.unit_price;
            const discountAmount = s.discount || 0;
            let discountType = "percent";
            let discountValue = "0";
            
            if (discountAmount > 0) {
              // If the discount amount is a nice percentage (like 5%, 10%, etc.), treat as percent
              const calculatedPercent = (discountAmount * 100 / lineSubtotal);
              if (Math.abs(calculatedPercent - Math.round(calculatedPercent)) < 0.01) {
                discountType = "percent";
                discountValue = calculatedPercent.toFixed(2);
              } else {
                // Otherwise treat as amount
                discountType = "amount";
                discountValue = discountAmount.toString();
              }
            }
            
            return {
              ...s,
              product: s.product.toString(),
              unit_price: s.unit_price.toString(),
              quantity: s.quantity.toString(),
              discount_type: discountType,
              discount_value: discountValue,
              line_subtotal: lineSubtotal.toString(),
              total_price: s.total_price.toString(),
              returned: s.returned,
            };
          }),
          method: data.method,
          debtor: data.debtor,
          amount_paid: data.amount_paid,
          credited_amount: data.credited_amount?.toString() || "",
        });
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

  // Calculate subtotal and total discount
  useEffect(() => {
    let newSubtotal = 0;
    let newTotalDiscount = 0;
    formData.sales.forEach((s) => {
      const qty = parseFloat(s.quantity) || 0;
      const price = parseFloat(s.unit_price) || 0;
      const lineSub = qty * price;
      newSubtotal += lineSub;
      
      if (s.discount_type === "percent") {
        const percent = Math.min(Math.max(parseFloat(s.discount_value) || 0, 0), 100);
        newTotalDiscount += lineSub * percent / 100;
      } else if (s.discount_type === "amount") {
        const amount = Math.min(Math.max(parseFloat(s.discount_value) || 0, 0), lineSub);
        newTotalDiscount += amount;
      }
    });
    setSubtotal(newSubtotal);
    setTotalDiscount(newTotalDiscount);
    setTotalAmount(newSubtotal - newTotalDiscount);
  }, [formData.sales]);

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

  // Recalculate a single line based on percentage discount
  const recalcLine = (line) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unit_price) || 0;
    const lineSubtotal = qty * price;
    let discountAmt = 0;
    
    if (line.discount_type === "percent") {
      let percent = parseFloat(line.discount_value) || 0;
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      discountAmt = lineSubtotal * percent / 100;
    } else if (line.discount_type === "amount") {
      let amount = parseFloat(line.discount_value) || 0;
      if (amount < 0) amount = 0;
      if (amount > lineSubtotal) amount = lineSubtotal;
      discountAmt = amount;
    }
    
    line.line_subtotal = lineSubtotal ? lineSubtotal.toFixed(2) : "";
    line.total_price = lineSubtotal ? (lineSubtotal - discountAmt).toFixed(2) : "";
  };

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
    recalcLine(updated[index]);
    setFormData({ ...formData, sales: updated });
  };

  const handleDiscountTypeChange = (index, value) => {
    if (formData.sales[index].returned) return;
    const updated = [...formData.sales];
    updated[index] = { ...updated[index], discount_type: value, discount_value: "" };
    recalcLine(updated[index]);
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
      recalcLine(updated[index]);
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
        returns: returns, // Changed to send array of {id, quantity}
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

  // Modified return handlers
  const handleReturnClick = (sale) => {
    setCurrentReturnSale(sale);
    setReturnQuantity("");
    setReturnDialogOpen(true);
  };

  const handleReturnConfirm = () => {
    if (!currentReturnSale || !returnQuantity) return;

    const qty = parseFloat(returnQuantity);
    const maxQty = parseFloat(currentReturnSale.quantity);

    if (qty <= 0 || qty > maxQty) {
      setError(`Return quantity must be between 1 and ${maxQty}`);
      return;
    }

    setReturns((r) => [
      ...r,
      {
        id: currentReturnSale.id,
        quantity: qty,
      },
    ]);

    setFormData((prev) => ({
      ...prev,
      sales: prev.sales.map((s) =>
        s.id === currentReturnSale.id ? { ...s, returned: true } : s
      ),
    }));

    setReturnDialogOpen(false);
    setCurrentReturnSale(null);
    setReturnQuantity("");
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
          discount_type: "percent",
          discount_value: "",
          line_subtotal: "",
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
      setSubLoading(true);
      const url = modifyStock === false
        ? `alltransaction/salestransaction/${salesId}/?flag=${modifyStock}`
        : `alltransaction/salestransaction/${salesId}/`;
      await api.delete(url);
      navigate("/sales/branch/" + branchId);
    } catch (err) {
      console.error(err);
      setError("Failed to delete sales transaction. Please try again.");
      setSubLoading(false);
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

  const handleCheck = async (e, phone_number) => {
    try {
      const res = await api.get(
        "alltransaction/customer-total/" + phone_number + "/"
      );
      console.log(res.data);
      setCustomerTotal(res.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data");
    }
  };
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
      formData.sales.length !== originalSalesData.sales.length
    )
      return true;
    // compare each sale
    for (let i = 0; i < formData.sales.length; i++) {
      const s = formData.sales[i];
      const o = originalSalesData.sales[i];
      
      // Calculate original discount values for comparison
      const lineSubtotal = o.quantity * o.unit_price;
      const originalDiscountAmount = o.discount || 0;
      let originalDiscountType = "percent";
      let originalDiscountValue = "0";
      
      if (originalDiscountAmount > 0) {
        const calculatedPercent = (originalDiscountAmount * 100 / lineSubtotal);
        if (Math.abs(calculatedPercent - Math.round(calculatedPercent)) < 0.01) {
          originalDiscountType = "percent";
          originalDiscountValue = calculatedPercent.toFixed(2);
        } else {
          originalDiscountType = "amount";
          originalDiscountValue = originalDiscountAmount.toString();
        }
      }
      
      if (
        s.product !== o.product.toString() ||
        s.unit_price !== o.unit_price.toString() ||
        s.quantity !== o.quantity.toString() ||
        s.discount_type !== originalDiscountType ||
        s.discount_value !== originalDiscountValue ||
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
      // Prepare lines (ensure discount amount computed)
      const preparedSales = formData.sales.map((line) => {
        const clone = { ...line };
        recalcLine(clone);
        const qty = parseFloat(clone.quantity) || 0;
        const price = parseFloat(clone.unit_price) || 0;
        const lineSubtotal = qty * price;
        
        let discountAmt = 0;
        if (clone.discount_type === "percent") {
          const percent = Math.min(Math.max(parseFloat(clone.discount_value) || 0, 0), 100);
          discountAmt = lineSubtotal * percent / 100;
        } else if (clone.discount_type === "amount") {
          discountAmt = Math.min(Math.max(parseFloat(clone.discount_value) || 0, 0), lineSubtotal);
        }
        
        const net = lineSubtotal - discountAmt;
        return {
          product: clone.product,
          unit_price: price,
          quantity: qty,
          discount: discountAmt, // backend expects amount
          total_price: net,
        };
      });
      const payload = {
        ...formData,
        sales: preparedSales,
        subtotal: subtotal,
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

  if (loading) return <div className="text-white bg-gradient-to-br flex items-center justify-center from-slate-900 to-slate-800 min-h-screen">Loading...</div>;

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
        <div className="max-w-4xl mx-auto bg-slate-800 p-4 sm:p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-white">
            Edit Sales Transaction
          </h2>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Date */}
            <div className="flex flex-col col-span-3">
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
            {/* Bill No */}
            <div className="flex flex-col col-span-3">
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
            {/* Phone */}
            <div className="flex flex-col col-span-6">
              <Label
                htmlFor="phone_number"
                className="text-lg font-medium flex justify-between text-white mb-2"
                >
                <span>Customer's Phone number</span>
                {customerTotal && (
                  <span className="text-green-400">{customerTotal}</span>
                )}
              </Label>
              <div className="flex">
                <Input
                  type="text"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                  />
                {/* <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" className="ml-2">Check</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 text-white">
                    <DialogHeader>
                      <DialogTitle>Are you sure?</DialogTitle>
                      <DialogDescription className="py-5">
                        This action will create a new customer if they don't
                        exist.
                        <div className="text-right">
                          <DialogClose>
                            <Button
                              className="mt-6 hover:scale-110"
                              type="button"
                              onClick={(e) =>
                                handleCheck(e, formData.phone_number)
                              }
                              >
                              Check
                            </Button>
                          </DialogClose>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog> */}
              </div>
            </div>
            </div>
            {/* Sales items */}
            <h3 className="text-xl font-semibold mb-2 text-white">Sales</h3>
            {formData.sales.map((sale, index) => (
              <div
              key={index}
              className="bg-slate-700 text-white p-4 rounded-md shadow mb-4"
              >
                <div className="flex justify-between">
                  <h3 className="text-lg font-semibold mb-4 text-white">Sale {index + 1}</h3>
                  <Button
                    type="button"
                    className="bg-blue-500 hover:bg-blue-600"
                    disabled={sale.returned}
                    onClick={() => handleReturnClick(sale)}
                  >
                    Return
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Product */}
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`product-${index}`}
                      className="text-sm font-medium text-white mb-2"
                    >
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
                          aria-expanded={openProduct[index]}
                          disabled={sale.returned}
                          className="w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                        >
                          {sale.product
                            ? products.find(
                                (p) => p.id.toString() === sale.product
                              )?.name
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
                          <CommandList>
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  onSelect={() =>
                                    handleProductChange(index, product.id.toString())
                                  }
                                  className="text-white hover:bg-slate-600"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      sale.product === product.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {product.name}
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
                  {/* Unit Price */}
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`unit_price-${index}`}
                      className="text-sm font-medium text-white mb-2"
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
                      className="bg-slate-600 border-slate-500 text-white"
                      placeholder="Price"
                      required
                    />
                  </div>
                  {/* Quantity */}
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`quantity-${index}`}
                      className="text-sm font-medium text-white mb-2"
                    >
                      Qty
                    </Label>
                    <Input
                      type="number"
                      id={`quantity-${index}`}
                      name="quantity"
                      value={sale.quantity}
                      onChange={(e) => handleSaleChange(index, e)}
                      disabled={sale.returned}
                      className="bg-slate-600 border-slate-500 text-white"
                      placeholder="Qty"
                      required
                    />
                  </div>
                  {/* Subtotal */}
                  <div className="flex flex-col ">
                    <Label className="text-sm font-medium text-white mb-2">
                      Subtotal
                    </Label>
                    <Input
                      type="number"
                      value={sale.line_subtotal}
                      readOnly
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`discount-${index}`}
                      className="text-sm font-medium text-white mb-2"
                    >
                      Discount
                    </Label>
                    <div className="flex gap-2">
                      <Select 
                        value={sale.discount_type} 
                        onValueChange={(value) => handleDiscountTypeChange(index, value)}
                        disabled={sale.returned}
                      >
                        <SelectTrigger className="w-28 bg-slate-600 border-slate-500 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="percent" className="text-white">%</SelectItem>
                          <SelectItem value="amount" className="text-white">Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        id={`discount-${index}`}
                        name="discount_value"
                        value={sale.discount_value}
                        onChange={(e) => handleSaleChange(index, e)}
                        disabled={sale.returned}
                        className="bg-slate-600 border-slate-500 text-white flex-1"
                        placeholder={sale.discount_type === "percent" ? "%" : "Amount"}
                      />
                    </div>
                  </div>
                  {/* Net Total */}
                  <div className="flex flex-col">
                    <Label className="text-sm font-medium text-white mb-2">
                      Total (Net)
                    </Label>
                    <Input
                      type="number"
                      value={sale.total_price}
                      readOnly
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </div>
                </div>
                {/* Remove sale */}
                {formData.sales.length > 1 && !sale.returned && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white"
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
                  <Label className="text-sm font-medium text-white mb-2">
                    Total Discount (Amt)
                  </Label>
                  <Input
                    type="number"
                    value={totalDiscount.toFixed(2)}
                    readOnly
                    className="bg-slate-600 border-slate-500 text-white"
                  />
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

          {returned && (
            <p className="text-red-400 mt-4">
              Returned sales cannot be modified or deleted. Please delete the sales return if you want to make changes.
            </p>
          )}
          
          {/* Return & delete actions */}
          <Button
            type="button"
            onClick={handleReturn}
            disabled={returns.length === 0 || subLoading || returned}
            className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
          >
            Process Returns
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                disabled={subLoading || returned} 
                className="w-full bg-red-600 hover:bg-red-700 text-white mt-4"
              >
                Delete Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription className="text-slate-300">
                  This action cannot be undone. Permanently delete this
                  transaction.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="outline" className="bg-white text-black">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={subLoading}
                >
                  {subLoading ? "Deleting..." : "Delete Transaction"}
                </Button>
              </DialogFooter>
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

      {/* Return Quantity Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Return Item</DialogTitle>
            <DialogDescription className="text-slate-300">
              Enter the quantity you'd like to return for this item. Maximum
              allowed: {currentReturnSale?.quantity}
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
              max={currentReturnSale?.quantity}
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
    </div>
  );
}
