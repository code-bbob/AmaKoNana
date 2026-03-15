import React, { useState, useEffect } from "react";
import useAxios from "@/utils/useAxios";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Sidebar from "@/components/allsidebar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EditNCMTransactionForm() {
  const api = useAxios();
  const { branchId, ncmTransactionId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: "",
    amount: "",
    desc: "",
    branch: branchId,
  });
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await api.get(
          `alltransaction/ncmtransaction/${ncmTransactionId}/`
        );
        setOriginalData(resp.data);
        setFormData({
          date: resp.data.date,
          amount: resp.data.amount,
          desc: resp.data.desc || "",
          branch: branchId,
        });
      } catch (err) {
        setError("Failed to load transaction details.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ncmTransactionId, branchId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(
        `alltransaction/ncmtransaction/${ncmTransactionId}/`,
        formData
      );
      navigate(`/ncm-transactions/branch/${branchId}`);
    } catch {
      setError("Update failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(
        `alltransaction/ncmtransaction/${ncmTransactionId}/`
      );
      navigate(`/ncm-transactions/branch/${branchId}`);
    } catch {
      setError("Could not delete transaction.");
    }
  };

  const hasChanged = () => {
    if (!originalData) return false;
    return (
      formData.date !== originalData.date ||
      parseFloat(formData.amount) !== parseFloat(originalData.amount) ||
      formData.desc !== (originalData.desc || "")
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      Loading...
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto">
        <Button
          onClick={() => navigate(`/ncm-transactions/branch/${branchId}`)}
          variant="outline"
          className="mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to NCM Transactions
        </Button>

        <div className="bg-slate-800 p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">
            Edit NCM Transaction
          </h2>
          {error && <p className="text-red-400 mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <Label htmlFor="date" className="text-sm font-medium text-white mb-2">
                  Date
                </Label>
                <Input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="flex flex-col">
                <Label htmlFor="amount" className="text-sm font-medium text-white mb-2">
                  Amount
                </Label>
                <Input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <Label htmlFor="desc" className="text-sm font-medium text-white mb-2">
                Description
              </Label>
              <Input
                id="desc"
                name="desc"
                value={formData.desc}
                onChange={handleChange}
                placeholder="Enter description"
                className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <Button
              type="submit"
              disabled={!hasChanged() || submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Update NCM Transaction
            </Button>
          </form>

          <Dialog>
            <DialogTrigger asChild>
          <Button
            className="w-full bg-red-600 mt-6 hover:bg-red-700 text-white"
            type="button"
          >
            Delete Transaction
          </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Are you sure you want to permanently delete this transaction?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  className="bg-red-600 hover:scale-105 hover:bg-red-700"
                  onClick={handleDelete}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
