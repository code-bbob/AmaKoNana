"use client";

import React, { useState } from "react";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Sidebar from "@/components/allsidebar";
import { ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AllExpenseForm() {
  const { branchId } = useParams();
  const api = useAxios();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    branch: branchId,
    amount: "",
    method: "cash",
    cheque_number: "",
    cashout_date: "",
    desc: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleMethodChange = (value) => {
    setFormData({ ...formData, method: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubLoading(true);
      const submissionData = { ...formData };
      // Normalize empty cheque fields when not cheque
      if (submissionData.method !== 'cheque') {
        submissionData.cheque_number = null;
        submissionData.cashout_date = null;
      }
      await api.post("alltransaction/expenses/", submissionData);
      navigate(`/expenses/branch/${branchId}`);
    } catch (err) {
      console.error("Error posting expense:", err);
      setError("Failed to submit expense. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Button onClick={() => navigate("/")} variant="outline" className="mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">Add Expense</h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label htmlFor="date" className="text-sm font-medium text-white mb-2">Date</Label>
                  <Input type="date" id="date" name="date" value={formData.date} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500" required />
                </div>
              <div className="flex flex-col">
                <Label htmlFor="method" className="text-sm font-medium text-white mb-2">Payment Method</Label>
                <Select onValueChange={handleMethodChange} value={formData.method}>
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="cash" className="text-white">Cash</SelectItem>
                    <SelectItem value="card" className="text-white">Card</SelectItem>
                    <SelectItem value="online" className="text-white">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>

                <div className="flex flex-col">
                  <Label htmlFor="amount" className="text-sm font-medium text-white mb-2">Amount</Label>
                  <Input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500" required />
                </div>

              {formData.method === "cheque" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <Label htmlFor="cheque_number" className="text-sm font-medium text-white mb-2">Cheque Number</Label>
                    <Input type="text" id="cheque_number" name="cheque_number" value={formData.cheque_number || ''} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500" required />
                  </div>
                  <div className="flex flex-col">
                    <Label htmlFor="cashout_date" className="text-sm font-medium text-white mb-2">Cheque Date</Label>
                    <Input type="date" id="cashout_date" name="cashout_date" value={formData.cashout_date || ''} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500" required />
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                <Label htmlFor="desc" className="text-sm font-medium text-white mb-2">Description</Label>
                <Input type="text" id="desc" name="desc" value={formData.desc} onChange={handleChange} placeholder="What is this expense for?" className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500" />
              </div>

              <Button type="submit" disabled={subLoading} className="w-full bg-green-600 hover:bg-green-700 text-white">Submit Expense</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
