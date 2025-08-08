"use client";

import React, { useState, useEffect } from "react";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import {
  Dialog,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NewProductDialog from "@/components/newProductDialog"; // Adjust the path as needed

function AllPurchaseTransactionForm() {
  const { branchId } = useParams();
  const api = useAxios();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    purchase: [{ product: "", unit_price: "", quantity: "", total_price: "" }],
    branch: branchId,
    vendor: "",
    method: "credit",
    cheque_number: null,
    cashout_date: null,
  });
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [brands, setBrands] = useState([]);
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
    vendor: [], // Changed to array for multiple vendors
  });
  const [newVendorData, setNewVendorData] = useState({
    name: "",
    brand: "",
    due: 0,
    branch: branchId,
  });
  const [newBrandName, setNewBrandName] = useState("");
  const [openProduct, setOpenProduct] = useState(
    Array(formData.purchase.length).fill(false)
  );
  const [openVendor, setOpenVendor] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [branch, setBranch] = useState([]);
  const [userBranch, setUserBranch] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          productsResponse,
          vendorsResponse,
          brandsResponse,
          branchResponse,
          userBranchResponse,
        ] = await Promise.all([
          api.get("allinventory/product/branch/" + branchId + "/"),
          api.get("alltransaction/vendor/branch/" + branchId + "/"),
          api.get("allinventory/brand/branch/" + branchId + "/"),
          api.get("enterprise/branch/" + branchId + "/"),
          api.get("enterprise/getbranch/"),
        ]);
        setProducts(productsResponse.data);
        setVendors(vendorsResponse.data);
        setBrands(brandsResponse.data);
        setBranch(branchResponse.data);
        setUserBranch(userBranchResponse.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Keydown handling for product scanning
  const [currentWord, setCurrentWord] = useState("");
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const scannedCode = currentWord.slice(0, -1);
      console.log("Word is:", scannedCode);
      const matchingProduct = products.find(
        (product) => product.uid === scannedCode
      );
      console.log("Matching product:", matchingProduct);

      if (matchingProduct) {
        const productIdStr = matchingProduct.id.toString();

        // First, check if a sale already exists for this product
        const existingPurchaseIndex = formData.purchase.findIndex(
          (purchase) => purchase.product === productIdStr
        );

        if (existingPurchaseIndex !== -1) {
          // Increase quantity for the existing sale
          const updatedPurchase = [...formData.purchase];
          const existingPurchase = updatedPurchase[existingPurchaseIndex];
          const currentQuantity = parseInt(existingPurchase.quantity, 10) || 0;
          const newQuantity = currentQuantity + 1;
          existingPurchase.quantity = newQuantity;
          existingPurchase.total_price =
            newQuantity * matchingProduct.cost_price;
          setFormData((prevFormData) => ({
            ...prevFormData,
            purchase: updatedPurchase,
          }));
        } else {
          // No existing sale for this product; check for an empty sale entry first
          const emptyPurchaseIndex = formData.purchase.findIndex(
            (purchase) => !purchase.product
          );
          if (emptyPurchaseIndex !== -1) {
            const updatedPurchase = [...formData.purchase];
            updatedPurchase[emptyPurchaseIndex] = {
              product: productIdStr,
              unit_price: matchingProduct.cost_price,
              quantity: 1,
              total_price: matchingProduct.cost_price,
            };
            setFormData((prevFormData) => ({
              ...prevFormData,
              purchase: updatedPurchase,
            }));
          } else {
            // Neither an existing sale nor an empty sale found, so add a new sale entry
            const newPurchase = {
              product: productIdStr,
              unit_price: matchingProduct.cost_price,
              quantity: 1,
              total_price: matchingProduct.cost_price,
            };
            setFormData((prevFormData) => ({
              ...prevFormData,
              purchase: [...prevFormData.purchase, newPurchase],
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleMethodChange = (value) => {
    setFormData({ ...formData, method: value });
  };

  const handlePurchaseChange = (index, e) => {
    const { name, value } = e.target;
    const newPurchase = [...formData.purchase];
    newPurchase[index] = { ...newPurchase[index], [name]: value };
    setFormData({ ...formData, purchase: newPurchase });

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
       const matchingProduct = products.find(
        (product) => product.id.toString() === value
      );
      newPurchase[index] = { ...newPurchase[index], product: value, unit_price: matchingProduct?.cost_price || "" };
      setFormData((prevState) => ({
        ...prevState,
        purchase: newPurchase,
      }));
    }
    const newOpenProduct = [...openProduct];
    newOpenProduct[index] = false;
    setOpenProduct(newOpenProduct);
  };


  // add this alongside your other handlers
const handleNewProductVendorChange = (ids) => {
  console.log("Selected Vendor IDs:", ids);
  setNewProductData(prev => ({ ...prev, vendor: ids }));
  console.log("New Product Data after vendor change:", newProductData);
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
        const filtered = products.filter((prod) => {
          console.log(prod)
          if (Array.isArray(prod.vendor)) {
            return prod.vendor.includes(selectedVendor.id);
          }
          if (Array.isArray(prod.vendors)) {
            return prod.vendors.some((v) => v.id === selectedVendor.id);
          }
          return prod.vendor === selectedVendor.id;
        });
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
      purchase: [...prevState.purchase, { product: "", unit_price: "" }],
    }));
    setOpenProduct((prevState) => [...prevState, false]);
  };

  const handleRemovePurchase = (index) => {
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
      const submissionData = JSON.parse(JSON.stringify(formData));
      const response = await api.post(
        "alltransaction/purchasetransaction/",
        submissionData
      );
      console.log("Response:", response.data);
      navigate("/purchases/branch/" + branchId);
    } catch (error) {
      console.error("Error posting data:", error);
      setError("Failed to submit purchase transaction. Please try again.");
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
      setNewProductData({
        name: "",
        brand: "",
        cost_price: "",
        selling_price: "",
        branch: branchId,
      });
      setShowNewProductDialog(false);
      setFilteredProducts((prevFilteredProducts) => [
        ...prevFilteredProducts,
        response.data,
      ]);
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
      const filteredProducts = products.filter(
        (product) => product.brand === response.data.brand
      );
      setFilteredProducts(filteredProducts);
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
        brand: response.data?.id?.toString(),
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

  const handleWheel = (e) => {
    e.target.blur();
  };

  const calculateTotal = (price, quantity) => {
    return (price * quantity).toFixed(2);
  };

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
              Add Purchase Transaction
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
              </div>

              {/* Branch Select */}
              {/* <div className="flex flex-col">
                <Label
                  htmlFor="branch"
                  className="text-sm font-medium text-white mb-2"
                >
                  Branch
                </Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, branch: value })
                  }
                  value={formData.branch}
                >
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {userBranch && Object.keys(userBranch).length > 0 ? (
                      <SelectItem
                        value={userBranch.id.toString()}
                        className="text-white"
                      >
                        {userBranch.name}
                      </SelectItem>
                    ) : (
                        <SelectItem
                          value={branch?.id?.toString()}
                          className="text-white"
                        >
                          {branch?.name}
                        </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Vendor Select */}
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
                          {!loading && vendors.length > 0 ? (
                            <>
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
                            </>
                          ) : loading ? (
                            <CommandItem>Loading...</CommandItem>
                          ) : (
                            <>
                              <CommandItem className="text-white">
                                No vendors available
                              </CommandItem>
                              <CommandItem
                                onSelect={() => handleVendorChange("new")}
                                className="text-white hover:bg-slate-600"
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add a new vendor
                              </CommandItem>
                            </>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <h3 className="text-xl font-semibold mb-2 text-white">
                Purchases
              </h3>
              {formData?.purchase?.map((purchase, index) => (
                <div
                  key={index}
                  className="bg-slate-700 p-4 rounded-md shadow mb-4"
                >
                  <h4 className="text-lg font-semibold mb-4 text-white">
                    Purchase {index + 1}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            className="w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                          >
                            {purchase.product
                              ? products.find(
                                  (product) =>
                                    product.id.toString() === purchase.product
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
                                {!loading && filteredProducts.length > 0 ? (
                                  <>
                                    {filteredProducts.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        onSelect={() =>
                                          handleProductChange(
                                            index,
                                            product.id.toString()
                                          )
                                        }
                                        className="text-white hover:bg-slate-600"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            purchase.product ===
                                              product.id.toString()
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
                                  </>
                                ) : loading ? (
                                  <CommandItem>Loading...</CommandItem>
                                ) : (
                                  <>
                                    <CommandItem className="text-white">
                                      No products available
                                    </CommandItem>
                                    <CommandItem
                                      onSelect={() =>
                                        handleProductChange(index, "new")
                                      }
                                      className="text-white hover:bg-slate-600"
                                    >
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Add a new product
                                    </CommandItem>
                                  </>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col">
                      <Label
                        htmlFor={`quantity-${index}`}
                        className="text-sm font-medium text-white mb-2"
                      >
                        Quantity
                      </Label>
                      <Input
                        type="number"
                        id={`quantity-${index}`}
                        name="quantity"
                        onWheel={handleWheel}
                        value={purchase.quantity}
                        onChange={(e) => handlePurchaseChange(index, e)}
                        className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter unit price"
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label
                        htmlFor={`price-${index}`}
                        className="text-sm font-medium text-white mb-2"
                      >
                        Unit Price
                      </Label>
                      <Input
                        type="number"
                        id={`unit_price-${index}`}
                        name="unit_price"
                        onWheel={handleWheel}
                        value={purchase.unit_price}
                        onChange={(e) => handlePurchaseChange(index, e)}
                        className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Enter unit price"
                        required
                      />
                    </div>


                    <div className="flex flex-col">
                      <Label
                        htmlFor={`total-${index}`}
                        className="text-sm font-medium text-white mb-2"
                      >
                        Total Price
                      </Label>
                      <Input
                        type="number"
                        id={`total-${index}`}
                        name="total_price"
                        value={calculateTotal(
                          purchase.unit_price,
                          purchase.quantity
                        )}
                        onChange={(e) => handlePurchaseChange(index, e)}
                        className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {index > 0 && (
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
                <Label
                  htmlFor="method"
                  className="text-sm font-medium text-white mb-2"
                >
                  Payment Method
                </Label>
                <Select
                  onValueChange={handleMethodChange}
                  value={formData.method}
                >
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="cash" className="text-white">
                      Cash
                    </SelectItem>
                    <SelectItem value="cheque" className="text-white">
                      Cheque
                    </SelectItem>
                    <SelectItem value="credit" className="text-white">
                      Credit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.method === "cheque" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <Label
                      htmlFor="cheque_number"
                      className="text-sm font-medium text-white mb-2"
                    >
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
                    <Label
                      htmlFor="cashout_date"
                      className="text-sm font-medium text-white mb-2"
                    >
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

              <Button
                type="button"
                onClick={handleAddPurchase}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Another Purchase
              </Button>

              <Button
                type="submit"
                disabled={subLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Submit Purchase Transaction
              </Button>
            </form>

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
              branches={branch}
              userBranch={userBranch}
              selectedBranch={formData.branch}
              vendors={vendors}
            />

            {/* New Vendor and New Brand dialogs remain unchanged */}
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
                      htmlFor="newVendorName"
                      className="text-right text-white"
                    >
                      Due
                    </Label>
                    <Input
                      id="newVendorDue"
                      name="due"
                      type="number"
                      value={newVendorData.due}
                      onChange={handleNewVendorChange}
                      className="col-span-3 bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter vendor due"
                    />
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default AllPurchaseTransactionForm;
