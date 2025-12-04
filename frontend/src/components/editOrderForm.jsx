"use client";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "@/components/allsidebar";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, ArrowLeft, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Edit Order Form
function EditOrderForm() {
  const { branchId, orderId } = useParams();
  const navigate = useNavigate();
  const api = useAxios();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);

  // Helper to turn relative media path into absolute URL (backend sends relative like /media/..)
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
  const resolveMedia = (path) => {
    if (!path) return null;
    if (/^https?:/i.test(path)) return path; // already absolute
    return `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  useEffect(()=>{
    const fetchOrder = async () => {
      try {
    const res = await api.get(`order/${orderId}/`);
        const data = res.data;
        
        // Format due_date for HTML date input (expects YYYY-MM-DD)
        let formattedDueDate = "";
        if (data.due_date) {
          const date = new Date(data.due_date);
          if (!isNaN(date.getTime())) {
            formattedDueDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        }
        
    setFormData({
          bill_no: data.bill_no || "",
          customer_name: data.customer_name || "",
          customer_phone: data.customer_phone || "",
            branch: data.branch,
            total_amount: data.total_amount || "",
      // UPDATED: advance & remaining payment fields
      advance_received: data.advance_received || "",
      advance_method: data.advance_method || "cash",
      remaining_received: data.remaining_received,
      remaining_received_method: data.remaining_received_method || "cash",
      remaining_received_date: data.remaining_received_date,
            status: data.status || "pending",
            due_date: formattedDueDate,
            items: (data.items || []).map(it => ({ 
              id: it.id, 
              item: it.item || "",
      image: null,
      currentImage: resolveMedia(it.image) || null,
      preview: null,
      clearImage: false // Track if user wants to clear existing image
            }))
        });
      } catch (err){
        console.error(err);
        setError("Failed to load order");
      } finally { setLoading(false); }
    };
    fetchOrder();
  }, [orderId]);

  const todaysDate = () => new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let next = { ...prev, [name]: value };
      // Auto-set remaining_received_date when remaining_received entered first time
      if ((name === 'remaining_received' && value && !prev.remaining_received_date) ||
          (name === 'remaining_received_method' && value && !prev.remaining_received_date && prev.remaining_received)) {
        next.remaining_received_date = todaysDate();
      }
      return next;
    });
  };
  const handleSelect = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const handleOrderItemChange = (index, e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      items: prev.items.map((it,i)=> {
        if (i === index) {
          return { ...it, [name]: value };
        }
        return it;
      })
    }));
  };
  const addOrderItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { item: "", image: null, preview: null, clearImage: false }] }));
  const removeOrderItem = (index) => setFormData(prev => ({ ...prev, items: prev.items.filter((_,i)=> i!== index) }));

  const handleImageChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setFormData(prev => ({ 
        ...prev, 
        items: prev.items.map((it, i) => i === index ? { ...it, image: file, preview, clearImage: false } : it)
      }));
    }
  };

  const clearImage = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((it,i)=> i===index ? { ...it, image: null, preview: null, clearImage: true } : it)
    }));
  }

  const handleDeleteOrder = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`order/${orderId}/`);
      navigate(`/orders/branch/${branchId}`);
    } catch (err) {
      console.error('Error deleting order:', err.response?.data);
      setError("Failed to delete order");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const hasNewImages = formData.items.some(item => item.image);
      const hasClearImages = formData.items.some(item => item.clearImage);
      
      if (hasNewImages || hasClearImages) {
        // Use FormData for image uploads/clears
        const formDataToSend = new FormData();
        formDataToSend.append('bill_no', formData.bill_no);
        formDataToSend.append('customer_name', formData.customer_name);
        formDataToSend.append('customer_phone', formData.customer_phone);
        formDataToSend.append('status', formData.status);
  formDataToSend.append('total_amount', formData.total_amount || '');
  formDataToSend.append('advance_received', formData.advance_received || '');
  formDataToSend.append('advance_method', formData.advance_method);
  formDataToSend.append('remaining_received', formData.remaining_received);
  formDataToSend.append('remaining_received_method', formData.remaining_received_method || '');
  formDataToSend.append('remaining_received_date', formData.remaining_received_date);
        formDataToSend.append('due_date', formData.due_date || '');
        
        formData.items.forEach((item, index) => {
          if (item.id) formDataToSend.append(`items[${index}]id`, item.id);
          formDataToSend.append(`items[${index}]item`, item.item);
          
          if (item.image) {
            formDataToSend.append(`items[${index}]image`, item.image);
          } else if (item.clearImage) {
            formDataToSend.append(`items[${index}]image`, '');
          }
        });

        await api.patch(`order/${orderId}/`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Use JSON for text-only updates
        const itemsForUpdate = formData.items.map(it => {
          const itemData = { item: it.item };
          if (it.id) itemData.id = it.id;
          return itemData;
        });
        
        const payload = {
          bill_no: formData.bill_no,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          total_amount: formData.total_amount || '',
          advance_received: formData.advance_received || '',
          advance_method: formData.advance_method,
          remaining_received: formData.remaining_received,
          remaining_received_method: formData.remaining_received_method || '',
          remaining_received_date: formData.remaining_received_date,
          status: formData.status,
          due_date: formData.due_date || '',
          items: itemsForUpdate
        };
        
        await api.patch(`order/${orderId}/`, payload);
      }
      
      navigate(`/orders/branch/${branchId}`);
    } catch(err){
      console.error('Error details:', err.response?.data);
      setError("Failed to update order");
    } finally { setSubmitting(false); }
  };

  const handleWheel = (e) => {
    e.target.blur();
  };

  if(loading || !formData){
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        Loading...
      </div>
    );
  }

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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-white">
                Edit Order
              </h2>
              
                        </div>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
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
                    value={formData.due_date || ''}
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
                      {/* <SelectItem value="canceled" className="text-white">Canceled</SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label htmlFor="total_amount" className="text-sm font-medium text-white mb-2">Total Amount</Label>
                  <Input
                    type="number"
                    id="total_amount"
                    name="total_amount"
                    onWheel={handleWheel}
                    value={formData.total_amount || ''}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter total amount"
                  />
                </div>

                <div className="flex flex-col">
                  <Label htmlFor="advance_received" className="text-sm font-medium text-white mb-2">Advance Received</Label>
                  <Input
                    type="number"
                    id="advance_received"
                    name="advance_received"
                    onWheel={handleWheel}
                    value={formData.advance_received || ''}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter advance received"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <Label htmlFor="advance_method" className="text-sm font-medium text-white mb-2">Advance Method</Label>
                  <Select value={formData.advance_method} onValueChange={v => handleChange({ target: { name: 'advance_method', value: v } })}>
                    <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="cash" className="text-white">Cash</SelectItem>
                      <SelectItem value="card" className="text-white">Card</SelectItem>
                      <SelectItem value="online" className="text-white">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="remaining_received" className="text-sm font-medium text-white mb-2">Remaining Received</Label>
                  <Input
                    type="number"
                    id="remaining_received"
                    name="remaining_received"
                    onWheel={handleWheel}
                    value={formData.remaining_received || ''}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter remaining received"
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="remaining_received_method" className="text-sm font-medium text-white mb-2">Remaining Received Method</Label>
                  <Select value={formData.remaining_received_method} onValueChange={v => handleChange({ target: { name: 'remaining_received_method', value: v } })}>
                    <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="cash" className="text-white">Cash</SelectItem>
                      <SelectItem value="card" className="text-white">Card</SelectItem>
                      <SelectItem value="online" className="text-white">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.remaining_received_date && (
                <div className="mt-4 flex flex-col">
                  <Label htmlFor="remaining_received_date" className="text-sm font-medium text-white mb-2">Remaining Received Date</Label>
                  <Input
                    type="date"
                    id="remaining_received_date"
                    name="remaining_received_date"
                    value={formData.remaining_received_date}
                    readOnly
                    className="bg-slate-700 border-slate-600 text-white opacity-80"
                  />
                  <p className="text-xs text-slate-400 mt-1">Auto-set when remaining payment captured.</p>
                </div>
              )}

              <h3 className="text-xl font-semibold mb-2 text-white">
                Order Items
              </h3>
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-700 p-4 rounded-md shadow mb-4"
                >
                  <h4 className="text-lg font-semibold mb-4 text-white">
                    Item {index + 1}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Left: inputs */}
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <Label htmlFor={`item-${index}`} className="text-sm font-medium text-white mb-2">Item Description</Label>
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
                        <Label htmlFor={`image-${index}`} className="text-sm font-medium text-white mb-2">Upload / Change Image</Label>
                        <Input
                          type="file"
                          id={`image-${index}`}
                          name="image"
                          accept="image/*"
                          onChange={(e) => handleImageChange(index, e)}
                          className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                        />
                        <p className="text-[11px] mt-2 text-slate-400">PNG/JPG up to 2MB.</p>
                      </div>
                    </div>
                    {/* Right: preview */}
                    <div className="flex justify-center md:justify-end">
                      <div className="relative group">
                        {item.preview ? (
                          <>
                            <img src={item.preview} alt={`Preview ${index+1}`} className="h-40 w-40 md:h-48 md:w-48 object-cover rounded-lg border border-slate-600/70 shadow-md ring-1 ring-slate-600/40 group-hover:ring-purple-500/60 transition-all" />
                            <button type="button" onClick={()=>clearImage(index)} className="absolute -top-2 -right-2 bg-slate-900/80 hover:bg-red-600 text-white rounded-full p-1" aria-label="Remove image">
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : item.clearImage ? (
                          <div className="h-40 w-40 md:h-48 md:w-48 flex flex-col items-center justify-center text-xs text-red-400 bg-slate-800/60 rounded-lg border border-dashed border-red-600">
                            <span>Image will be removed</span>
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((it,i)=> i===index ? { ...it, clearImage: false } : it)
                              }))}
                              className="mt-2 text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                            >
                              Undo
                            </button>
                          </div>
                        ) : item.currentImage ? (
                          <>
                            <img src={item.currentImage} alt="Current" className="h-40 w-40 md:h-48 md:w-48 object-cover rounded-lg border border-slate-600/60" />
                            <button type="button" onClick={()=>clearImage(index)} className="absolute -top-2 -right-2 bg-slate-900/80 hover:bg-red-600 text-white rounded-full p-1" aria-label="Remove image">
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <div className="h-40 w-40 md:h-48 md:w-48 flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-800/60 rounded-lg border border-dashed border-slate-600">
                            <span>No Image</span>
                            <span className="mt-1 text-[10px] text-slate-500">(Preview)</span>
                          </div>
                        )}
                      </div>
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

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full bg-red-600 hover:bg-red-700">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Delete Order</DialogTitle>
                    <DialogDescription className="text-slate-300">
                      Are you sure you want to delete this order for customer "{formData?.customer_name}"? 
                      This action cannot be undone and will permanently remove all order items and images.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setDeleteDialogOpen(false)}
                      disabled={deleting}
                      className="border-slate-600 text-black hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteOrder}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? 'Deleting...' : 'Delete Order'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? 'Updating...' : 'Update Order'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
export default EditOrderForm;