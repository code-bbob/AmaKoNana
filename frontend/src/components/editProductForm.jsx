// EditProductForm.jsx
"use client";

import React, { useState, useEffect } from "react";
import useAxios from "@/utils/useAxios";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "./allsidebar";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import ReactSelect from "react-select";
import { cn } from "@/lib/utils";

const EditProductForm = () => {
  const { productId } = useParams();
  const api = useAxios();
  const navigate = useNavigate();

  // ------------------------------------------------------------------
  // Form state now includes vendor_ids array
  const [formData, setFormData] = useState({
    name: "",
    uid: "",
    cost_price: "",
    selling_price: "",
    vendor: [],        // ← new
    print_pattern: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  // Vendors list for select
  const [vendors, setVendors] = useState([]);

  // ------------------------------------------------------------------
  // Fetch product and vendor lists
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodRes, venRes] = await Promise.all([
          api.get(`allinventory/product/${productId}/`),
          api.get("alltransaction/vendor/"),
        ]);

        // Load product into form
        setFormData({
          name: prodRes.data.name || "",
          uid: prodRes.data.uid || "",
          cost_price: prodRes.data.cost_price ?? "",
          selling_price: prodRes.data.selling_price ?? "",
          vendor: prodRes.data.vendor || [],    // assumes API returns vendor_ids[]
          print_pattern: null,
        });

        // Set current image URL if it exists
        if (prodRes.data.print_pattern_url) {
          setCurrentImageUrl(prodRes.data.print_pattern_url);
        }

        // Load vendors for selection
        setVendors(venRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load product or vendors.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  // ------------------------------------------------------------------
  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleVendorSelect = (selectedOptions) => {
    setFormData((f) => ({
      ...f,
      vendor: selectedOptions
        ? selectedOptions.map((o) => o.value)
        : [],
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((f) => ({
        ...f,
        print_pattern: file,
      }));
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    //check if the barcode is 12 digits, if not set error
    if (formData.uid.length !== 12) {
      setError("Barcode ID must be exactly 12 digits.");
      setLoading(false);
      return;
    }
    try {
      // Use FormData if image is being uploaded
      if (formData.print_pattern) {
        const formDataToSend = new FormData();
        
        // Append all form fields
        Object.keys(formData).forEach(key => {
          if (key === 'vendor') {
            // Handle vendor array
            formData.vendor.forEach(vendorId => {
              formDataToSend.append('vendor', vendorId);
            });
          } else if (key === 'print_pattern' && formData.print_pattern) {
            // Handle file upload
            formDataToSend.append('print_pattern', formData.print_pattern);
          } else if (formData[key] !== null && formData[key] !== '') {
            formDataToSend.append(key, formData[key]);
          }
        });

        await api.patch(`allinventory/product/${productId}/`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Regular JSON update if no image
        const { print_pattern, ...dataToSend } = formData;
        await api.patch(`allinventory/product/${productId}/`, dataToSend);
      }
      
      navigate("/"); 
    } catch (err) {
      console.error("Error updating product", err);
      setError("Error updating product.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // react-select styling to match your theme
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

  // Map vendors for react-select
  const vendorOptions = vendors.map((v) => ({
    value: v.id,
    label: v.name,
  }));

  // Current selected values
  const vendorValue = vendorOptions.filter((o) =>
    formData.vendor.includes(o.value)
  );

  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white text-lg">
        Loading...
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar />
      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="mb-4 w-full sm:w-48 md:ml-72 lg:ml-80 px-5 my-4 text-black border-white hover:bg-gray-700 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-3" />
          Back to Dashboard
        </Button>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 max-w-4xl mx-auto md:ml-72 lg:ml-80 md:mr-8 p-4 sm:p-6 bg-slate-800 rounded-lg"
        >
          {error && <p className="text-red-500">{error}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Product Name */}
          <div className="flex flex-col">
            <Label
              htmlFor="name"
              className="text-lg font-medium text-white mb-2"
            >
              Product Name
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          {/* Barcode */}
          <div className="flex flex-col">
            <Label
              htmlFor="uid"
              className="text-lg font-medium text-white mb-2"
            >
              Barcode Id
            </Label>
            <Input
              type="text"
              id="uid"
              name="uid"
              value={formData.uid}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          {/* Cost Price */}
          <div className="flex flex-col">
            <Label
              htmlFor="cost_price"
              className="text-lg font-medium text-white mb-2"
            >
              Cost Price
            </Label>
            <Input
              type="number"
              id="cost_price"
              name="cost_price"
              value={formData.cost_price}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          {/* Selling Price */}
          <div className="flex flex-col">
            <Label
              htmlFor="selling_price"
              className="text-lg font-medium text-white mb-2"
            >
              Selling Price
            </Label>
            <Input
              type="number"
              id="selling_price"
              name="selling_price"
              value={formData.selling_price}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
        </div>

        {/* Vendors Multi‑Select */}
        <div className="flex flex-col">
          <Label
            htmlFor="vendors"
            className="text-lg font-medium text-white mb-2"
          >
            Vendors
          </Label>
          <ReactSelect
            id="vendors"
            isMulti
            unstyled
            options={vendorOptions}
            value={vendorValue}
            onChange={handleVendorSelect}
            classNames={vendorSelectClasses}
            className="text-white"
            placeholder="Select one or more vendors..."
          />
        </div>

        {/* Print Pattern Image */}
        <div className="flex flex-col">
          <Label
            htmlFor="image"
            className="text-lg font-medium text-white mb-2"
          >
            Print Pattern Image
          </Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="bg-slate-700 border-slate-600 text-white file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
          />
          
          {/* Image Preview */}
          {(imagePreview || currentImageUrl) && (
            <div className="mt-4 flex justify-center">
              <div className="relative">
                <img 
                  src={imagePreview || currentImageUrl} 
                  alt="Product Pattern Preview" 
                  className="max-w-48 max-h-48 w-full h-auto object-contain rounded border border-slate-600"
                />
                <p className="text-xs text-slate-400 text-center mt-2">
                  {imagePreview ? "New image selected" : "Current image"}
                </p>
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full hover:bg-black" disabled={loading}>
          Submit
        </Button>
        </form>
      </div>
    </div>
  );
};

export default EditProductForm;
