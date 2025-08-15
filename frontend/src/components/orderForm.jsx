"use client";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "@/components/allsidebar";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Order Form replicates look & feel of purchase form but tailored to Order model
function OrderForm() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const api = useAxios();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    branch: branchId,
    enterprise: null, // set on submit via backend expected enterprise from token, but keep for clarity
    total_amount: "",
    advance_amount: "",
    advance_method: "cash",
    status: "pending",
    due_date: "",
    items: [ { item: "", image: null } ] // Add image field back
  });

  // Generic change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelect = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Order items handlers
  const handleOrderItemChange = (index, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const clone = { ...prev };
      clone.items = clone.items.map((it, i) => i === index ? { ...it, [name]: value } : it);
      return clone;
    });
  };

  const addOrderItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { item: "", image: null }] }));
  };

  const removeOrderItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleImageChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const clone = { ...formData };
      clone.items = clone.items.map((it, i) => i === index ? { ...it, image: file } : it);
      setFormData(clone);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Check if any items have images
      const hasImages = formData.items.some(item => item.image);
      
      if (hasImages) {
        // Use FormData if images are being uploaded
        const formDataToSend = new FormData();
        
        // Append main order fields
        formDataToSend.append('customer_name', formData.customer_name);
        formDataToSend.append('customer_phone', formData.customer_phone);
        formDataToSend.append('customer_address', formData.customer_address);
        formDataToSend.append('status', formData.status);
        formDataToSend.append('total_amount', formData.total_amount);
        formDataToSend.append('advance_amount', formData.advance_amount);
        formDataToSend.append('advance_method', formData.advance_method);
        formDataToSend.append('branch', branchId);
        
        // Append items
        formData.items.forEach((item, index) => {
          formDataToSend.append(`items[${index}]item`, item.item);
          if (item.image) {
            formDataToSend.append(`items[${index}]image`, item.image);
          }
        });

        await api.post(`order/branch/${branchId}/`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Regular JSON submission if no images
        const payload = { ...formData, branch: branchId };
        await api.post(`order/branch/${branchId}/`, payload);
      }
      
      navigate(`/orders/branch/${branchId}`);
    } catch (err) {
      console.error('Error details:', err.response?.data);
      setError("Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWheel = (e) => {
    e.target.blur();
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
              Add Order
            </h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label
                    htmlFor="customer_name"
                    className="text-sm font-medium text-white mb-2"
                  >
                    Customer Name
                  </Label>
                  <Input
                    type="text"
                    id="customer_name"
                    name="customer_name"
                    placeholder="Enter customer name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>

                <div className="flex flex-col">
                  <Label
                    htmlFor="customer_phone"
                    className="text-sm font-medium text-white mb-2"
                  >
                    Customer Phone
                  </Label>
                  <Input
                    type="text"
                    id="customer_phone"
                    name="customer_phone"
                    placeholder="Enter customer phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label
                    htmlFor="due_date"
                    className="text-sm font-medium text-white mb-2"
                  >
                    Due Date
                  </Label>
                  <Input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div className="flex flex-col">
                  <Label
                    htmlFor="status"
                    className="text-sm font-medium text-white mb-2"
                  >
                    Status
                  </Label>
                  <Select value={formData.status} onValueChange={v => handleSelect('status', v)}>
                    <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="pending" className="text-white">Pending</SelectItem>
                      <SelectItem value="prepared" className="text-white">Prepared</SelectItem>
                      <SelectItem value="dispatched" className="text-white">Dispatched</SelectItem>
                      <SelectItem value="completed" className="text-white">Completed</SelectItem>
                      <SelectItem value="canceled" className="text-white">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    onWheel={handleWheel}
                    value={formData.total_amount}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter total amount"
                  />
                </div>

                <div className="flex flex-col">
                  <Label
                    htmlFor="advance_amount"
                    className="text-sm font-medium text-white mb-2"
                  >
                    Advance Amount
                  </Label>
                  <Input
                    type="number"
                    id="advance_amount"
                    name="advance_amount"
                    onWheel={handleWheel}
                    value={formData.advance_amount}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter advance amount"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <Label
                  htmlFor="advance_method"
                  className="text-sm font-medium text-white mb-2"
                >
                  Advance Method
                </Label>
                <Select value={formData.advance_method} onValueChange={v => handleSelect('advance_method', v)}>
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="cash" className="text-white">Cash</SelectItem>
                    <SelectItem value="credit_card" className="text-white">Credit Card</SelectItem>
                    <SelectItem value="mobile_payment" className="text-white">Mobile Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <h3 className="text-xl font-semibold mb-2 text-white">
                Order Items
              </h3>
              {formData?.items?.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-700 p-4 rounded-md shadow mb-4"
                >
                  <h4 className="text-lg font-semibold mb-4 text-white">
                    Item {index + 1}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col">
                      <Label
                        htmlFor={`item-${index}`}
                        className="text-sm font-medium text-white mb-2"
                      >
                        Item Description
                      </Label>
                      <Input
                        type="text"
                        id={`item-${index}`}
                        name="item"
                        value={item.item}
                        onChange={(e) => handleOrderItemChange(index, e)}
                        className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Describe the item"
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label
                        htmlFor={`image-${index}`}
                        className="text-sm font-medium text-white mb-2"
                      >
                        Item Image
                      </Label>
                      <Input
                        type="file"
                        id={`image-${index}`}
                        name="image"
                        accept="image/*"
                        onChange={(e) => handleImageChange(index, e)}
                        className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => removeOrderItem(index)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Item
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                onClick={addOrderItem}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Another Item
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? 'Submitting...' : 'Submit Order'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
export default OrderForm;