"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Users } from "lucide-react";
import useAxios from "../utils/useAxios";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Sidebar from "../components/allsidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AllCustomersPage() {
  const api = useAxios();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          page: String(currentPage),
          search: searchTerm,
        });
        const response = await api.get(`alltransaction/customers/?${query.toString()}`);
        const payload = response?.data || {};
        const pageResults = Array.isArray(payload.results)
          ? payload.results
          : Array.isArray(payload.data)
          ? payload.data
          : [];
        const totalCount = Number(payload.count ?? payload?.pagination?.total ?? 0);
        const backendTotalPages = Number(payload.total_pages ?? payload?.pagination?.total_pages ?? 0);
        const computedTotalPages = Math.max(
          1,
          backendTotalPages || Math.ceil(totalCount / 100)
        );
        const backendPage = Number(payload.page ?? payload?.pagination?.page ?? currentPage);

        setCustomers(pageResults);
        setTotalCustomers(totalCount);
        setTotalPages(computedTotalPages);
        if (backendPage !== currentPage) {
          setCurrentPage(backendPage);
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError("Failed to load customers");
        setCustomers([]);
        setTotalCustomers(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [currentPage, searchTerm]);

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex lg:flex-row flex-col">
      <Sidebar />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 lg:ml-64">
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-gray-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-white">Customers</h1>
            </div>
            <p className="text-gray-400">Manage customer loyalty points</p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      Total Customers
                    </p>
                    <p className="text-3xl font-bold text-indigo-400 mt-2">
                      {totalCustomers}
                    </p>
                  </div>
                  <Users className="h-12 w-12 text-indigo-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by name or phone number... (press Enter)"
                value={searchInput}
                onChange={handleSearch}
                onKeyDown={handleSearchKeyDown}
                className="pl-10 py-2 w-full bg-slate-800 border-slate-600 text-white placeholder:text-gray-500"
              />
            </div>
          </motion.div>

          {/* Customers Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Customer List</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <p className="text-gray-400">Loading customers...</p>
                  </div>
                ) : error ? (
                  <div className="flex justify-center py-8">
                    <p className="text-red-400">{error}</p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Users className="h-12 w-12 text-gray-600 mb-2" />
                    <p className="text-gray-400">
                      {searchTerm ? "No customers found matching your search" : "No customers yet"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700 hover:bg-slate-700">
                            <TableHead className="font-semibold text-slate-200">
                              Name
                            </TableHead>
                            <TableHead className="font-semibold text-slate-200">
                              Phone Number
                            </TableHead>
                            <TableHead className="font-semibold text-slate-200 text-right">
                              Loyalty Points
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customers.map((customer, index) => (
                            <motion.tr
                              key={customer.phone_number}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-slate-700 hover:bg-slate-700 transition-colors"
                            >
                              <TableCell className="font-medium text-white">
                                {customer.name}
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {customer.phone_number}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 px-3 py-1 rounded-full font-semibold border border-indigo-400/30">
                                  ⭐ {customer.loyalty_points || 0}
                                </span>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                      <div className="text-sm text-slate-400">
                        Page {currentPage} of {totalPages} • Showing {customers.length} of{" "}
                        {totalCustomers} customers
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
