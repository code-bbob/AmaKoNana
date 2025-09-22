"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../components/allsidebar";
import useAxios from "../utils/useAxios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus } from "lucide-react";
import { Container } from "lucide-react";
import { Label } from "@/components/ui/label";
import { List, Search, ArrowLeft, Trash2, PlusCircle } from "lucide-react";

export default function ProductIncentivesPage() {
  const api = useAxios();
  const navigate = useNavigate();
  const { branchId } = useParams();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incentives, setIncentives] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: "", rate: "" });

  // Fetch incentives for this branch
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get(`allinventory/incentiveproduct/branch/${branchId}/`);
        setIncentives(res.data?.results ?? res.data ?? []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load incentives");
        setLoading(false);
      }
    }
    fetchData();
  }, [branchId]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = Array.isArray(incentives) ? incentives : [];
    return term ? list.filter((x) => x.name?.toLowerCase().includes(term)) : list;
  }, [searchTerm, incentives]);

  // Sort by name asc for stable display
  filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetForm = () => setForm({ name: "", rate: "" });

  const handleAdd = async (e) => {
    e?.preventDefault?.();
    if (!form.name?.trim()) return;
    const rateNum = parseFloat(form.rate);
    if (Number.isNaN(rateNum)) return;

    try {
      setIsSaving(true);
      const payload = { name: form.name.trim(), rate: rateNum, branch: Number(branchId) };
      const r = await api.post("allinventory/incentiveproduct/", payload);
      // Some endpoints paginate; append defensively
      const newItem = r.data;
      setIncentives((prev) => (Array.isArray(prev) ? [newItem, ...prev] : [newItem]));
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleteDialogOpen(false);
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`allinventory/incentiveproduct/${id}/`)));
      setIncentives((prev) => prev.filter((x) => !selectedIds.includes(x.id)));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">Loading...</div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">{error}</div>
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
                Product Incentives
              </h1>
            </div>
            <div className="md:hidden">
              <List className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search incentives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 w-full sm:w-auto">
              <Button
                onClick={() => navigate(`/staff/branch/${branchId}`)}
                variant="outline"
                className="w-full sm:w-auto px-5 text-black border-white hover:bg-gray-700 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-3" />
                Back to Staff
              </Button>
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                className="w-full sm:w-auto px-5"
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full sm:w-auto px-5 bg-purple-600 hover:bg-purple-700"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Incentive
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg">
          <CardContent className="p-0 overflow-x-auto">
            <div className="grid grid-cols-12 gap-2 p-2 sm:p-4 text-xs sm:text-sm font-medium text-slate-300 border-b border-slate-700">
              <div className="col-span-1"></div>
              <div className="col-span-7 lg:col-span-7">Name</div>
              <div className="col-span-4 lg:col-span-4 text-right">Rate</div>
            </div>

            {filtered.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "grid grid-cols-12 gap-2 p-2 sm:p-4 items-center hover:bg-slate-800 transition-colors duration-200",
                  selectedIds.includes(item.id) && "bg-slate-700"
                )}
              >
                <div className="col-span-1 flex items-center justify-center">
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    className="border-gray-400"
                  />
                </div>
                <div className="col-span-7 lg:col-span-7 flex items-center">

                  <Container className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-purple-400 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="text-white text-xs sm:text-sm lg:text-base truncate">{item.name}</span>
                </div>
                <div className="col-span-4 lg:col-span-4 text-right">
                  <span className="text-white text-xs sm:text-sm lg:text-base">
                    RS. {typeof item.rate === "number" ? item.rate.toFixed(2) : item.rate}
                  </span>
                </div>
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <div className="p-6 text-center text-slate-400">No incentives found.</div>
            )}
          </CardContent>
        </Card>
      </div>
      <Button
          className="fixed bottom-8 right-8 rounded-full w-14 h-14 lg:w-16 lg:h-16 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-6 h-6 lg:w-8 lg:h-8" />
        </Button>



      {/* Delete dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Delete selected incentives?</DialogTitle>
            <DialogDescription className="text-slate-300">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={handleDeleteSelected}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(o) => { setIsAddDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>New Product Incentive</DialogTitle>
            <DialogDescription className="text-slate-300">
              Add a name and a rate for this branch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 bg-slate-700 text-white border-slate-600"
                  placeholder="e.g., Delivery Bonus"
                  required
                />
              </div>
              <div>
                <Label htmlFor="rate">Rate</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                  className="mt-1 bg-slate-700 text-white border-slate-600"
                  placeholder="e.g., 25"
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isSaving} className="w-full bg-purple-600 hover:bg-purple-700">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
