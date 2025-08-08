"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Building, LogOut } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/accessSlice';
import { useBranchManagement } from '../hooks/useBranchManagement';

export default function InitialBranchSelection() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { 
    branches, 
    loading, 
    error, 
    fetchBranches, 
    selectBranch 
  } = useBranchManagement();
  
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (branches.length > 0) {
      // If only one branch, auto-select it
      if (branches.length === 1) {
        handleBranchSelect(branches[0]);
        return;
      }
      
      const results = branches.filter((branch) => 
        branch.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBranches(results);
    }
  }, [searchTerm, branches]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleBranchSelect = (branch) => {
    const success = selectBranch(branch);
    if (success) {
      // Navigate to dashboard after successful branch selection
      navigate(`/branch/${branch.id}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("selectedBranch");
    dispatch(logout());
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading branches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">
        <div className="text-center">
          <p className="mb-4">{error}</p>
          <Button onClick={() => fetchBranches()} className="bg-blue-600 hover:bg-blue-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header with logout */}
      <div className="p-4 flex justify-between items-center border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Select Your Branch</h1>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="text-black border-slate-600 hover:bg-slate-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="p-4 sm:p-6 lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4"
            >
              Welcome! Please Select Your Branch
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-slate-300 text-lg"
            >
              Choose the branch you'll be working with today
            </motion.p>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="max-w-md mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search branches..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 w-full bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </motion.div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBranches.length > 0 ? (
              filteredBranches.map((branch, index) => (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.03 }}
                  className="cursor-pointer"
                  onClick={() => handleBranchSelect(branch)}
                >
                  <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg overflow-hidden h-full hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center">
                        <Building className="h-8 w-8 text-purple-400 mr-3" />
                        <CardTitle className="text-xl font-bold text-white">
                          {branch.name}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-slate-300 text-sm mb-4">
                        <p>Branch ID: {branch.id}</p>
                        <p>Enterprise: {branch.enterprise_name}</p>
                      </div>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBranchSelect(branch);
                        }}
                      >
                        Select This Branch
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center text-white mt-8">
                <p className="text-xl">No branches found matching your search.</p>
                <p className="text-slate-400 mt-2">Try adjusting your search terms.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
