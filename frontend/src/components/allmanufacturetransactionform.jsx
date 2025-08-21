"use client";

// Manufacture Transaction Form
// Assumptions (adjust to actual backend once available):
// Endpoint: POST alltransaction/manufacturetransaction/
// Fields: date, branch, reference(optional), manufacture: [{ product, quantity, unit_price }]
// Payment fields omitted (manufacture usually internal). Add if needed.
// Products fetched from existing inventory endpoint.

import React, { useState, useEffect } from "react";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";
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
import Sidebar from "@/components/allsidebar";
import NewProductDialog from "@/components/newProductDialog"; // reuse existing

function AllManufactureTransactionForm() {
  const { branchId } = useParams();
  const api = useAxios();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    branch: branchId,
    reference: "",
    manufacture_items: [{ product: "", unit_price: "", quantity: "" }],
  });
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: "",
    brand: "",
    cost_price: "",
    selling_price: "",
    branch: branchId,
    vendor: [],
  });
  const [newBrandName, setNewBrandName] = useState("");
  const [openProduct, setOpenProduct] = useState(
    Array(formData.manufacture_items.length).fill(false)
  );
  const [openBrand, setOpenBrand] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [branch, setBranch] = useState([]);
  const [userBranch, setUserBranch] = useState({});

  // Keydown handling for product scanning
  const [currentWord, setCurrentWord] = useState("");
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (currentWord.trim().length === 0) {
        handleSubmit();
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

        // First, check if a manufacture item already exists for this product
        const existingItemIndex = formData.manufacture_items.findIndex(
          (item) => item.product === productIdStr
        );

        if (existingItemIndex !== -1) {
          // Increase quantity for the existing item
          const updatedItems = [...formData.manufacture_items];
          const existingItem = updatedItems[existingItemIndex];
          const currentQuantity = parseInt(existingItem.quantity, 10) || 0;
          const newQuantity = currentQuantity + 1;
          existingItem.quantity = newQuantity.toString();
          setFormData((prevFormData) => ({
            ...prevFormData,
            manufacture_items: updatedItems,
          }));
        } else {
          // Check if there's an empty item to fill
          const emptyItemIndex = formData.manufacture_items.findIndex(
            (item) => item.product === ""
          );

          if (emptyItemIndex !== -1) {
            // Fill the empty item
            const updatedItems = [...formData.manufacture_items];
            updatedItems[emptyItemIndex] = {
              product: productIdStr,
              unit_price: matchingProduct.cost_price || matchingProduct.unit_price || "",
              quantity: "1",
            };
            setFormData((prevFormData) => ({
              ...prevFormData,
              manufacture_items: updatedItems,
            }));
          } else {
            // Neither an existing item nor an empty item found, so add a new item entry
            const newItem = {
              product: productIdStr,
              unit_price: matchingProduct.cost_price || matchingProduct.unit_price || "",
              quantity: "1",
            };
            setFormData((prevFormData) => ({
              ...prevFormData,
              manufacture_items: [...prevFormData.manufacture_items, newItem],
            }));
            setOpenProduct((prev) => [...prev, false]);
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
  }, [currentWord, products, formData.manufacture_items]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, brandsResponse, branchResponse, userBranchResponse] = await Promise.all([
          api.get(`allinventory/product/branch/${branchId}/`),
          api.get(`allinventory/brand/branch/${branchId}/`),
          api.get(`enterprise/branch/${branchId}/`),
          api.get(`enterprise/getbranch/`),
        ]);
        setProducts(productsResponse.data);
        setFilteredProducts(productsResponse.data);
        setBrands(brandsResponse.data);
        setBranch(branchResponse.data);
        setUserBranch(userBranchResponse.data);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleManufactureChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...formData.manufacture_items];
    newItems[index] = { ...newItems[index], [name]: value };
    setFormData({ ...formData, manufacture_items: newItems });
  };

  const handleProductChange = (index, value) => {
    if (value === "new") {
      setShowNewProductDialog(true);
    } else {
      const newItems = [...formData.manufacture_items];
      const matching = products.find((p) => p.id.toString() === value);
      newItems[index] = {
        ...newItems[index],
        product: value,
        unit_price: matching?.cost_price || matching?.unit_price || "",
      };
      setFormData((prev) => ({ ...prev, manufacture_items: newItems }));
    }
    const newOpen = [...openProduct];
    newOpen[index] = false;
    setOpenProduct(newOpen);
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      manufacture_items: [...prev.manufacture_items, { product: "", unit_price: "", quantity: "" }],
    }));
    setOpenProduct((prev) => [...prev, false]);
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      manufacture_items: prev.manufacture_items.filter((_, i) => i !== index),
    }));
    setOpenProduct((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateLineTotal = (unit_price, quantity) => {
    if (!unit_price || !quantity) return 0;
    return (parseFloat(unit_price) * parseFloat(quantity)).toFixed(2);
  };

  const totalAmount = formData.manufacture_items.reduce((acc, item) => {
    const line = parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0);
    return acc + (isNaN(line) ? 0 : line);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubLoading(true);
    setError(null);
    try {
      // Backend ManufactureItemSerializer only expects product & quantity
      const payload = { 
        ...formData,
        manufacture_items: formData.manufacture_items.map(it => ({
          product: it.product,
          quantity: it.quantity || 0,
          unit_price: it.unit_price || 0
        }))
      }; // strip frontend-only unit_price
      const response = await api.post("allinventory/manufacture/", payload);
      console.log("Manufacture created", response.data);
      navigate(`/manufacture/branch/${branchId}`);
    } catch (e) {
      console.error(e);
      setError("Submission failed (endpoint may not exist yet)");
    } finally {
      setSubLoading(false);
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

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("allinventory/product/", newProductData);
      setProducts((prev) => [...prev, response.data]);
      setFilteredProducts((prev) => [...prev, response.data]);
      setShowNewProductDialog(false);
      setNewProductData({ name: "", brand: "", cost_price: "", selling_price: "", branch: branchId, vendor: [] });
    } catch (err) {
      console.error(err);
      setError("Failed to add product");
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("allinventory/brand/", { name: newBrandName, branch: branchId });
      setBrands((prev) => [...prev, response.data]);
      setNewBrandName("");
      setShowNewBrandDialog(false);
      setNewProductData((prev) => ({ ...prev, brand: response.data.id.toString() }));
    } catch (err) {
      console.error(err);
      setError("Failed to add brand");
    }
  };

  if (loading) {
    return <div className='flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white'>Loading...</div>;
  }

  return (
    <div className='flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800'>
      <Sidebar className='hidden lg:block w-64 flex-shrink-0' />
      <div className='flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto'>
        <div className='max-w-4xl mx-auto'>
          <Button onClick={() => navigate('/')} variant='outline' className='mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Dashboard
          </Button>
          <div className='bg-slate-800 p-6 rounded-lg shadow-lg'>
            <h2 className='text-2xl lg:text-3xl font-bold mb-6 text-white'>Add Manufacture Transaction</h2>
            {error && <p className='text-red-400 mb-4'>{error}</p>}
            <form onSubmit={handleSubmit} className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='flex flex-col'>
                  <Label htmlFor='date' className='text-sm font-medium text-white mb-2'>Date</Label>
                  <Input type='date' id='date' name='date' value={formData.date} onChange={handleChange} className='bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500' required />
                </div>
                <div className='flex flex-col'>
                  <Label htmlFor='reference' className='text-sm font-medium text-white mb-2'>Reference</Label>
                  <Input type='text' id='reference' name='reference' placeholder='Batch or notes' value={formData.reference} onChange={handleChange} className='bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500' />
                </div>
              </div>

              <h3 className='text-xl font-semibold mb-2 text-white'>Items</h3>
              {formData.manufacture_items.map((item, index) => (
                <div key={index} className='bg-slate-700 p-4 rounded-md shadow mb-4'>
                  <h4 className='text-lg font-semibold mb-4 text-white'>Item {index + 1}</h4>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div className='flex flex-col'>
                      <Label htmlFor={`product-${index}`} className='text-sm font-medium text-white mb-2'>Product</Label>
                      <Popover open={openProduct[index]} onOpenChange={(open) => {
                        const newOpen = [...openProduct];
                        newOpen[index] = open;
                        setOpenProduct(newOpen);
                      }}>
                        <PopoverTrigger asChild>
                          <Button variant='outline' role='combobox' aria-expanded={openProduct[index]} className='w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500'>
                            {item.product ? products.find(p => p.id.toString() === item.product)?.name : 'Select a product...'}
                            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-full p-0 bg-slate-700 border-slate-600'>
                          <Command className='bg-slate-700 border-slate-600'>
                            <CommandInput placeholder='Search product...' className='bg-slate-700 text-white' />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem key={product.id} onSelect={() => handleProductChange(index, product.id.toString())} className='text-white hover:bg-slate-600'>
                                    <Check className={cn('mr-2 h-4 w-4', item.product === product.id.toString() ? 'opacity-100' : 'opacity-0')} />
                                    {product.name}
                                  </CommandItem>
                                ))}
                                <CommandItem onSelect={() => handleProductChange(index, 'new')} className='text-white hover:bg-slate-600'>
                                  <PlusCircle className='mr-2 h-4 w-4' />
                                  Add a new product
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className='flex flex-col'>
                      <Label htmlFor={`quantity-${index}`} className='text-sm font-medium text-white mb-2'>Quantity</Label>
                      <Input type='number' id={`quantity-${index}`} name='quantity' value={item.quantity} onChange={(e) => handleManufactureChange(index, e)} className='bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500' required />
                    </div>
                    <div className='flex flex-col'>
                      <Label htmlFor={`unit_price-${index}`} className='text-sm font-medium text-white mb-2'>Unit Cost</Label>
                      <Input type='number' id={`unit_price-${index}`} name='unit_price' value={item.unit_price} onChange={(e) => handleManufactureChange(index, e)} className='bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500' required />
                    </div>
                    <div className='flex flex-col'>
                      <Label className='text-sm font-medium text-white mb-2'>Line Total</Label>
                      <Input disabled value={calculateLineTotal(item.unit_price, item.quantity)} className='bg-slate-600 border-slate-500 text-white' />
                    </div>
                  </div>
                  {formData.manufacture_items.length > 1 && (
                    <Button type='button' variant='destructive' size='sm' className='mt-4 bg-red-600 hover:bg-red-700 text-white' onClick={() => handleRemoveItem(index)}>
                      <Trash2 className='w-4 h-4 mr-2' />Remove Item
                    </Button>
                  )}
                </div>
              ))}

                <Button type='button' onClick={handleAddItem} className='w-full bg-purple-600 hover:bg-purple-700 text-white'>
                  <PlusCircle className='w-4 h-4 mr-2' /> Add Another Item
                </Button>
              <Button type='submit' disabled={subLoading} className='w-full bg-green-600 hover:bg-green-700 text-white'>
                {subLoading ? 'Submitting...' : 'Submit Manufacture Transaction'}
              </Button>
            </form>

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
              vendors={[]} // manufacture context doesn't need vendor filter
            />

            {/* Brand Dialog (reusing minimal pattern) */}
            {showNewBrandDialog && (
              <div className='mt-4'>
                <Label htmlFor='newBrandName' className='text-white'>New Category Name</Label>
                <div className='flex gap-2 mt-2'>
                  <Input id='newBrandName' value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} className='bg-slate-700 border-slate-600 text-white' placeholder='Enter category name' />
                  <Button onClick={handleAddBrand} className='bg-green-600 hover:bg-green-700 text-white'>Add</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AllManufactureTransactionForm;
