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

// Edit Order Form
function EditOrderForm() {
  const { branchId, orderId } = useParams();
  const navigate = useNavigate();
  const api = useAxios();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);

  useEffect(()=>{
    const fetchOrder = async () => {
      try {
    const res = await api.get(`order/${orderId}/`);
    const data = res.data;
        setFormData({
          customer_name: data.customer_name || "",
          customer_phone: data.customer_phone || "",
            branch: data.branch,
            total_amount: data.total_amount || "",
            advance_amount: data.advance_amount || "",
            advance_method: data.advance_method || "cash",
            status: data.status || "pending",
            due_date: data.due_date || "",
      items: (data.items || []).map(it => ({ id: it.id, item: it.item || "" }))
        });
      } catch (err){
        console.error(err);
        setError("Failed to load order");
      } finally { setLoading(false); }
    };
    fetchOrder();
  }, [orderId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSelect = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const handleOrderItemChange = (index, e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, items: prev.items.map((it,i)=> i===index ? { ...it, [name]: value } : it) }));
  };
  const addOrderItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { item: "" }] }));
  const removeOrderItem = (index) => setFormData(prev => ({ ...prev, items: prev.items.filter((_,i)=> i!== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
  await api.patch(`order/${orderId}/`, { ...formData, branch: branchId });
      navigate(`/orders/branch/${branchId}`);
    } catch(err){
      console.error(err);
      setError("Failed to update order");
    } finally { setSubmitting(false); }
  };

  if(loading || !formData){
    return <div className="flex min-h-screen bg-slate-900 text-white items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar />
      <div className="flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Button
            onClick={() => navigate(`/orders/branch/${branchId}`)}
            variant="outline"
            className="mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">Edit Order</h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">Customer Name</Label>
                  <Input name="customer_name" value={formData.customer_name} onChange={handleChange} required className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">Customer Phone</Label>
                  <Input name="customer_phone" value={formData.customer_phone} onChange={handleChange} required className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">Due Date</Label>
                  <Input type="date" name="due_date" value={formData.due_date || ''} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">Status</Label>
                  <Select value={formData.status} onValueChange={v => handleSelect('status', v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="pending" className="text-white">Pending</SelectItem>
                      <SelectItem value="prepared" className="text-white">Prepared</SelectItem>
                      <SelectItem value="dispatched" className="text-white">Dispatched</SelectItem>
                      <SelectItem value="completed" className="text-white">Completed</SelectItem>
                      <SelectItem value="canceled" className="text-white">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">Total Amount</Label>
                  <Input name="total_amount" type="number" value={formData.total_amount || ''} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">Advance Amount</Label>
                  <Input name="advance_amount" type="number" value={formData.advance_amount || ''} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium text-white mb-2">Advance Method</Label>
                  <Select value={formData.advance_method} onValueChange={v => handleSelect('advance_method', v)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="cash" className="text-white">Cash</SelectItem>
                      <SelectItem value="credit_card" className="text-white">Credit Card</SelectItem>
                      <SelectItem value="mobile_payment" className="text-white">Mobile Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Order Items</h3>
              {formData.items.map((oi, idx) => (
                <div key={idx} className="bg-slate-700 p-4 rounded-md shadow mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium text-white mb-2">Item Name</Label>
                      <Input name="item" value={oi.item} onChange={(e)=>handleOrderItemChange(idx,e)} placeholder="Describe item" className="bg-slate-600 border-slate-500 text-white" />
                    </div>
                  </div>
                  {formData.items.length > 1 && (
                    <Button type="button" variant="destructive" size="sm" onClick={()=>removeOrderItem(idx)} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
                      <Trash2 className="w-4 h-4 mr-2" /> Remove Item
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" onClick={addOrderItem} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Another Item
              </Button>
              <Button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 text-white">
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
