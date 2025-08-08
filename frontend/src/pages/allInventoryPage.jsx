'use client';

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, Trash2, List, Smartphone } from 'lucide-react'
import useAxios from '../utils/useAxios'
import Sidebar from '../components/allsidebar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import AddAllBrandDialog  from '../components/addAllBrand'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AllInventoryPageComponent() {
  const api = useAxios()
  const navigate = useNavigate()
  const { branchId } = useParams()
  const [brands, setBrands] = useState([])
  const [filteredBrands, setFilteredBrands] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [branch, setBranch] = useState([])

  // State for handling the reusable branch dialog
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false)

  const handleMerge = async (id) => {
    try {
      await api.post(`allinventory/brand/branch/${branchId}/merge/${id}/`)
      setIsBranchDialogOpen(false)
      window.location.reload()
      // navigate('/')
    } catch (error) {
      console.error("Error merging branch:", error)
    }
  }

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await api.get(`allinventory/brand/branch/${branchId}/`)
        setBrands(response.data)
        setFilteredBrands(response.data)
        const branchResponse = await api.get(`enterprise/branch/`)
        setBranch(branchResponse.data)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching brands:', err)
        setError('Failed to load brands')
        setLoading(false)
      }
    }

    fetchBrands()
  }, [branchId])

  useEffect(() => {
    const results = brands.filter(brand =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredBrands(results)
  }, [searchTerm, brands])

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
  }

  const handleBrandAdded = (newBrand) => {
    setBrands(prevBrands => [...prevBrands, newBrand])
    setFilteredBrands(prevBrands => [...prevBrands, newBrand])
  }

  const handleBrandDelete = async (brandId) => {
    try {
      await api.delete(`allinventory/brand/${brandId}/`)
      const updatedBrands = brands.filter((b) => b.id !== brandId)
      setBrands(updatedBrands)
      setFilteredBrands(updatedBrands)
    } catch (error) {
      console.error("Error deleting brand:", error)
    }
  }

  const handleBranchClick = (branch) => {
    setSelectedBranch(branch)
    setIsBranchDialogOpen(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      Loading...
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">
      {error}
    </div>
  )

  // Sort brands alphabetically
  filteredBrands.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar />
      <div className="flex-1 lg:ml-64 overflow-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 mb-8"
          >
            <div className='flex justify-between w-full'>
            <div>

            <h1 className="text-3xl md:text-4xl font-bold text-white text-center md:text-left">
              Inventory Categories
            </h1>
            </div>
            <div className='md:hidden gap-5'>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <List className="h-6 w-6 text-white cursor-pointer" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Import From Branch</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {branch?.map((b) => (
                        <DropdownMenuItem
                          key={b.id}
                          onClick={() => handleBranchClick(b)}
                        >
                          {b.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            </div>
            
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full md:w-auto text-black border-white hover:bg-gray-700 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-3" />
              Back to Dashboard
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6"
          >
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search brands..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 w-full bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className='hidden md:block'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <List className="h-6 w-6 text-white cursor-pointer" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Import From Branch</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {branch?.map((b) => (
                        <DropdownMenuItem
                          key={b.id}
                          onClick={() => handleBranchClick(b)}
                        >
                          {b.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onClick={() => navigate(`brand/${brand.id}`)}
                onDelete={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleBrandDelete(brand.id)
                }}
              />
            ))}
          </div>

          {filteredBrands.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center text-white mt-8"
            >
              No categories found matching your search.
            </motion.div>
          )}
        </div>
        <AddAllBrandDialog onBrandAdded={handleBrandAdded} branchId={branchId}/>
      </div>

      {/* Reusable Branch Dialog */}
      <BranchDialog
        branch={selectedBranch}
        isOpen={isBranchDialogOpen}
        onClose={() => setIsBranchDialogOpen(false)}
        onMerge={handleMerge}
      />
    </div>
  )
}

function BrandCard({ brand, onClick, onDelete }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onClick(e)
      }}
      className="cursor-pointer"
    >
      <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg hover:shadow-xl transition-shadow duration-300 group relative overflow-hidden">
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        <div className="absolute inset-0 bg-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <CardTitle className="text-lg sm:text-xl font-medium text-slate-300 group-hover:text-white transition-colors duration-300">
            {brand.name}
          </CardTitle>
          <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-xs sm:text-sm text-slate-400 group-hover:text-purple-200 transition-colors duration-300">
            Items in stock: {brand.count}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs sm:text-sm text-blue-400 group-hover:text-purple-200 transition-colors duration-300">
              RS. {brand.stock?.toFixed(2)}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Trash2
                  size={16}
                  className="text-red-500 hover:text-red-700"
                  onClick={(e) => e.stopPropagation()}
                />
              </DialogTrigger>
              <DialogContent className="bg-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    This action cannot be undone. This will permanently delete your brand and remove your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <Button
                  type="button"
                  className="w-full bg-red-600 mt-6 hover:bg-red-700 text-white"
                  onClick={onDelete}
                >
                  Delete Brand
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function BranchDialog({ branch, isOpen, onClose, onMerge }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="my-2">
            {`Are you sure you want to import from ${branch?.name}?`}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            This action is permanent and all your current inventory will be replaced with the selected branch inventory.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onMerge(branch.id)}
            className="w-full bg-red-600 hover:scale-105 hover:bg-red-700 text-white"
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
