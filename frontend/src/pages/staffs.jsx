'use client';

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, BookUser, Trash2, Pencil } from 'lucide-react'
import useAxios from '../utils/useAxios'
import { useParams } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/allsidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"




export default function StaffPage() {
  const api = useAxios()
  const { branchId } = useParams()
  const [branchName, setBranchName] = useState('')
  const [staffs, setStaffs] = useState([])
  const [filteredStaffs,setFilteredStaffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffDue, setNewStaffDue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [role, setRole] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({ id: null, name: '' })

  useEffect(() => {
    console.log(role)
  }, [role])

  useEffect(() => {
    const fetchBranchStaffs = async () => {
      try {
        const response = await api.get(`enterprise/staffbranch/${branchId}/`)
        setStaffs(response.data)
        setFilteredStaffs(response.data)
        setBranchName(response?.data[0]?.brand_name)
        const roleResponse = await api.get('enterprise/role/')
        setRole(roleResponse.data)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching response:', err)
        setError('Failed to load brand phones')
        setLoading(false)
      }
    }

    fetchBranchStaffs()
  }, [  branchId])

  useEffect(() => {
    // const isAdmin = Array.isArray(role) ? role.includes('Admin') : role === 'Admin'
  
    if (role === 'Admin') {
      const results = staffs?.filter(staff =>
        staff?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredStaffs(results)
    }
  }, [searchTerm, staffs, role])

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    try{
      const response = await api.post(`enterprise/staffbranch/${branchId}/`, { name: newStaffName, due: newStaffDue })
      console.log('New Staff Added:', response.data)
      setIsSubmitting(true)
      setStaffs([...staffs, response.data])
      setFilteredStaffs((prev)=>[...prev, response.data])
      setNewStaffName('')
      setNewStaffDue('')
      setIsDialogOpen(false)
      setIsDialogOpen(false)
    }
    catch (error) {
      console.error('Error adding staff:', error)
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const openEdit = (item, e) => {
    e?.stopPropagation?.()
    setEditForm({ id: item.id, name: item.name || '' })
    setIsEditDialogOpen(true)
  }

  const handleDeleteSelected = async () => {
    setIsDeleteDialogOpen(false)
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`enterprise/staffbranch/${id}/`)))
      const remaining = staffs.filter((x) => !selectedIds.includes(x.id))
      setStaffs(remaining)
      setFilteredStaffs((prev)=>prev.filter((x)=>!selectedIds.includes(x.id)))
      setSelectedIds([])
    } catch (err) {
      console.error('Failed to delete staff:', err)
    }
  }

  const handleUpdate = async (e) => {
    e?.preventDefault?.()
    if (!editForm.id) return
    const payload = { name: (editForm.name||'').trim() }
    try {
      setIsSaving(true)
      const r = await api.patch(`enterprise/staffbranch/${editForm.id}/`, payload)
      const updated = r.data || { id: editForm.id, ...payload }
      setStaffs((prev)=> prev.map((x)=> x.id === editForm.id ? { ...x, ...updated } : x))
      setFilteredStaffs((prev)=> prev.map((x)=> x.id === editForm.id ? { ...x, ...updated } : x))
      setIsEditDialogOpen(false)
    } catch (err) {
      console.error('Failed to update staff:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        Loading...
      </div>
    )
  }

  if (role !== 'Admin') return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">
      You are not authorized to view this page.
    </div>
  )


  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">
        {error}
      </div>
    )
  }
  // filteredPhones.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col md:flex-row">
      <Sidebar className="w-full lg:w-64 md:min-h-screen" />
      <div className="w-full lg:ml-64 p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0"
        >
          <h1 className="text-2xl md:text-4xl font-bold text-white">{branchName} Staffs</h1>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search staffs..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 w-full bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full sm:w-auto px-5 text-slate-900 border-white hover:bg-gray-500 hover:text-slate-900"
            >
              <ArrowLeft className="mr-2 h-4 w-3" />
              Back to Dashboard
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
          </div>
        </motion.div>

        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg">
          <CardContent className="p-0">
            <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-slate-300 border-b border-slate-700">
              <div className="col-span-1"></div>
              <div className="col-span-7 md:col-span-7">Staff</div>
              <div className="col-span-3 md:col-span-3 text-right">Due Amount</div>
              <div className="col-span-1 md:col-span-1 text-right">Edit</div>
            </div>
            {filteredStaffs?.map((staff) => (
              <motion.div
                key={staff.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                onClick={() => navigate(`/staff/branch/${branchId}/statement/${staff.id}`)}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-800 transition-colors duration-200"
              >
                <div className="col-span-1 flex items-center justify-center" onClick={(e)=>e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(staff.id)}
                    onCheckedChange={() => toggleSelect(staff.id)}
                    className="border-gray-400"
                  />
                </div>
                <div className="col-span-7 md:col-span-7 flex items-center">
                  <BookUser className="h-5 w-5 text-purple-400 mr-2 flex-shrink-0" />
                  <span className="text-white truncate">{staff.name}</span>
                </div>
                
                <div className="col-span-3 md:col-span-3 text-right text-white flex items-center justify-end gap-3">
                  <span>{staff.due ? `RS. ${Number(staff?.due).toLocaleString()}` : 'N/A'}</span>
                </div>
                <div className="col-span-1 md:col-span-1 flex justify-end" onClick={(e)=>e.stopPropagation()}>
                  <Button size="icon" variant="outline" className="h-7 w-7 bg-slate-700 border-slate-600 text-white hover:bg-slate-600" onClick={(e) => openEdit(staff, e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {filteredStaffs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-white mt-8"
          >
            No staffs found matching your search.
          </motion.div>
        )}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="fixed bottom-4 right-4 md:bottom-8 md:right-8 rounded-full w-12 h-12 md:w-16 md:h-16 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-6 h-6 md:w-8 md:h-8" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Add New Staff</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter the details of the new Staff you want to add.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newStaffName" className="text-right">
                  Staff Name
                </Label>
                <Input
                  id="newStaffName"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Enter staff's name"
                />
                <Label htmlFor="newStaffName" className="text-right">
                  Staff's Due
                </Label>
                <Input
                  id="newStaffDue"
                  value={newStaffDue}
                  onChange={(e) => setNewStaffDue(e.target.value)}
                  className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Enter staff's name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" disabled={isSubmitting} onClick={handleAddStaff} className="bg-purple-600 hover:bg-purple-700 text-white">
                Add Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Delete selected staff?</DialogTitle>
              <DialogDescription className="text-slate-400">
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-700 text-white">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit dialog (name only) */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Edit Staff</DialogTitle>
              <DialogDescription className="text-slate-400">
                Update the staff name.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editStaffName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="editStaffName"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Enter staff's name"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isSaving ? 'Saving...' : 'Update'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  )
}