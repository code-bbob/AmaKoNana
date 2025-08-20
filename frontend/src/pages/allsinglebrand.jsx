"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Container, Search, ArrowLeft, Trash2, Plus, List } from "lucide-react";
import useAxios from "../utils/useAxios";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Sidebar from "../components/allsidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

import Select from "react-select";
import clsx from "clsx";

export default function AllBrandProducts() {
  const api = useAxios();
  const { branchId, id } = useParams();
  const navigate = useNavigate();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [brandName, setBrandName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [branch, setBranch] = useState([]);
  const [branchData, setBranchData] = useState({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Vendor & new‑product dialog state
  const [vendors, setVendors] = useState([]);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: "",
    brand: id,
    cost_price: "",
    selling_price: "",
    branch: branchId,
    vendor: [],
    print_pattern: null,
  });
  const [imagePreview, setImagePreview] = useState(null);

  // react‑select styling to match your Tailwind theme
  const selectStyle = {
  control: ({ isFocused }) =>
    cn(
      "bg-slate-700 border border-slate-600 rounded px-2 py-1",
      isFocused && "ring-2 ring-purple-500"
    ),
  input: () => "[&_input:focus]:ring-0",
  menu: () => "bg-slate-700 border border-slate-600 rounded mt-1 z-50",
  option: ({ isFocused, isSelected }) =>
    cn(
      "px-3 py-2 cursor-pointer",
      isFocused && "bg-slate-600",
      isSelected && "bg-purple-600 text-white"
    ),
  placeholder: () => "text-sm text-slate-500",
  };

  // Fetch products, branches, current branch & vendors
  useEffect(() => {
    async function fetchData() {
      try {
        const [pRes, brRes, cbRes, vRes] = await Promise.all([
          api.get(`allinventory/brand/${id}/`),
          api.get(`enterprise/branch/`),
          api.get(`enterprise/branch/${branchId}/`),
          api.get(`alltransaction/vendor/`),
        ]);

        setProducts(pRes.data);
        setFilteredProducts(pRes.data);
        setBrandName(pRes.data[0]?.brandName || "Brand");

        setBranch(brRes.data);
        setBranchData(cbRes.data);
        setNewProductData((prev) => ({
          ...prev,
          branch: cbRes.data.id.toString(),
        }));

        setVendors(
          vRes.data.map((v) => ({ value: v.id, label: v.name }))
        );

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
        setLoading(false);
      }
    }
    fetchData();
  }, [ id, branchId]);

  // Filter products on searchTerm
  useEffect(() => {
    setFilteredProducts(
      products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, products]);

  // Handlers
  const handleSearch = (e) => setSearchTerm(e.target.value);

  const fetchBarcode = async (pid) => {
    try {
      const r = await api.get(`allinventory/barcode/${pid}/`);
      setBarcode(r.data);
    } catch {
      setBarcode("");
    }
  };

  const handleProductClick = (p, e) => {
    if (!e.target.closest(".checkbox-wrapper")) {
      setSelectedProduct(p);
      fetchBarcode(p.id);
    }
  };

  const handleCheckboxChange = (pid) =>
    setSelectedProducts((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );

  const handleDeleteSelected = async () => {
    setIsDeleteDialogOpen(false);
    try {
      await Promise.all(
        selectedProducts.map((pid) =>
          api.delete(`allinventory/deleteproduct/${pid}/`)
        )
      );
      const remaining = products.filter((p) => !selectedProducts.includes(p.id));
      setProducts(remaining);
      setFilteredProducts(remaining);
      setSelectedProducts([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportProducts = async (sbId) => {
    try {
      await api.post(
        `allinventory/product/branch/${branchId}/brand/${id}/merge/${sbId}/`
      );
      setIsImportDialogOpen(false);
      const r = await api.get(`allinventory/brand/${id}/`);
      setProducts(r.data);
      setFilteredProducts(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVendorSelect = (opts) =>
    setNewProductData((prev) => ({
      ...prev,
      vendor: opts ? opts.map((o) => o.value) : [],
    }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProductData((prev) => ({
        ...prev,
        print_pattern: file,
      }));
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      // If we have an image file, keep existing multipart behaviour.
      // Otherwise just send plain JSON (simpler & debuggable) so you don't need FormData.
      let r;
      if (newProductData.print_pattern) {
        const formData = new FormData();
        Object.keys(newProductData).forEach(key => {
          if (key === 'vendor') {
            newProductData.vendor.forEach(vendorId => formData.append('vendor', vendorId));
          } else if (key === 'print_pattern' && newProductData.print_pattern) {
            formData.append('print_pattern', newProductData.print_pattern);
          } else if (newProductData[key] !== null && newProductData[key] !== '') {
            formData.append(key, newProductData[key]);
          }
        });
        r = await api.post("allinventory/product/", formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        // Build a clean JSON payload (omit empty strings & nulls)
        const { print_pattern, ...rest } = newProductData; // strip file field
        const payload = Object.fromEntries(Object.entries(rest).filter(([_, v]) => v !== '' && v !== null));
        r = await api.post("allinventory/product/", payload); // axios sends JSON by default
      }
      
      setProducts((prev) => [...prev, r.data]);
      setFilteredProducts((prev) => [...prev, r.data]);
      setNewProductData({
        name: "",
        brand: id,
        cost_price: "",
        selling_price: "",
        branch: branchId,
        vendor: [],
        print_pattern: null,
      });
      setImagePreview(null);
      setShowNewProductDialog(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (p) =>
    navigate(`/inventory/branch/${p.branch}/editproduct/${p.id}`);

  // const handlePrintBarcode = () => {
  //   const w = window.open();
  //   w.document.write(`
  //     <html>
  //       <head>
  //         <title>Print Barcode</title>
  //         <style>
  //           body { text-align: center; margin: 20px; }
  //           img { max-width: 100%; }
  //         </style>
  //       </head>
  //       <body>
  //         <div>${barcode}</div>
  //       </body>
  //     </html>
  //   `);
  //   w.document.close();
  //   w.print();
  // };

  const handlePrintBarcode = () => {
  if (!selectedProduct || !barcode) return; // nothing to print

  const printWindow = window.open('', '_blank');
  const productName = selectedProduct.name;

  // construct the HTML doc
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Barcode - ${productName}</title>
        <style>
          /* Center everything and give a little breathing room */
          body {
            text-align: center;
            margin: 40px;
          }
          /* Make sure SVG scales nicely to the page width */
          svg {
            max-width: 100%;
            height: auto;
          }
          /* Style the product name for print */
          .product-name {
            margin-top: 12px;
            font-size: 12pt;      /* good print size */
            font-family: sans-serif;
          }
          @media print {
            /* remove any default margins */
            @page { margin: 0; }
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <!-- your SVG barcode -->
        <div id="barcode">
          ${barcode}
        </div>
        <!-- the product name below -->
        <div class="product-name">
          ${productName}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  // optionally close the window after printing
  // printWindow.close();
};


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white text-lg">
        Loading...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500 text-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-10 lg:ml-64">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col space-y-4 mb-8"
        >
          <div className="flex justify-between">
            <div className="flex justify-center items-center w-full">
              <h1 className="text-xl sm:text-2xl lg:text-4xl text-center font-bold text-white">
                {brandName} Products
              </h1>
            </div>
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <List className="h-6 w-6 text-white" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      Import From Branch
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {branch?.map((b) => (
                          <DropdownMenuItem
                            key={b.id}
                            onClick={() => {
                              setSelectedBranch(b);
                              setIsImportDialogOpen(true);
                            }}
                          >
                            {b.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 w-full bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 w-full sm:w-auto">
              <Button
                onClick={() => navigate("/inventory/branch/" + branchId)}
                variant="outline"
                className="w-full sm:w-auto px-5 text-black border-white hover:bg-gray-700 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-3" />
                Back to Inventory
              </Button>
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                className="w-full sm:w-auto px-5"
                disabled={selectedProducts.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <List className="h-8 w-6 text-white" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        Import From Branch
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {branch?.map((b) => (
                            <DropdownMenuItem
                              key={b.id}
                              onClick={() => {
                                setSelectedBranch(b);
                                setIsImportDialogOpen(true);
                              }}
                            >
                              {b.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
              </div>

          </motion.div>

        {/* Products Table */}
        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg">
          <CardContent className="p-0 overflow-x-auto">
            <div className="grid grid-cols-12 gap-2 p-2 sm:p-4 text-xs sm:text-sm font-medium text-slate-300 border-b border-slate-700">
              <div className="col-span-1"></div>
              <div className="col-span-4 lg:col-span-4">Particulars</div>
              <div className="col-span-2 lg:col-span-2 text-center">Quantity</div>
              <div className="col-span-2 lg:col-span-2 text-right">Unit Price</div>
              <div className="col-span-3 lg:col-span-3 text-right">Stock Price</div>
            </div>
            {filteredProducts.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`grid grid-cols-12 gap-2 p-2 sm:p-4 items-center hover:bg-slate-800 transition-colors duration-200 cursor-pointer ${
                  selectedProducts.includes(p.id) ? "bg-slate-700" : ""
                }`}
                onClick={(e) => handleProductClick(p, e)}
              >
                <div className="col-span-1 flex items-center justify-center checkbox-wrapper">
                  <Checkbox
                    checked={selectedProducts.includes(p.id)}
                    onCheckedChange={() => handleCheckboxChange(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="border-gray-400"
                  />
                </div>
                <div className="col-span-4 lg:col-span-4 flex items-center">
                  <Container className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-purple-400 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="text-white text-xs sm:text-sm lg:text-base truncate">
                    {p.name}
                  </span>
                </div>
                <div
                  className={`col-span-2 lg:col-span-2 text-center ${
                    p.count < 3 ? "text-red-500" : "text-green-500"
                  } text-xs sm:text-sm lg:text-base`}
                >
                  {p.count}
                </div>
                <div className="col-span-2 lg:col-span-2 text-right text-white text-xs sm:text-sm lg:text-base">
                  {p.selling_price
                    ? `RS. ${p.selling_price.toLocaleString()}`
                    : "N/A"}
                </div>
                <div className="col-span-3 lg:col-span-3 text-right text-white text-xs sm:text-sm lg:text-base">
                  {p.stock
                    ? `RS. ${p.stock.toLocaleString()}`
                    : "N/A"}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {filteredProducts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-white mt-8 text-sm sm:text-base"
          >
            No products found matching your search.
          </motion.div>
        )}

        {/* Product Details Dialog */}
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogTrigger asChild><span className="hidden" /></DialogTrigger>
          <DialogContent className="w-full max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl flex justify-between mt-2">
                <div>Product Details</div>
                <Button onClick={() => handleEdit(selectedProduct)} className="hover:scale-105">
                  Edit
                </Button>
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Details for {selectedProduct?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 text-sm sm:text-base">
              {[
                ["Name", selectedProduct?.name],
                ["Quantity", selectedProduct?.count],
                ["Cost Price", selectedProduct?.cost_price ? `RS. ${selectedProduct.cost_price.toLocaleString()}` : "N/A"],
                ["Selling Price", selectedProduct?.selling_price ? `RS. ${selectedProduct.selling_price.toLocaleString()}` : "N/A"],
                ["Stock Price", selectedProduct?.stock ? `RS. ${selectedProduct.stock.toLocaleString()}` : "N/A"],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="font-semibold">{label}:</p>
                  <p>{val}</p>
                </div>
              ))}
            </div>
            
            {/* Print Pattern Image */}
            {selectedProduct?.print_pattern_url && (
              <div className="mt-4">
                <p className="font-semibold mb-2 text-sm sm:text-base">Print Pattern:</p>
                <div className="flex justify-center">
                  <img 
                    src={`${selectedProduct.print_pattern_url}`} 
                    alt="Print Pattern" 
                    className="max-w-full max-h-48 object-contain rounded border border-slate-600"
                  />
                </div>
              </div>
            )}
            <div className="mt-4">
              <p className="font-semibold mb-2 text-sm sm:text-base">Barcode:</p>
              <p>{selectedProduct?.uid || "N/A"}</p>
            </div>
{/*             
            <div className="mt-4">
              <p className="font-semibold mb-2 text-sm sm:text-base">Barcode:</p>
              {barcode ? (
                <div
                  dangerouslySetInnerHTML={{ __html: barcode }}
                  className="w-full h-full cursor-pointer"
                  onClick={handlePrintBarcode}
                />
              ) : (
                <p className="text-sm sm:text-base">No barcode available</p>
              )}
            </div> */}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="w-full max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Confirm Deletion</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Are you sure you want to delete the selected products? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" className="w-full text-black sm:w-auto" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDeleteSelected}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Products Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="bg-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="my-2">
                {`Are you sure you want to import products from ${selectedBranch?.name}?`}
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                This action will import all products from the selected branch for this brand. Existing products will be merged or updated.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => handleImportProducts(selectedBranch.id)}
                className="w-full bg-purple-600 hover:scale-105 hover:bg-purple-700 text-white"
              >
                Import Products
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add New Product Button */}
        <Button
          className="fixed bottom-8 right-8 rounded-full w-14 h-14 lg:w-16 lg:h-16 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => setShowNewProductDialog(true)}
        >
          <Plus className="w-6 h-6 lg:w-8 lg:h-8" />
        </Button>

        {/* New Product Dialog */}
        <Dialog open={showNewProductDialog} onOpenChange={(open) => {
          setShowNewProductDialog(open);
          if (!open) {
            // Reset form when closing
            setNewProductData({
              name: "",
              brand: id,
              cost_price: "",
              selling_price: "",
              branch: branchId,
              vendor: [],
              print_pattern: null,
            });
            setImagePreview(null);
          }
        }}>
          <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription className="text-slate-300">
                Enter the details of the new product you want to add.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newProductName" className="text-right text-white">
                  Name
                </Label>
                <Input
                  id="newProductName"
                  name="name"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3 bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter product name"
                />
              </div>
              {/* Cost Price */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newProductCostPrice" className="text-right text-white">
                  Cost Price
                </Label>
                <Input
                  id="newProductCostPrice"
                  name="cost_price"
                  value={newProductData.cost_price}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, cost_price: e.target.value }))}
                  className="col-span-3 bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter cost price"
                />
              </div>
              {/* Selling Price */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newProductSellingPrice" className="text-right text-white">
                  Selling Price
                </Label>
                <Input
                  id="newProductSellingPrice"
                  name="selling_price"
                  value={newProductData.selling_price}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, selling_price: e.target.value }))}
                  className="col-span-3 bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter selling price"
                />
              </div>
              {/* Vendors */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newProductVendors" className="text-right text-white">
                  Vendors
                </Label>
                <div className="col-span-3">
                  <Select
                    id="newProductVendors"
                    isMulti
                    unstyled
                    options={vendors}
                    value={vendors.filter(v => newProductData.vendor.includes(v.value))}
                    onChange={handleVendorSelect}
                    classNames={selectStyle}
                    className=" bg-slate-700 border-slate-600 text-sm"
                    placeholder="Select vendors"
                  />
                </div>
              </div>
              
              {/* Print Pattern Image */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newProductImage" className="text-right text-white">
                  Print Pattern
                </Label>
                <div className="col-span-3">
                  <Input
                    id="newProductImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="bg-slate-700 border-slate-600 text-white file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                  />
                  {imagePreview && (
                    <div className="mt-2 flex justify-center">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-24 max-h-24 w-full h-auto object-contain rounded border border-slate-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleAddProduct}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
