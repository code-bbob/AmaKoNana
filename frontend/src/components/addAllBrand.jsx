"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import useAxios from "../utils/useAxios"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AddAllBrandDialog({ onBrandAdded, branchId }) {
  const api = useAxios()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [branch, setBranch] = useState({})
  const [allBranches, setAllBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [loadingBranch, setLoadingBranch] = useState(true)

  const handleAddBrand = async (e) => {
    e.preventDefault()
    try {
      // Convert selectedBranchId back to number if needed

      const response = await api.post("allinventory/brand/", {
        name: newBrandName,
        branch: branchId,
      })
      console.log("New Category Added:", response.data)
      if (onBrandAdded) {
        onBrandAdded(response.data)
      }
      setNewBrandName("")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error adding category:", error)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-8 right-8 rounded-full w-14 h-14 lg:w-16 lg:h-16 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="w-6 h-6 lg:w-8 lg:h-8" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter the name of the new category you want to add.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="newBrandName" className="text-right">
              Category Name
            </Label>
            <Input
              id="newBrandName"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              placeholder="Enter category name"
            />
          </div>
          
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleAddBrand}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Add Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

