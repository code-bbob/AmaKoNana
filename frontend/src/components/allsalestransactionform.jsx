"use client";

import React, { useState, useEffect } from "react";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useNavigate } from "react-router-dom";
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
import { useParams } from "react-router-dom";
import Sidebar from "@/components/allsidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NewProductDialog from "@/components/newProductDialog"; // Adjust the path as needed

function AllSalesTransactionForm() {
  const api = useAxios();
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    phone_number: "",
    bill_no: "",
    branch: branchId, // New branch field added to state
  sales: [{ product: "", unit_price: "", quantity: "", discount_type: "percent", discount_value: "", line_subtotal: "", total_price: "" }],
    method: "cash",
    debtor: "", // New field for debtor's name
    amount_paid: null,
    credited_amount: "",
  });
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]); // New state for vendors
  const [error, setError] = useState(null);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false);
  const [newProductData, setNewProductData] = useState({ name: "", brand: "", selling_price: "", cost_price: "", branch: branchId });
  const [newBrandName, setNewBrandName] = useState("");
  const [openProduct, setOpenProduct] = useState(
    Array(formData.sales.length).fill(false)
  );
  const [subLoading, setSubLoading] = useState(false);
  const [nextBill, setNextBill] = useState("");
  const [customerTotal, setCustomerTotal] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEligibleForDiscount, setCustomerEligibleForDiscount] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    customer_name: "",
    phone_number: ""
  });
  const [openBrand, setOpenBrand] = useState(false);
  const [debtors, setDebtors] = useState([]); // New state for debtors

  // New states for branch selection – these mimic your purchase form
  const [branch, setBranch] = useState([]);
  const [userBranch, setUserBranch] = useState({});

  // Computed fields
  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [showNewDebtorDialog, setShowNewDebtorDialog] = useState(false);
  const [newDebtorData, setNewDebtorData] = useState({
    name: "",
    phone_number: "",
    due: "",
    branch: branchId, // Assuming debtor belongs to the same branch
  });
  const [openDebtor, setOpenDebtor] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, brandsResponse, nextBillResponse, debtorResponse, vendorResponse] =
          await Promise.all([
            api.get("allinventory/product/branch/" + branchId + "/"),
            api.get("allinventory/brand/branch/" + branchId + "/"),
            api.get("alltransaction/next-bill-no/"),
            api.get("alltransaction/debtors/branch/" + branchId + "/"), // Fetching debtors
            api.get("alltransaction/vendor/branch/" + branchId + "/"), // Fetching vendors
          ]);
        setProducts(productsResponse.data);
        setBrands(brandsResponse.data);
        setNextBill(nextBillResponse.data.bill_no);
        setDebtors(debtorResponse.data); // Setting debtors data
        setVendors(vendorResponse.data); // Setting vendors data
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // When nextBill is available, update the formData's bill_no
  useEffect(() => {
    if (nextBill) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        bill_no: nextBill,
      }));
    }
  }, [nextBill]);

  // New useEffect to fetch branch info – adjust endpoints as needed
  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        const [branchResponse, userBranchResponse] = await Promise.all([
          api.get(`enterprise/branch/${branchId}/`),
          api.get("enterprise/getbranch/"),
        ]);
        setBranch(branchResponse.data);
        setUserBranch(userBranchResponse.data);
      } catch (error) {
        console.error("Error fetching branch data:", error);
      }
    };
    fetchBranchData();
  }, []);

    const addNewDebtor = async () => {
    try {
      const res = await api.post("alltransaction/debtors/", newDebtorData);
      setDebtors((d) => [...d, res.data]);
      setFormData((prev) => ({ ...prev, debtor: res.data.id.toString() }));
      setNewDebtorData({ name: "", phone_number: "", due: "", branch: branchId });
      setShowNewDebtorDialog(false);
    } catch (err) {
      console.error(err);
      setError("Failed to add debtor");
    }
  };

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    const newSales = [...formData.sales];
    newSales[index] = { ...newSales[index], [name]: value };

    recalcLine(newSales[index]);
    setFormData({ ...formData, sales: newSales });
  };

  const handleDiscountTypeChange = (index, value) => {
    const newSales = [...formData.sales];
    newSales[index] = { ...newSales[index], discount_type: value, discount_value: "" };
    recalcLine(newSales[index]);
    setFormData({ ...formData, sales: newSales });
  };

  // add this alongside your other handlers
