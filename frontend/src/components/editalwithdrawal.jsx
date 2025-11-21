"use client";

import React, { useEffect, useState } from "react";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Sidebar from "@/components/allsidebar";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function EditAllWithdrawal() {
  const api = useAxios();
  const navigate = useNavigate();
  const { branchId, withdrawalId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [formChanged, setFormChanged] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    branch: branchId,
    amount: "",
  });

  useEffect(() => {
    const fetchWithdrawal = async () => {
      try {
        const res = await api.get(`alltransaction/withdrawals/${withdrawalId}/`);
        setOriginalData(res.data);
        setFormData({
          date: res.data.date || "",
          branch: res.data.branch || branchId,
          amount: res.data.amount?.toString() || "",
        });
      } catch (err) {
        setError("Failed to load withdrawal");
      } finally {
        setLoading(false);
      }
    };
    fetchWithdrawal();
  }, [withdrawalId]);

  useEffect(() => {
    if (!originalData) return;
    const changed = (
      originalData.date !== formData.date ||
      originalData.amount?.toString() !== formData.amount
    );
    setFormChanged(changed);
  }, [formData, originalData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubLoading(true);
      const payload = { ...formData };
      const res = await api.patch(`alltransaction/withdrawals/${withdrawalId}/`, payload);
      navigate(`/withdrawals/branch/${branchId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to update withdrawal");
    } finally {
      setSubLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this withdrawal?")) return;
    try {
      await api.delete(`alltransaction/withdrawals/${withdrawalId}/`);
      navigate(`/withdrawals/branch/${branchId}`);
    } catch (err) {
      setError("Failed to delete withdrawal");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Button onClick={() => navigate(`/withdrawals/branch/${branchId}`)} variant="outline" className="mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Withdrawals
          </Button>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">Edit Withdrawal</h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <Label htmlFor="date" className="text-sm font-medium text-white mb-2">Date</Label>
                  <Input type="date" id="date" name="date" value={formData.date} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="amount" className="text-sm font-medium text-white mb-2">Amount</Label>
                  <Input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500" required />
                </div>
              </div>
              <Button type="submit" disabled={!formChanged || subLoading} className="w-full bg-green-600 hover:bg-green-700 text-white">Update Withdrawal</Button>
            </form>
            <Button onClick={handleDelete} className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white" type="button">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Withdrawal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
