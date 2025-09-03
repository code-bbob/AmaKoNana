"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAxios from "@/utils/useAxios";
import Sidebar from "@/components/allsidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, PlusCircle, Trash2, ChevronsUpDown, Check } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// TransferForm replicates purchase form UX but posts barcode (uid) instead of product id
// Payload shape:
// { from_branch: <id>, to_branch: <id>, products: [ { product: <barcode>, quantity, unit_price } ] }

function TransferForm() {
  const { branchId } = useParams(); // this will be treated as from_branch
  const navigate = useNavigate();
  const api = useAxios();

  const [formData, setFormData] = useState({
    from_branch: branchId,
    to_branch: "",
    products: [ { product: "", quantity: "", unit_price: "" } ]
  });
  const [branches, setBranches] = useState([]); // list of accessible branches
  const [products, setProducts] = useState([]); // products for from_branch
  const [openProduct, setOpenProduct] = useState([false]);
  const [openBranch, setOpenBranch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subLoading, setSubLoading] = useState(false);

  // Fetch branches and products for from_branch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchResp, productResp] = await Promise.all([
          api.get("enterprise/branch/"),
          api.get("allinventory/product/branch/" + branchId + "/")
        ]);
        setBranches(branchResp.data || []);
        setProducts(productResp.data || []);
      } catch (e) {
        console.error(e);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  const handleProductChange = (index, value) => {
    const newLines = [...formData.products];
    if (value === "") {
      newLines[index] = { ...newLines[index], product: "", unit_price: "" };
    } else {
      const matching = products.find(p => p.id.toString() === value);
      // store barcode (uid) not id
      newLines[index] = {
        ...newLines[index],
        product: matching ? matching.uid : "",
        unit_price: matching ? matching.cost_price : ""
      };
    }
    setFormData(prev => ({ ...prev, products: newLines }));
    const newOpen = [...openProduct];
    newOpen[index] = false;
    setOpenProduct(newOpen);
  };

  const handleLineFieldChange = (index, e) => {
    const { name, value } = e.target;
    const newLines = [...formData.products];
    newLines[index] = { ...newLines[index], [name]: value };
    setFormData(prev => ({ ...prev, products: newLines }));
  };

  const addLine = () => {
    setFormData(prev => ({ ...prev, products: [...prev.products, { product: "", quantity: "", unit_price: "" }] }));
    setOpenProduct(prev => [...prev, false]);
  };

  const removeLine = (index) => {
    setFormData(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));
    setOpenProduct(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.to_branch) {
      setError("Please select destination branch");
      return;
    }
    if (formData.to_branch === formData.from_branch) {
      setError("Destination branch must be different");
      return;
    }
    // Prepare payload with numeric branches and filtered product lines (omit empty)
    const payload = {
      from_branch: parseInt(formData.from_branch, 10),
      to_branch: parseInt(formData.to_branch, 10),
      products: formData.products
        .filter(l => l.product && l.quantity && l.unit_price)
        .map(l => ({
          product: l.product, // already barcode
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price)
        }))
    };
    if (payload.products.length === 0) {
      setError("Add at least one product");
      return;
    }
    try {
      setSubLoading(true);
      await api.post("alltransaction/product-transfer/", payload);
      navigate("/inventory/branch/" + branchId); // redirect to something relevant
    } catch (e) {
      console.error(e);
      setError("Transfer failed");
    } finally {
      setSubLoading(false);
    }
  };

  // Barcode scanner listener (Enter separated) -> product.uid is scanned code (some UIDs may include prefix/suffix; mimic purchase logic slice?)
  const [currentWord, setCurrentWord] = useState("");
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const scannedCode = currentWord.slice(-13, -1); // replicate existing pattern
      if (scannedCode.trim().length === 0) {
        setCurrentWord("");
        return;
      }
      const match = products.find(p => p.uid === scannedCode);
      if (match) {
        // Try merge into existing line with same barcode
        const existingIndex = formData.products.findIndex(l => l.product === match.uid);
        if (existingIndex !== -1) {
          const newLines = [...formData.products];
          const qty = parseFloat(newLines[existingIndex].quantity) || 0;
            const newQty = qty + 1;
          newLines[existingIndex].quantity = newQty;
          setFormData(prev => ({ ...prev, products: newLines }));
        } else {
          // Find empty line
          const emptyIndex = formData.products.findIndex(l => !l.product);
          if (emptyIndex !== -1) {
            const newLines = [...formData.products];
            newLines[emptyIndex] = { product: match.uid, quantity: 1, unit_price: match.cost_price };
            setFormData(prev => ({ ...prev, products: newLines }));
          } else {
            setFormData(prev => ({ ...prev, products: [...prev.products, { product: match.uid, quantity: 1, unit_price: match.cost_price }] }));
            setOpenProduct(prev => [...prev, false]);
          }
        }
      }
      setCurrentWord("");
    } else {
      setCurrentWord(prev => prev + e.key);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentWord, products, formData.products]);

  const calcLineTotal = (line) => {
    const q = parseFloat(line.quantity) || 0;
    const p = parseFloat(line.unit_price) || 0;
    return (q * p).toFixed(2);
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
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">Product Transfer</h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">From Branch</Label>
                  <Input disabled value={branches.find(b => b.id?.toString() === formData.from_branch)?.name || formData.from_branch} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">To Branch</Label>
                  <Popover open={openBranch} onOpenChange={setOpenBranch}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={openBranch} className="w-full justify-between bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                        {formData.to_branch ? branches.find(b => b.id.toString() === formData.to_branch)?.name : "Select destination branch..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-slate-800 border-slate-700">
                      <Command className="bg-slate-700 border-slate-600">
                        <CommandInput placeholder="Search branch..." className="bg-slate-700 text-white" />
                        <CommandList>
                          <CommandEmpty>No branch found.</CommandEmpty>
                          <CommandGroup>
                            {!loading && branches.filter(b => b.id.toString() !== formData.from_branch).map(br => (
                              <CommandItem key={br.id} onSelect={() => { setFormData(prev => ({ ...prev, to_branch: br.id.toString() })); setOpenBranch(false); }} className="text-white hover:bg-slate-600">
                                <Check className={cn("mr-2 h-4 w-4", formData.to_branch === br.id.toString() ? "opacity-100" : "opacity-0")} />
                                {br.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2 text-white">Products</h3>
              {formData.products.map((line, index) => (
                <div key={index} className="bg-slate-700 p-4 rounded-md shadow mb-4">
                  <h4 className="text-lg font-semibold mb-4 text-white">Line {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium text-white mb-2">Product</Label>
                      <Popover
                        open={openProduct[index]}
                        onOpenChange={(open) => {
                          const n = [...openProduct];
                          n[index] = open;
                          setOpenProduct(n);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" aria-expanded={openProduct[index]} className="w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500">
                            {line.product ? products.find(p => p.uid === line.product)?.name : "Select a product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-slate-700 border-slate-600">
                          <Command className="bg-slate-700 border-slate-600">
                            <CommandInput placeholder="Search product..." className="bg-slate-700 text-white" />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {!loading && products.map(product => (
                                  <CommandItem key={product.id} onSelect={() => handleProductChange(index, product.id.toString())} className="text-white hover:bg-slate-600">
                                    <Check className={cn("mr-2 h-4 w-4", line.product === product.uid ? "opacity-100" : "opacity-0")} />
                                    {product.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium text-white mb-2">Quantity</Label>
                      <Input type="number" name="quantity" value={line.quantity} onChange={(e) => handleLineFieldChange(index, e)} className="bg-slate-600 border-slate-500 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium text-white mb-2">Unit Price</Label>
                      <Input type="number" name="unit_price" value={line.unit_price} onChange={(e) => handleLineFieldChange(index, e)} className="bg-slate-600 border-slate-500 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium text-white mb-2">Total</Label>
                      <Input type="number" value={calcLineTotal(line)} readOnly className="bg-slate-600 border-slate-500 text-white" />
                    </div>
                  </div>
                  {formData.products.length > 1 && (
                    <Button type="button" variant="destructive" size="sm" className="mt-4 bg-red-600 hover:bg-red-700 text-white" onClick={() => removeLine(index)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Remove Line
                    </Button>
                  )}
                </div>
              ))}

              <Button type="button" onClick={addLine} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Another Product
              </Button>
              <Button type="submit" disabled={subLoading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                {subLoading ? "Transferring..." : "Submit Transfer"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransferForm;
