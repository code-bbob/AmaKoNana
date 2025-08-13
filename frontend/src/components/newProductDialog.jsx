"use client";

import React from "react";
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
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, PlusCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import ReactSelect from "react-select";
import { useBranchManagement } from "../hooks/useBranchManagement";

export default function NewProductDialog({
  open,
  setOpen,
  newProductData,
  handleNewProductChange,
  handleNewProductBrandChange,
  handleNewProductVendorChange,
  handleNewProductImageChange,
  handleAddProduct,
  brands,
  openBrand,
  setOpenBrand,
  vendors,
  imagePreview
}) {
  const { currentBranch } = useBranchManagement();

  // Tailwind‑themed classNames for react‑select
  const vendorSelectClasses = {
    control: ({ isFocused }) =>
      cn(
        "bg-slate-700 border border-slate-600 rounded px-2 py-1",
        isFocused && "ring-2 ring-purple-500"
      ),
    input: () => "[&_input:focus]:ring-0",
    placeholder: () => "text-sm text-slate-500",
    menu: () => "bg-slate-700 border border-slate-600 rounded mt-1 z-50",
    option: ({ isFocused, isSelected }) =>
      cn(
        "px-3 py-2 cursor-pointer",
        isFocused && "bg-slate-600",
        isSelected && "bg-purple-600 text-white"
      ),
  };

  // Map your vendors into react-select format
  const vendorOptions = vendors?.map((v) => ({
    value: v.id,
    label: v.name,
  }));

  console.log("Vendor Options:", vendorOptions);

  // Derive the currently selected options from newProductData.vendor_ids
  const vendorValue = vendorOptions?.filter((o) =>
    newProductData.vendor?.includes(o.value)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription className="text-slate-300">
            Enter the details of the new product you want to add.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 px-1">
          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="newProductName" className="sm:text-right text-white">
              Name
            </Label>
            <Input
              id="newProductName"
              name="name"
              value={newProductData.name}
              onChange={handleNewProductChange}
              className="col-span-1 sm:col-span-3 bg-slate-700 border-slate-600 text-white"
              placeholder="Enter product name"
            />
          </div>

          {/* Cost Price */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="newProductCostPrice" className="sm:text-right text-white">
              Cost Price
            </Label>
            <Input
              id="newProductCostPrice"
              name="cost_price"
              value={newProductData.cost_price}
              onChange={handleNewProductChange}
              className="col-span-1 sm:col-span-3 bg-slate-700 border-slate-600 text-white"
              placeholder="Enter cost price"
            />
          </div>

          {/* Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="newProductSellingPrice" className="sm:text-right text-white">
              Selling Price
            </Label>
            <Input
              id="newProductSellingPrice"
              name="selling_price"
              value={newProductData.selling_price}
              onChange={handleNewProductChange}
              className="col-span-1 sm:col-span-3 bg-slate-700 border-slate-600 text-white"
              placeholder="Enter selling price"
            />
          </div>

          {/* Brand Select */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="newProductBrand" className="sm:text-right text-white">
              Category
            </Label>
            <div className="col-span-1 sm:col-span-3">
              <Popover open={openBrand} onOpenChange={setOpenBrand}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openBrand}
                    className="w-full justify-between bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    {newProductData.brand
                      ? brands.find((b) => b.id.toString() === newProductData.brand)?.name
                      : "Select a category..."}
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
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {brands.map((brand) => (
                          <CommandItem
                            key={brand.id}
                            onSelect={() => handleNewProductBrandChange(brand.id.toString())}
                            className="text-white hover:bg-slate-600"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newProductData.brand === brand.id.toString()
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {brand.name}
                          </CommandItem>
                        ))}
                        <CommandItem
                          onSelect={() => handleNewProductBrandChange("new")}
                          className="text-white hover:bg-slate-600"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add a new category
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Branch Display - Now shows selected branch from localStorage */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="newProductBranch" className="sm:text-right text-white">
              Branch
            </Label>
            <div className="col-span-1 sm:col-span-3">
              <div className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
                {currentBranch ? currentBranch.name : "No branch selected"}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Branch is automatically set from your selection
              </p>
            </div>
          </div>

          {/* Vendors Multi‑Select */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="newProductVendors" className="sm:text-right text-white">
              Vendors
            </Label>
            <div className="col-span-1 sm:col-span-3">
              <ReactSelect
                id="newProductVendors"
                isMulti
                unstyled
                options={vendorOptions}
                value={vendorValue}
                onChange={(selected) =>
                  handleNewProductVendorChange(
                    selected ? selected.map((o) => o.value) : []
                  )
                }
                classNames={vendorSelectClasses}
                className="text-white"
                placeholder="Select one or more vendors..."
              />
            </div>
          </div>

          {/* Print Pattern Image */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="newProductImage" className="sm:text-right text-white">
              Print Pattern
            </Label>
            <div className="col-span-1 sm:col-span-3">
              <Input
                id="newProductImage"
                type="file"
                accept="image/*"
                onChange={handleNewProductImageChange}
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
  );
}
