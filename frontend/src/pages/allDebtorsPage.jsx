import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Trash2, Plus, User } from "lucide-react";
import useAxios from "../utils/useAxios";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Sidebar from "../components/allsidebar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AllDebtorsPage() {
  const api = useAxios();
  const { branchId } = useParams();
  const navigate = useNavigate();

  const [debtors, setDebtors] = useState([]);
  const [filteredDebtors, setFilteredDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [selectedDebtors, setSelectedDebtors] = useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showNewDebtorDialog, setShowNewDebtorDialog] = useState(false);
  const [newDebtorData, setNewDebtorData] = useState({
    name: "",
    phone_number: "",
    due: 0,
    branch: branchId,
  });

  // Fetch debtors on mount / branch change
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(
          `alltransaction/debtors/branch/${branchId}/`
        );
        setDebtors(response.data);
        setFilteredDebtors(response.data);
      } catch (err) {
        console.error("Error fetching debtors:", err);
        setError("Failed to load debtors");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ branchId]);

  // Filter on searchTerm change
  useEffect(() => {
    setFilteredDebtors(
      debtors.filter((d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, debtors]);

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const handleDebtorClick = (debtor, e) => {
    if (!e.target.closest(".checkbox-wrapper")) {
      setSelectedDebtor(debtor);
    }
  };

  const handleCheckboxChange = (debtorId) => {
    setSelectedDebtors((prev) =>
      prev.includes(debtorId)
        ? prev.filter((id) => id !== debtorId)
        : [...prev, debtorId]
    );
  };

  const handleDeleteSelected = async () => {
    setIsDeleteDialogOpen(false);
    try {
      await Promise.all(
        selectedDebtors.map((id) => api.delete(`alltransaction/debtors/${id}/`))
      );
      setDebtors((prev) =>
        prev.filter((d) => !selectedDebtors.includes(d.id))
      );
      setFilteredDebtors((prev) =>
        prev.filter((d) => !selectedDebtors.includes(d.id))
      );
      setSelectedDebtors([]);
    } catch (err) {
      console.error("Error deleting debtors:", err);
    }
  };

  const handleNewDebtorChange = (e) => {
    const { name, value } = e.target;
    setNewDebtorData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddDebtor = async (e) => {
    e.preventDefault();
    try {
      const resp = await api.post("alltransaction/debtors/", newDebtorData);
      setDebtors((prev) => [...prev, resp.data]);
      setFilteredDebtors((prev) => [...prev, resp.data]);
      setNewDebtorData({ name: "", phone_number: "", due: 0, branch: branchId });
      setShowNewDebtorDialog(false);
    } catch (err) {
      console.error("Error adding debtor:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white text-lg">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500 text-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex lg:flex-row flex-col">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-10 lg:ml-64">
        {/* Header + Search + Actions */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 space-y-4 flex flex-col"
        >
          <h1 className="text-center text-white font-bold text-xl sm:text-2xl lg:text-4xl">
            Debtors List
          </h1>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 text-gray-400 -translate-y-1/2" />
              <Input
                placeholder="Search debtors..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 w-full bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="px-5 text-black border-white hover:bg-gray-700 hover:text-white w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-3" /> Back to Dashboard
              </Button>
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                disabled={!selectedDebtors.length}
                className="px-5 w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Debtors Table */}
        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg">
          <CardContent className="overflow-x-auto p-0">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-700 p-2 sm:p-4 text-slate-300 text-xs sm:text-sm font-medium">
              <div className="col-span-1" />
              <div className="col-span-4 lg:col-span-4">Name</div>
              <div className="col-span-3 lg:col-span-3">Phone Number</div>
              <div className="col-span-4 lg:col-span-4 text-right">
                Due Amount
              </div>
            </div>
            {filteredDebtors.map((debtor) => (
              <motion.div
                key={debtor.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`grid grid-cols-12 gap-2 p-2 sm:p-4 items-center cursor-pointer hover:bg-slate-800 transition-colors ${
                  selectedDebtors.includes(debtor.id) ? "bg-slate-700" : ""
                }`}
              onClick={() => navigate(`/debtors/branch/${branchId}/statement/${debtor.id}`)}
              >
                <div className="checkbox-wrapper col-span-1 flex justify-center">
                  <Checkbox
                    checked={selectedDebtors.includes(debtor.id)}
                    onCheckedChange={() => handleCheckboxChange(debtor.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="border-gray-400"
                  />
                </div>
                <div className="col-span-4 lg:col-span-4 flex items-center">
                  <User className="mr-2 flex-shrink-0 text-purple-400 h-4 w-4" />
                  <span className="truncate text-white text-sm lg:text-base">
                    {debtor.name}
                  </span>
                </div>
                <div className="col-span-3 lg:col-span-3 text-white text-sm lg:text-base">
                  {debtor.phone_number}
                </div>
                <div className="col-span-4 lg:col-span-4 text-right text-white text-sm lg:text-base">
                  {`RS. ${parseFloat(debtor.due).toLocaleString()}`}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {filteredDebtors.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-8 text-center text-white text-sm sm:text-base"
          >
            No debtors found matching your search.
          </motion.div>
        )}

        {/* Debtor Details Dialog */}
        <Dialog
          open={!!selectedDebtor}
          onOpenChange={() => setSelectedDebtor(null)}
        >
          <DialogContent className="mx-auto max-w-md w-full">
            <DialogHeader>
              <DialogTitle className="flex justify-between text-lg sm:text-xl mt-2">
                Debtor Details
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Details for {selectedDebtor?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm sm:text-base">
              <div>
                <p className="font-semibold">Name:</p>
                <p>{selectedDebtor?.name}</p>
              </div>
              <div>
                <p className="font-semibold">Phone Number:</p>
                <p>{selectedDebtor?.phone_number}</p>
              </div>
              <div>
                <p className="font-semibold">Due Amount:</p>
                <p>
                  {selectedDebtor?.due
                    ? `RS. ${parseFloat(selectedDebtor.due).toLocaleString()}`
                    : "RS. 0"}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <DialogContent className="mx-auto max-w-md w-full">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Confirm Deletion
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Are you sure you want to delete the selected debtors? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="w-full sm:w-auto text-black"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteSelected}
                className="w-full sm:w-auto hover:bg-red-700 bg-red-500"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add New Debtor Button */}
        <Button
          onClick={() => setShowNewDebtorDialog(true)}
          className="fixed bottom-8 right-8 w-14 h-14 lg:w-16 lg:h-16 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-6 w-6 lg:h-8 lg:w-8" />
        </Button>

        {/* Add New Debtor Dialog */}
        <Dialog
          open={showNewDebtorDialog}
          onOpenChange={setShowNewDebtorDialog}
        >
          <DialogContent className="bg-slate-800 text-white sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Debtor</DialogTitle>
              <DialogDescription className="text-slate-300">
                Enter the details of the new debtor you want to add.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDebtor} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newDebtorName" className="text-right">
                  Name
                </Label>
                <Input
                  id="newDebtorName"
                  name="name"
                  value={newDebtorData.name}
                  onChange={handleNewDebtorChange}
                  placeholder="Enter debtor name"
                  className="col-span-3 bg-slate-700 border-slate-600"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newDebtorPhone" className="text-right">
                  Phone Number
                </Label>
                <Input
                  id="newDebtorPhone"
                  name="phone_number"
                  value={newDebtorData.phone_number}
                  onChange={handleNewDebtorChange}
                  placeholder="Enter phone number"
                  className="col-span-3 bg-slate-700 border-slate-600"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newDebtorDue" className="text-right">
                  Due Amount
                </Label>
                <Input
                  id="newDebtorDue"
                  name="due"
                  type="number"
                  value={newDebtorData.due}
                  onChange={handleNewDebtorChange}
                  placeholder="Enter due amount"
                  className="col-span-3 bg-slate-700 border-slate-600"
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  Add Debtor
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
