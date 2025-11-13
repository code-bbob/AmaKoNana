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
  Menu,
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
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    // Write-off amount to reduce payable total (not sent as total_amount)
    writeoff: 0,
    // Mixed payment breakdown
    cash_amount: 0,
    card_amount: 0,
    online_amount: 0,
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
  const [payable, setPayable] = useState(0);

  // Settings dialog & master discount state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [masterDiscount, setMasterDiscount] = useState(""); // percentage string 0-100
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Derived payable considering write-off (clamped between 0 and total)
  const safeWriteoff = Math.min(Math.max(parseFloat(formData.writeoff) || 0, 0), totalAmount);

  useEffect(() => {
   setPayable(totalAmount - formData.writeoff);
   console.log("Payable updated to:", totalAmount - formData.writeoff);
  }, [safeWriteoff, totalAmount, formData.writeoff]);

  const [change, setChange] = useState(0);

  useEffect(() => {
    console.log("THIS IS AMOUNT PAID:",formData.amount_paid)
    setChange(Math.max(0,(parseFloat(formData.amount_paid)||0)-payable).toFixed(2));
  }, [formData.amount_paid, payable]);

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

  //for credited amount calculation

  useEffect(() => {
    if (formData.method === 'credit') {
      setFormData((prevFormData) => ({
        ...prevFormData,
        credited_amount: totalAmount - formData.writeoff - formData.amount_paid,
      }));
      // console.log("Credited amount updated to:", totalAmount - formData.writeoff - formData.amount_paid);
    }
  }, [formData.amount_paid, totalAmount, formData.method, formData.writeoff]);

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
      
      // Set discount with priority: masterDiscount -> customerEligible 5% -> keep existing
      const next = { 
        ...newSales[index], 
        product: value, 
        unit_price: matchingProduct ? matchingProduct.selling_price : "",
      };
      if (masterDiscount !== "") {
        next.discount_type = "percent";
        next.discount_value = masterDiscount;
      } else if (shouldApplyDiscount) {
        next.discount_type = "percent";
        next.discount_value = "5";
      }
      newSales[index] = next;
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

  const handleAddSale = (e) => {
    e.preventDefault();
    e.stopPropagation();  
    const newSaleItem = { 
      product: "", 
      unit_price: "", 
      quantity: "", 
      discount_type: "percent", 
  discount_value: masterDiscount !== "" ? masterDiscount : (customerEligibleForDiscount ? "5" : ""), 
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

  // Apply the current masterDiscount percent to all lines
  const applyMasterDiscountToAll = () => {
    const pct = Math.min(Math.max(parseFloat(masterDiscount) || 0, 0), 100);
    const updated = formData.sales.map((line) => ({
      ...line,
      discount_type: "percent",
      discount_value: pct === 0 ? "" : String(pct),
    }));
    // Recalc each line totals
    updated.forEach(recalcLine);
    setFormData((prev) => ({ ...prev, sales: updated }));
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
      
  if (isEligibleForDiscount && masterDiscount === "") {
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
      console.log("formdata before submit:", formData);
      // Mixed payment validation & calculations against payable (total - writeoff)
      if (formData.method === 'mixed') {
        const c = parseFloat(formData.cash_amount) || 0;
        const o = parseFloat(formData.online_amount) || 0;
        const d = parseFloat(formData.card_amount) || 0;
        console.log("Mixed payment amounts:", {c, o, d, payable});
        console.log("Formdata.method is ",formData.method);
        const sum = c + o + d;
        if (Math.abs(sum - payable) > 0.01) {
          // simple error alert and abort
          alert(`Mixed payment breakdown (${sum.toFixed(2)}) must equal payable (${payable.toFixed(2)})`);
          setSubLoading(false);
          return;
        }
      }
      const originalTotal = totalAmount;
  
      const payload = {
        ...formData,
        sales: preparedSales,
        subtotal: subtotal,
        // Submit original total without write-off
        total_amount: originalTotal,
        cash_amount: parseFloat(formData.cash_amount) || 0,
        card_amount: parseFloat(formData.card_amount) || 0,
        online_amount: parseFloat(formData.online_amount) || 0,
        // No matter what is typed, amount_paid is original total minus write-off
        amount_paid: payable,
        // Keep credited_amount consistent on backend (credit becomes the write-off)
        credited_amount: formData.credited_amount || 0
      };
      const response = await api.post(
        "alltransaction/salestransaction/",
        payload
      );
      console.log("payload:", payload);
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

  // Keydown handling for product scanning
  const [currentWord, setCurrentWord] = useState("");
  const handleKeyDown = (e) => {
    // Ignore modified keys and repeated keydown events
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    // Don't intercept typing inside inputs/textareas/selects or contenteditable
    const target = e.target;
    const tag = target?.tagName?.toLowerCase();
    const isEditable = target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';

    if (e.key === "Enter") {
      // Prevent immediate re-trigger from key repeat (which caused instant close/submit)
      if (e.repeat) {
        e.preventDefault();
        return;
      }
      // If dialog is open, Enter should confirm & submit
      if (showPaymentDialog) {
        e.preventDefault();
        handleSubmit();
        return;
      }
      // If focus is inside an input-like element, let the element handle Enter normally
      if (isEditable) return;
      // If no current barcode word, open payment dialog instead of submitting directly
      if (currentWord.trim().length === 0){
        e.preventDefault();
        setShowPaymentDialog(true);
        return;
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
              discount_value: masterDiscount !== "" ? masterDiscount : (customerEligibleForDiscount ? "5" : ""), 
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
              discount_value: masterDiscount !== "" ? masterDiscount : (customerEligibleForDiscount ? "5" : ""), 
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
      // Accumulate barcode-like input only when not typing into inputs
      if (!isEditable) {
        setCurrentWord((prev) => prev + e.key);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentWord, products, showPaymentDialog]);

  // ESC to close payment dialog
  useEffect(() => {
    const escHandler = (e) => {
      if (e.key === 'Escape' && showPaymentDialog) {
        setShowPaymentDialog(false);
      }
    };
    window.addEventListener('keydown', escHandler);
    return () => window.removeEventListener('keydown', escHandler);
  }, [showPaymentDialog]);

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
    // Auto-fill amount_paid with payable when not in credit/mixed mode
    // setFormData((prev) => ({
    //   ...prev,
    //   amount_paid: (prev.method === "credit" || prev.method === "mixed") ? prev.amount_paid : Math.max(0, (newSubtotal - newTotalDiscount) - (Math.min(Math.max(parseFloat(prev.writeoff) || 0, 0), (newSubtotal - newTotalDiscount))))
    // }));
  }, [formData.sales]);

  // Keep amount_paid in sync when writeoff, method, or total changes (non-credit, non-mixed)
  useEffect(() => {
    if (formData.method !== 'credit' && formData.method !== 'mixed') {
      console.log("HERE IN EFFECT", totalAmount, formData.writeoff);
      console.log("Payable is:", payable);
      setFormData((prev) => ({
        ...prev,
        amount_paid: payable,
      }));
    }
  }, [formData.method, formData.writeoff, totalAmount, payable]);

  // Normalize mixed breakdown when payable changes so that sum matches payable
  useEffect(() => {
    if (formData.method !== 'mixed') return;
    const cash = parseFloat(formData.cash_amount) || 0;
    const card = parseFloat(formData.card_amount) || 0;
    const online = parseFloat(formData.online_amount) || 0;
    const nonCash = card + online;
    let newCash = cash;
    let newCard = card;
    let newOnline = online;

    if (nonCash <= payable) {
      // keep non-cash as is, cash becomes remainder
      newCash = Math.max(0, payable - nonCash);
    } else {
      // scale down card and online proportionally to fit payable; set cash to 0
      if (nonCash > 0) {
        const scale = payable / nonCash;
        newCard = parseFloat((card * scale).toFixed(2));
        newOnline = parseFloat((online * scale).toFixed(2));
        const adjusted = newCard + newOnline;
        const roundingDiff = parseFloat((payable - adjusted).toFixed(2));
        // push rounding diff into card to exactly match payable
        newCard = parseFloat((newCard + roundingDiff).toFixed(2));
      } else {
        newCard = 0; newOnline = 0;
      }
      newCash = 0;
    }

    const sum = newCash + newCard + newOnline;
    const epsilon = 0.009; // tolerate cent-level differences
    const changed = Math.abs(newCash - cash) > epsilon || Math.abs(newCard - card) > epsilon || Math.abs(newOnline - online) > epsilon;
    if (changed) {
      setFormData((prev) => ({
        ...prev,
        cash_amount: newCash,
        card_amount: newCard,
        online_amount: newOnline,
        amount_paid: sum,
      }));
    } else if (Math.abs((parseFloat(formData.amount_paid)||0) - sum) > epsilon) {
      setFormData((prev) => ({ ...prev, amount_paid: sum }));
    }
  }, [payable, formData.method]);

  // No separate global discount; totalAmount derived above

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow lg:ml-64 overflow-auto">
        <div className="">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">
                Add Sales Transaction

            </h2>
 <Button
              type="button"
              variant="outline"
              className="px-3 py-2 text-white border-slate-600 bg-slate-700 hover:bg-slate-600"
              onClick={() => setShowSettingsDialog(true)}
              title="Transaction Settings"
              >
              <Menu className="h-5 w-5" />
            </Button>
              </div>

            {error && <p className="text-red-600 mb-4">{error}</p>}
            <form onSubmit={(e)=>{e.preventDefault(); setShowPaymentDialog(true);}} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
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

              {/* Bill-like items table */}
              <div className="bg-slate-700 rounded shadow p-4">
                <Table className="text-white">
                  <TableHeader>
                    <TableRow className="border-slate-600">
                      <TableHead className="text-slate-300">#</TableHead>
                      <TableHead className="text-slate-300">Product</TableHead>
                      <TableHead className="text-slate-300 ">Unit Price</TableHead>
                      <TableHead className="text-slate-300 ">Qty</TableHead>
                      <TableHead className="text-slate-300 ">Subtotal</TableHead>
                      <TableHead className="text-slate-300">Discount</TableHead>
                      <TableHead className="text-slate-300 ">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.sales.map((sale, index) => (
                      <TableRow key={index} className="border-slate-600">
                        <TableCell className="text-slate-200">{index + 1}</TableCell>
                        <TableCell className="w-[360px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
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
                                <PopoverContent className="w-[320px] p-0 bg-slate-700 border-slate-600">
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
                            {formData.sales.length > 1 && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-transparent"
                                title="Remove line"
                                onClick={() => handleRemoveSale(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[140px] ">
                          <Input type="number" name="unit_price" value={sale.unit_price} onChange={(e) => handleChange(index, e)} className="bg-slate-600 border-slate-500 text-white  font-mono tabular-nums" placeholder="0.00" required />
                        </TableCell>
                        <TableCell className="w-[120px] ">
                          <Input type="number" name="quantity" value={sale.quantity} onChange={(e) => handleChange(index, e)} className="bg-slate-600 border-slate-500 text-white  font-mono tabular-nums" placeholder="0" required />
                        </TableCell>
                        <TableCell className="w-[140px] ">
                          <Input type="number" value={sale.line_subtotal} readOnly className="bg-slate-600 border-slate-500 text-white  font-mono tabular-nums" />
                        </TableCell>
                        <TableCell className="w-[220px]">
                          <div className="flex">
                            <Select value={sale.discount_type} onValueChange={(value) => handleDiscountTypeChange(index, value)}>
                              <SelectTrigger className="w-16 bg-slate-600 border-slate-500 rounded-none rounded-l text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="percent" className="text-white">%</SelectItem>
                                <SelectItem value="amount" className="text-white">Amount</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input type="number" name="discount_value" value={sale.discount_value} onChange={(e) => handleChange(index, e)} className="bg-slate-600 rounded-none rounded-r border-slate-500 text-white flex-1  font-mono tabular-nums" placeholder={sale.discount_type === "percent" ? "%" : "0.00"} />
                          </div>
                        </TableCell>
                        <TableCell className="w-[140px] text-right">
                          <Input type="number" value={sale.total_price} readOnly className="bg-slate-600 border-slate-500 text-white  font-mono tabular-nums" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* <Button type="button" className=" p-0"> */}
                      <PlusCircle onClick={(e) => handleAddSale(e)} className="w-6 h-6 hover:text-green-500 mt-2 text-white font-bold" />
                    {/* </Button> */}

                  </TableBody>
                  <TableFooter>
                    <TableRow className="border-t border-slate-600">
                      <TableCell colSpan={4}></TableCell>
                      <TableCell className="text-right font-medium ">{subtotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium ">{totalDiscount.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-white">{totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Table footer already shows totals; removed extra summary card for a more bill-like feel */}

              
                
              
              <Button
                type="submit"
                disabled={subLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Proceed to Payment (Enter)
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

            {/* Payment Dialog (Full-screen with left/right split and mixed payments) */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
              <DialogContent
                className="fixed inset-0 m-5 p-0 bg-slate-900/95 text-white flex flex-col rounded-none border-0 shadow-none translate-x-0 translate-y-0 overflow-hidden"
                style={{ width: '98vw', maxWidth: '97vw', height: '97vh' }}
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl font-semibold">Payment</DialogTitle>
                    <DialogDescription className="text-slate-400 mt-1">Bill #{formData.bill_no} • {formData.date}</DialogDescription>
                  </div>
                  <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="border-slate-600 bg-slate-800 hover:bg-slate-700 text-white">Close</Button>
                </div>
                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Left: details */}
                  <div className="w-1/2 border-r border-slate-800 flex flex-col">
                    <div className="px-6 py-3 flex items-center justify-between">
                      <h3 className="text-lg font-medium">Details</h3>
                      <span className="text-xs text-slate-400">{formData.sales.length} items</span>
                    </div>
                    <div className="flex-1 overflow-hidden px-6 pb-4">
                      <ScrollArea className="h-full">
                        <Table className="text-sm">
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400 w-10">#</TableHead>
                              <TableHead className="text-slate-400">Item</TableHead>
                              <TableHead className="text-slate-400 text-right w-16">Qty</TableHead>
                              <TableHead className="text-slate-400 text-right w-24">Price</TableHead>
                              <TableHead className="text-slate-400 text-right w-24">Disc</TableHead>
                              <TableHead className="text-slate-400 text-right w-24">Net</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.sales.map((s,i)=>{
                              const prod = products.find(p=>p.id?.toString()===s.product);
                              const name = prod?.name || 'Item';
                              const qty = parseFloat(s.quantity)||0;
                              const price = parseFloat(s.unit_price)||0;
                              const net = parseFloat(s.total_price)||0;
                              const hasDisc = (s.discount_type==='percent' && (parseFloat(s.discount_value)||0)>0) || (s.discount_type==='amount' && (parseFloat(s.discount_value)||0)>0);
                              const discLabel = hasDisc ? (s.discount_type==='percent' ? `${parseFloat(s.discount_value||0)}%` : `${parseFloat(s.discount_value||0).toFixed(2)}`) : '-';
                              return (
                                <TableRow key={i} className="border-slate-800">
                                  <TableCell className="text-slate-300">{i+1}</TableCell>
                                  <TableCell className="text-slate-200 truncate max-w-[220px]">{name}</TableCell>
                                  <TableCell className="text-right font-mono tabular-nums">{qty}</TableCell>
                                  <TableCell className="text-right font-mono tabular-nums">{price.toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-mono tabular-nums">{discLabel}</TableCell>
                                  <TableCell className="text-right font-mono tabular-nums">{net.toFixed(2)}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                    <div className="mt-auto border-t border-slate-800 bg-slate-900 px-6 py-4 space-y-2">
                      <div className="flex justify-between text-slate-300 text-sm"><span>Subtotal</span><span className="font-mono">{subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between text-slate-300 text-sm"><span>Discount</span><span className="font-mono">{totalDiscount.toFixed(2)}</span></div>
                      <div className="flex justify-between text-slate-300 text-sm"><span>Write-off</span><span className="font-mono">{safeWriteoff.toFixed(2)}</span></div>
                      <div className="flex justify-between text-white text-base font-semibold"><span>Payable</span><span className="font-mono">{payable.toFixed(2)}</span></div>
                    </div>
                  </div>
                  {/* Right: payment */}
                  <div className="w-1/2 flex flex-col">
                    <div className="px-6 py-3">
                      <h3 className="text-lg font-medium mb-4">Payment</h3>
                      <div className="space-y-4">
                        <div>

                          <div className="flex justify-between mb-1">
                            Total : <span className="font-mono">{totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between my-3">
                            Write Off: <Input type="number" value={formData.writeoff} onChange={(e)=>setFormData(prev=>({...prev, writeoff: e.target.value }))} className="bg-slate-800 border-slate-700 text-white w-24 font-mono" />
                          </div>
                          <div className="flex justify-between mb-1">
                            Amount Paid : <span className="font-mono">{payable.toFixed(2)}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-slate-300 mb-1">Method</Label>
                          <Select
                            value={formData.method}
                            onValueChange={(value)=>{
                              setFormData(prev=>({...prev, method:value }));
                              if (value !== 'mixed') {
                                setFormData(prev=>({...prev, cash_amount: value==='cash'?payable:0, card_amount: value==='card'?payable:0, online_amount: value==='online'?payable:0 }));
                              }
                            }}
                          >
                            <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="cash" className="text-white">Cash</SelectItem>
                              <SelectItem value="card" className="text-white">Card</SelectItem>
                              <SelectItem value="online" className="text-white">Online</SelectItem>
                              <SelectItem value="mixed" className="text-white">Mixed</SelectItem>
                              <SelectItem value="credit" className="text-white">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.method !== 'credit' && formData.method !== 'mixed' && (
                          <div>
                            <Label className="text-slate-300 mb-1">Amount Received:</Label>
                            <Input type="number" onChange={(e)=>setFormData(prev=>({...prev, amount_paid: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-slate-800 border border-slate-700 rounded p-2 flex justify-between"><span className="text-slate-400">Change</span><span className="font-mono">{change}</span></div>
                              {/* <div className="bg-slate-800 border border-slate-700 rounded p-2 flex justify-between"><span className="text-slate-400">Balance</span><span className="font-mono">{Math.max(0,totalAmount-(parseFloat(formData.amount_paid)||0)).toFixed(2)}</span></div> */}
                            </div>
                          </div>
                        )}

                        {formData.method === 'mixed' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label className="text-slate-300 mb-1">Cash</Label>
                                <Input type="number" value={formData.cash_amount} onChange={(e)=>{
                                  const val = parseFloat(e.target.value)||0; const card=formData.card_amount; const online=formData.online_amount; const sum = val+card+online; setFormData(prev=>({...prev,cash_amount: val, amount_paid: sum }));
                                }} className="bg-slate-800 border-slate-700 text-white" />
                              </div>
                              <div>
                                <Label className="text-slate-300 mb-1">Online</Label>
                                <Input type="number" value={formData.online_amount} onChange={(e)=>{
                                  const val = parseFloat(e.target.value)||0; const cash=formData.cash_amount; const card=formData.card_amount; const sum = cash+card+val; setFormData(prev=>({...prev,online_amount: val, amount_paid: sum }));
                                }} className="bg-slate-800 border-slate-700 text-white" />
                              </div>
                              <div>
                                <Label className="text-slate-300 mb-1">Card</Label>
                                <Input type="number" value={formData.card_amount} onChange={(e)=>{
                                  const val = parseFloat(e.target.value)||0; const cash=formData.cash_amount; const online=formData.online_amount; const sum = cash+online+val; setFormData(prev=>({...prev,card_amount: val, amount_paid: sum }));
                                }} className="bg-slate-800 border-slate-700 text-white" />
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>Breakdown Total</span>
                              <span className="font-mono">{((parseFloat(formData.cash_amount)||0)+(parseFloat(formData.card_amount)||0)+(parseFloat(formData.online_amount)||0)).toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              {(() => { const sum = (parseFloat(formData.cash_amount)||0)+(parseFloat(formData.card_amount)||0)+(parseFloat(formData.online_amount)||0); return (
                                <>
                                  <div className="bg-slate-800 border border-slate-700 rounded p-2 flex justify-between"><span className="text-slate-400">Remaining</span><span className="font-mono">{(payable - sum).toFixed(2)}</span></div>
                                  <div className="bg-slate-800 border border-slate-700 rounded p-2 flex justify-between"><span className="text-slate-400">Change</span><span className="font-mono">{Math.max(0, sum - payable).toFixed(2)}</span></div>
                                  <div className="bg-slate-800 border border-slate-700 rounded p-2 flex justify-between"><span className="text-slate-400">Balance</span><span className="font-mono">{Math.max(0, payable - sum).toFixed(2)}</span></div>
                                </>
                              ); })()}
                            </div>
                          </div>
                        )}

                        {formData.method === 'credit' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-white mb-2">Debtor</Label>
                              <Popover open={openDebtor} onOpenChange={setOpenDebtor}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={openDebtor} className="w-full justify-between bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                                    {formData.debtor ? debtors.find((d)=>d.id.toString()===formData.debtor)?.name : 'Select a debtor...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0 bg-slate-800 border-slate-700">
                                  <Command className="bg-slate-800 border-slate-700" required>
                                    <CommandInput placeholder="Search debtor..." className="bg-slate-800 text-white" />
                                    <CommandList>
                                      <CommandEmpty>No debtor found.</CommandEmpty>
                                      <CommandGroup>
                                        {debtors.map((debtor) => (
                                          <CommandItem key={debtor.id} onSelect={()=>{ setFormData(prev=>({...prev, debtor: debtor.id.toString()})); setOpenDebtor(false); }} className="text-white hover:bg-slate-700">
                                            <Check className={cn('mr-2 h-4 w-4', formData.debtor === debtor.id.toString() ? 'opacity-100' : 'opacity-0')} />
                                            {debtor.name}
                                          </CommandItem>
                                        ))}
                                        <CommandItem onSelect={()=>{ setShowNewDebtorDialog(true); setOpenDebtor(false); }} className="text-white hover:bg-slate-700">
                                          <PlusCircle className="mr-2 h-4 w-4" /> Add a new debtor
                                        </CommandItem>
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="flex gap-5">

                            <div>
                              <Label className="text-slate-300 mb-1">Amount paid</Label>
                              <Input type="number" value={formData.amount_paid} onChange={(e)=>setFormData(prev=>({...prev, amount_paid: e.target.value}))} className="bg-slate-800 border-slate-700 text-white" />
                            </div>
                            <div>
                              <Label className="text-slate-300 mb-1">Credited Amount</Label>
                              <Input type="number" value={formData.credited_amount} className="bg-slate-800 border-slate-700 text-white" />
                            </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center bg-slate-900">
                  <div className="text-xs text-slate-400">Press Enter to confirm • Esc to cancel</div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="bg-slate-800 border-slate-700 text-white" onClick={()=>setShowPaymentDialog(false)}>Cancel</Button>
                    <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" disabled={subLoading} onClick={handleSubmit}>Confirm & Submit</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Settings Dialog */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Transaction Settings</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Configure master discount to apply across all sale lines.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="master_discount" className="text-right text-white">
                      Master Discount (%)
                    </Label>
                    <Input
                      id="master_discount"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={masterDiscount}
                      onChange={(e) => setMasterDiscount(e.target.value)}
                      className="col-span-3 bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-slate-600 hover:bg-slate-500 text-white"
                    onClick={() => setShowSettingsDialog(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      applyMasterDiscountToAll();
                      setShowSettingsDialog(false);
                    }}
                  >
                    Apply to All
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