const handleNewProductVendorChange = (ids) => {
  setNewProductData(prev => ({ ...prev, vendor: ids }));
};


  // Updated handleProductChange so that unit price is automatically set
  const handleProductChange = (index, value) => {
    if (value === "new") {
      setShowNewProductDialog(true);
    } else {
      // Find the matching product to fill in the selling price
      const matchingProduct = products.find(
        (product) => product.id.toString() === value
      );
      const newSales = [...formData.sales];
      const currentSale = newSales[index];
      
      // If this sale line was previously empty and customer is eligible for discount, apply it
      const shouldApplyDiscount = !currentSale.product && customerEligibleForDiscount;
      
      newSales[index] = { 
        ...newSales[index], 
        product: value, 
        unit_price: matchingProduct ? matchingProduct.selling_price : "",
        discount_value: shouldApplyDiscount ? "5" : newSales[index].discount_value
      };
      recalcLine(newSales[index]);
      setFormData({ ...formData, sales: newSales });
    }
    const newOpenProduct = [...openProduct];
    newOpenProduct[index] = false;
    setOpenProduct(newOpenProduct);
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
  };

  const handleNewBrandChange = (e) => {
    setNewBrandName(e.target.value);
  };

  const handleAddSale = () => {
    const newSaleItem = { 
      product: "", 
      unit_price: "", 
      quantity: "", 
      discount_type: "percent", 
      discount_value: customerEligibleForDiscount ? "5" : "", 
      line_subtotal: "", 
      total_price: "" 
    };
    
    setFormData({
      ...formData,
      sales: [
        ...formData.sales,
        newSaleItem,
      ],
    });
    setOpenProduct([...openProduct, false]);
  };

  const handleRemoveSale = (index) => {
    const newSales = formData.sales.filter((_, i) => i !== index);
    setFormData({ ...formData, sales: newSales });
    const newOpenProduct = openProduct.filter((_, i) => i !== index);
    setOpenProduct(newOpenProduct);
  };

  const handleCheck = async (e, phone_number) => {
    try {
      const res = await api.get(
        "alltransaction/customer/" + phone_number + "/"
      );
      console.log(res.data);
      setCustomerTotal(res.data.total_spent);
      setCustomerName(res.data.name);
      
      // Apply 5% discount to all sales if customer total > 0
      const customerAmount = parseFloat(res.data.total_spent) || 0;
      const isEligibleForDiscount = customerAmount > 0;
      setCustomerEligibleForDiscount(isEligibleForDiscount);
      
      if (isEligibleForDiscount) {
        const updatedSales = formData.sales.map((sale) => {
          if (sale.product && sale.quantity && sale.unit_price) {
            return { ...sale, discount_value: "5" };
          }
          return sale;
        });
        setFormData(prev => ({ ...prev, sales: updatedSales }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response && error.response.status === 404) {
        // Customer not found, show dialog to create new customer
        setCustomerEligibleForDiscount(false);
        setNewCustomerData({
          customer_name: "",
          phone_number: phone_number
        });
        setShowNewCustomerDialog(true);
      } else {
        setError("Failed to fetch data");
        setCustomerEligibleForDiscount(false);
      }
    }
  };

  const handleCreateCustomer = async () => {
    try {
      const res = await api.post("alltransaction/customer/", newCustomerData);
      console.log("New customer created:", res.data);
      setCustomerTotal(res.data.total_spent);
      setCustomerName(res.data.name);
      // New customer will have total_spent = 0, so no discount eligibility
      setCustomerEligibleForDiscount(false);
      setShowNewCustomerDialog(false);
      setNewCustomerData({ customer_name: "", phone_number: "" });
    } catch (error) {
      console.error("Error creating customer:", error);
      setError("Failed to create customer");
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    try {
      setSubLoading(true);
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
      const response = await api.post(
        "alltransaction/salestransaction/",
        payload
      );
      console.log("Response:", response.data);
      // navigate('/invoice/' + response.data.id);
      navigate("/sales/branch/" + branchId);
    } catch (error) {
      console.error("Error posting data:", error);
    } finally {
      setSubLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("allinventory/product/", newProductData);
      console.log("New Product Added:", response.data);
      setProducts([...products, response.data]);
      setNewProductData({ name: "", brand: "", branch:branchId });
      setShowNewProductDialog(false);
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("allinventory/brand/", {
        name: newBrandName,
        branch: branchId, // Assuming brand belongs to the same branch
      });
      console.log("New Brand Added:", response.data);
      setBrands([...brands, response.data]);
      setNewBrandName("");
      setShowNewBrandDialog(false);
      setNewProductData({
        ...newProductData,
        brand: response.data.id.toString(),
      });
    } catch (error) {
      console.error("Error adding brand:", error);
    }
  };

  const calculateTotalPrice = (quantity, unit_price) => {
    return quantity * unit_price;
  };

  // Recalculate a single line based on discount type and value
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

  useEffect(() => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      credited_amount:
        totalAmount - (parseFloat(prevFormData.amount_paid) || 0),
    }));
  }, [formData.amount_paid, totalAmount]);
  // Keydown handling for product scanning
  const [currentWord, setCurrentWord] = useState("");
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {

      if (currentWord.trim().length === 0){
        handleSubmit();
      }
      const scannedCode = currentWord.slice(-13, -1);

      console.log("Word is:", scannedCode);
      const matchingProduct = products.find(
        (product) => product.uid === scannedCode
      );
      console.log("Matching product:", matchingProduct);

      if (matchingProduct) {
        const productIdStr = matchingProduct.id.toString();

        // First, check if a sale already exists for this product
  const existingSaleIndex = formData.sales.findIndex((sale) => sale.product === productIdStr);

        if (existingSaleIndex !== -1) {
          // Increase quantity for the existing sale
          const updatedSales = [...formData.sales];
          const existingSale = updatedSales[existingSaleIndex];
          const currentQuantity = parseInt(existingSale.quantity, 10) || 0;
          const newQuantity = currentQuantity + 1;
          existingSale.quantity = newQuantity;
          recalcLine(existingSale);
          setFormData((prevFormData) => ({
            ...prevFormData,
            sales: updatedSales,
          }));
        } else {
          // No existing sale for this product; check for an empty sale entry first
          const emptySaleIndex = formData.sales.findIndex(
            (sale) => !sale.product
          );
          if (emptySaleIndex !== -1) {
            const updatedSales = [...formData.sales];
            updatedSales[emptySaleIndex] = { 
              product: productIdStr, 
              unit_price: matchingProduct.selling_price, 
              quantity: 1, 
              discount_type: "percent", 
              discount_value: customerEligibleForDiscount ? "5" : "", 
              line_subtotal: matchingProduct.selling_price, 
              total_price: matchingProduct.selling_price 
            };
            recalcLine(updatedSales[emptySaleIndex]);
            setFormData((prevFormData) => ({
              ...prevFormData,
              sales: updatedSales,
            }));
          } else {
            // Neither an existing sale nor an empty sale found, so add a new sale entry
            const newSale = { 
              product: productIdStr, 
              unit_price: matchingProduct.selling_price, 
              quantity: 1, 
              discount_type: "percent", 
              discount_value: customerEligibleForDiscount ? "5" : "", 
              line_subtotal: matchingProduct.selling_price, 
              total_price: matchingProduct.selling_price 
            };
            recalcLine(newSale);
            setFormData((prevFormData) => ({
              ...prevFormData,
              sales: [...prevFormData.sales, newSale],
            }));
          }
        }
      } else {
        console.log("Product not found");
      }
      setCurrentWord("");
    } else {
      setCurrentWord((prev) => prev + e.key);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentWord, products]);

  // Recompute summary when sales change
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

  // No separate global discount; totalAmount derived above

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">
              Add Sales Transaction
            </h2>
            {error && <p className="text-red-600 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="flex flex-col col-span-3">
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
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
                <div className="flex flex-col col-span-3">
                  <Label
                    htmlFor="bill_no"
                    className="text-sm font-medium text-white mb-2"
                  >
                    Bill No.
                  </Label>
                  <Input
                    type="text"
                    id="bill_no"
                    name="bill_no"
                    placeholder="Enter bill number"
                    value={formData.bill_no}
                    onChange={(e) =>
                      setFormData({ ...formData, bill_no: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
                <div className="flex flex-col col-span-6">
                  <Label
                    htmlFor="phone_number"
                    className="text-sm font-medium flex justify-between text-white mb-2"
                  >
                    <span>Customer's Phone Number</span>{" "}
                    {customerName && (
                      <span className="text-blue-400">Hi, {customerName}</span>
                    )}
                    {customerTotal && (
                      <span className="text-green-400">Rs. {customerTotal}</span>
                    )}
                  </Label>
                  <div className="flex">
                    <Input
                      type="text"
                      id="phone_number"
                      name="phone_number"
                      placeholder="Customer's Phone Number"
                      value={formData.phone_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone_number: e.target.value,
                        })
                      }
                      className="bg-slate-700 mr-2 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    />
                    <Button 
                      type="button"
                      onClick={(e) => handleCheck(e, formData.phone_number)}
                    >
                      Check
                    </Button>
                  </div>
                </div>
                
              </div>

              {/* Branch Select – added exactly like in your purchase form */}
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
                      <SelectItem value={branch.id?.toString()} className="text-white">
                        {branch.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Sales details simplified */}
              {formData.sales.map((sale, index) => (
                <div key={index} className="bg-slate-700 text-white p-4 rounded-md shadow mb-4">
                  <h3 className="text-lg font-semibold mb-4">Sale {index + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Product */}
                    <div className="flex flex-col">
                      <Label htmlFor={`product-${index}`} className="text-sm font-medium text-white mb-2">Product</Label>
                      <Popover
                        open={openProduct[index]}
                        onOpenChange={(open) => {
                          const newOpenProduct = [...openProduct];
                          newOpenProduct[index] = open;
                          setOpenProduct(newOpenProduct);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" aria-expanded={openProduct[index]} className="w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500">
                            {sale.product ? products.find(p => p.id.toString() === sale.product)?.name : "Select a product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-slate-700 border-slate-600">
                          <Command className="bg-slate-700 border-slate-600">
                            <CommandInput placeholder="Search product..." className="bg-slate-700 text-white" />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map(product => (
                                  <CommandItem key={product.id} onSelect={() => handleProductChange(index, product.id.toString())} className="text-white hover:bg-slate-600">
                                    <Check className={cn("mr-2 h-4 w-4", sale.product === product.id.toString() ? "opacity-100" : "opacity-0")} />
                                    {product.name}
                                  </CommandItem>
                                ))}
                                <CommandItem onSelect={() => handleProductChange(index, "new")} className="text-white hover:bg-slate-600">
                                  <PlusCircle className="mr-2 h-4 w-4" /> Add a new product
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* Unit Price */}
                    <div className="flex flex-col">
                      <Label htmlFor={`unit_price-${index}`} className="text-sm font-medium text-white mb-2">Unit Price</Label>
                      <Input type="number" id={`unit_price-${index}`} name="unit_price" value={sale.unit_price} onChange={(e) => handleChange(index, e)} className="bg-slate-600 border-slate-500 text-white" placeholder="Price" required />
                    </div>
                    {/* Quantity */}
                    <div className="flex flex-col">
                      <Label htmlFor={`quantity-${index}`} className="text-sm font-medium text-white mb-2">Qty</Label>
                      <Input type="number" id={`quantity-${index}`} name="quantity" value={sale.quantity} onChange={(e) => handleChange(index, e)} className="bg-slate-600 border-slate-500 text-white" placeholder="Qty" required />
                    </div>
                    {/* Subtotal */}
                    <div className="flex flex-col ">
                      <Label className="text-sm font-medium text-white mb-2">Subtotal</Label>
                      <Input type="number" value={sale.line_subtotal} readOnly className="bg-slate-600 border-slate-500 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <Label htmlFor={`discount-${index}`} className="text-sm font-medium text-white mb-2">Discount</Label>
                      <div className="flex gap-2">
                        <Select value={sale.discount_type} onValueChange={(value) => handleDiscountTypeChange(index, value)}>
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
                          onChange={(e) => handleChange(index, e)} 
                          className="bg-slate-600 border-slate-500 text-white flex-1" 
                          placeholder={sale.discount_type === "percent" ? "%" : "Amount"} 
                        />
                      </div>
                    </div>
                    {/* Net Total */}
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium text-white mb-2">Total (Net)</Label>
                      <Input type="number" value={sale.total_price} readOnly className="bg-slate-600 border-slate-500 text-white" />
                    </div>
                  </div>
                  {formData.sales.length > 1 && (
                    <Button type="button" variant="destructive" size="sm" className="mt-4 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRemoveSale(index)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Remove Sale
                    </Button>
                  )}
                </div>
              ))}

              {/* Summary Fields */}
              <div className="bg-slate-700 text-white p-4 rounded-md shadow mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <Label
                      htmlFor="subtotal"
                      className="text-sm font-medium text-white mb-2"
                    >
                      Subtotal
                    </Label>
                    <Input
                      type="number"
                      id="subtotal"
                      name="subtotal"
                      value={subtotal.toFixed(2)}
                      readOnly
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-sm font-medium text-white mb-2">Total Discount (Amt)</Label>
                    <Input type="number" value={totalDiscount.toFixed(2)} readOnly className="bg-slate-600 border-slate-500 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <Label
                      htmlFor="total_amount"
                      className="text-sm font-medium text-white mb-2"
                    >
                      Total Amount
                    </Label>
                    <Input
                      type="number"
                      id="total_amount"
                      name="total_amount"
                      value={totalAmount.toFixed(2)}
                      readOnly
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label
                      htmlFor="total_amount"
                      className="text-sm font-medium text-white mb-2"
                    >
                      Payment Mehod
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setFormData({ ...formData, method: value })
                      }
                      value={formData.method}
                      required={true}
                      className="bg-slate-600 border-slate-500 text-white p-2 rounded"
                    >
                      <SelectTrigger className="w-full bg-slate-600 border-slate-500 text-white">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="cash" className="text-white">
                          Cash
                        </SelectItem>
                        <SelectItem value="card" className="text-white">
                          Card
                        </SelectItem>
                        <SelectItem value="online" className="text-white">
                          Online
                        </SelectItem>
                        <SelectItem value="credit" className="text-white">
                          Credit
                        </SelectItem>
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
                          {formData.debtor
                            ? debtors.find(
                                (d) => d.id.toString() === formData.debtor
                              )?.name
                            : "Select a debtor..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-slate-700 border-slate-600">
                        <Command className="bg-slate-700 border-slate-600" required>
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

              <Button
                type="button"
                onClick={handleAddSale}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Another Sale
              </Button>
              <Button
                type="submit"
                disabled={subLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Submit Transaction
              </Button>
            </form>

            <NewProductDialog
              open={showNewProductDialog}
              setOpen={setShowNewProductDialog}
              newProductData={newProductData}
              handleNewProductChange={handleNewProductChange}
              handleNewProductBrandChange={handleNewProductBrandChange}
              handleNewProductVendorChange={handleNewProductVendorChange}
              handleAddProduct={handleAddProduct}
              brands={brands}
              openBrand={openBrand} // You can manage openBrand state within the dialog if needed
              setOpenBrand={setOpenBrand}
              branches={branch}
              userBranch={userBranch}
              selectedBranch={branchId}
              vendors={vendors} // Pass vendors to the dialog
            />

            <Dialog
              open={showNewDebtorDialog}
              onOpenChange={setShowNewDebtorDialog}
            >
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
                        setNewDebtorData({
                          ...newDebtorData,
                          name: e.target.value,
                        })
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
                        setNewDebtorData({
                          ...newDebtorData,
                          due: e.target.value,
                        })
                      }
                      className="col-span-3 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={addNewDebtor}
                  >
                    Add Debtor
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
                  <DialogDescription>
                    Enter the name of the new category you want to add.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="newBrandName"
                      className="text-right text-white"
                    >
                      Category Name
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
                    Add Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showNewCustomerDialog}
              onOpenChange={setShowNewCustomerDialog}
            >
              <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Customer Not Found</DialogTitle>
                  <DialogDescription>
                    This customer doesn't exist. Please enter their details to create a new customer.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer_name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="customer_name"
                      value={newCustomerData.customer_name}
                      onChange={(e) =>
                        setNewCustomerData({
                          ...newCustomerData,
                          customer_name: e.target.value,
                        })
                      }
                      className="col-span-3 bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer_phone" className="text-right">
                      Phone
                    </Label>
                    <Input
                      id="customer_phone"
                      value={newCustomerData.phone_number}
                      onChange={(e) =>
                        setNewCustomerData({
                          ...newCustomerData,
                          phone_number: e.target.value,
                        })
                      }
                      className="col-span-3 bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCustomerDialog(false)}
                    className="bg-slate-600 hover:bg-slate-500 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateCustomer}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Create Customer
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

export default AllSalesTransactionForm;
