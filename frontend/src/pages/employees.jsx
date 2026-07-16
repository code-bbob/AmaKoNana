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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"




export default function EmployeePage() {
  const api = useAxios()
  const { branchId } = useParams()
  const [branchName, setBranchName] = useState('')
  const [employees, setEmployees] = useState([])
  const [filteredEmployees,setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeeDue, setNewEmployeeDue] = useState('')
  const [newEmployeeHourlyRate, setNewEmployeeHourlyRate] = useState('')
  const [newEmployeeArrivalTime, setNewEmployeeArrivalTime] = useState('09:00')
  const [newEmployeeDepartureTime, setNewEmployeeDepartureTime] = useState('18:00')
  const [newEmployeeIsHourlyWage, setNewEmployeeIsHourlyWage] = useState(true)
  const [devices, setDevices] = useState([])
  const [selectedDeviceSerialNumber, setSelectedDeviceSerialNumber] = useState('none')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [role, setRole] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({ id: null, name: '', hourly_rate: '', arrival_time: '', departure_time: '', is_hourly_wage: true })
  const [addEmployeeError, setAddEmployeeError] = useState('')

  useEffect(() => {
    console.log(role)
  }, [role])

  useEffect(() => {
    const fetchBranchEmployees = async () => {
      try {
        const response = await api.get(`enterprise/employee/branch/${branchId}/`)
        setEmployees(response.data)
        setFilteredEmployees(response.data)
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

    fetchBranchEmployees()
  }, [  branchId])

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await api.get('device/api/biometric/devices/')
        const deviceList = response?.data?.devices ?? response?.data ?? []
        setDevices(deviceList.filter((device) => device?.is_active !== false))
      } catch (err) {
        console.error('Error fetching biometric devices:', err)
        setDevices([])
      }
    }

    fetchDevices()
  }, [])

  useEffect(() => {
    // const isAdmin = Array.isArray(role) ? role.includes('Admin') : role === 'Admin'
  
    if (role === 'Admin') {
      const results = employees?.filter(employee =>
        employee?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredEmployees(results)
    }
  }, [searchTerm, employees, role])

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
  }

  const handleAddEmployee = async (e) => {
    e.preventDefault()
    setAddEmployeeError('')
    setIsSubmitting(true)
    try{
      const response = await api.post(`enterprise/employee/branch/${branchId}/`, {
        name: newEmployeeName,
        due: newEmployeeDue,
        hourly_rate: newEmployeeHourlyRate !== '' ? Number(newEmployeeHourlyRate) : 0,
        arrival_time: newEmployeeArrivalTime || null,
        departure_time: newEmployeeDepartureTime || null,
        is_hourly_wage: newEmployeeIsHourlyWage,
      })
      console.log('New Employee Added:', response.data)
      const createdEmployee = response.data

      const shouldSync = selectedDeviceSerialNumber && selectedDeviceSerialNumber !== 'none'
      if (shouldSync) {
        try {
          await api.post('device/api/employees/sync-device/', {
            employee_id: createdEmployee.id,
            device_serial_number: selectedDeviceSerialNumber,
          })
        } catch (syncError) {
          console.error('Employee created, but device sync failed:', syncError)
        }
      }

      setEmployees((prev) => [...prev, createdEmployee])
      setFilteredEmployees((prev) => [...prev, createdEmployee])
      setNewEmployeeName('')
      setNewEmployeeDue('')
      setNewEmployeeHourlyRate('')
      setNewEmployeeArrivalTime('09:00')
      setNewEmployeeDepartureTime('18:00')
      setNewEmployeeIsHourlyWage(true)
      setSelectedDeviceSerialNumber('none')
      setIsDialogOpen(false)
      setIsDialogOpen(false)
    }
    catch (error) {
      console.error('Error adding employee:', error)
      const message = error?.response?.data?.error || error?.response?.data?.detail || 'Failed to add employee.'
      setAddEmployeeError(message)
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
    setEditForm({ id: item.id, name: item.name || '', hourly_rate: item.hourly_rate ?? '', arrival_time: item.arrival_time || '', departure_time: item.departure_time || '', is_hourly_wage: item.is_hourly_wage ?? true })
    setIsEditDialogOpen(true)
  }

  const handleDeleteSelected = async () => {
    setIsDeleteDialogOpen(false)
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`enterprise/employee/branch/${id}/`)))
      const remaining = employees.filter((x) => !selectedIds.includes(x.id))
      setEmployees(remaining)
      setFilteredEmployees((prev)=>prev.filter((x)=>!selectedIds.includes(x.id)))
      setSelectedIds([])
    } catch (err) {
      console.error('Failed to delete employee:', err)
    }
  }

  const handleUpdate = async (e) => {
    e?.preventDefault?.()
    if (!editForm.id) return
    const payload = { name: (editForm.name||'').trim() }
    if (editForm.hourly_rate !== '' && editForm.hourly_rate !== null && editForm.hourly_rate !== undefined) {
      payload.hourly_rate = Number(editForm.hourly_rate)
    }
    if (editForm.arrival_time) {
      payload.arrival_time = editForm.arrival_time
    }
    if (editForm.departure_time) {
      payload.departure_time = editForm.departure_time
    }
    payload.is_hourly_wage = editForm.is_hourly_wage
    try {
      setIsSaving(true)
      const r = await api.patch(`enterprise/employee/branch/${editForm.id}/`, payload)
      const updated = r.data || { id: editForm.id, ...payload }
      setEmployees((prev)=> prev.map((x)=> x.id === editForm.id ? { ...x, ...updated } : x))
      setFilteredEmployees((prev)=> prev.map((x)=> x.id === editForm.id ? { ...x, ...updated } : x))
      setIsEditDialogOpen(false)
    } catch (err) {
      console.error('Failed to update employee:', err)
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

  if (role === 'Employee') return (
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
          <h1 className="text-2xl md:text-4xl font-bold text-white">{branchName} Employees</h1>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search employees..."
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
              <div className="col-span-4 md:col-span-4">Employee</div>
              <div className="col-span-2 md:col-span-2 text-center">Arrival</div>
              <div className="col-span-2 md:col-span-2 text-center">Departure</div>
              <div className="col-span-2 md:col-span-2 text-right">Due Amount</div>
              <div className="col-span-1 md:col-span-1 text-right">Edit</div>
            </div>
            {filteredEmployees?.map((employee) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                onClick={() => navigate(`/employee/branch/${branchId}/statement/${employee.id}`)}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-800 transition-colors duration-200"
              >
                <div className="col-span-1 flex items-center justify-center" onClick={(e)=>e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(employee.id)}
                    onCheckedChange={() => toggleSelect(employee.id)}
                    className="border-gray-400"
                  />
                </div>
                <div className="col-span-4 md:col-span-4 flex items-center">
                  <BookUser className="h-5 w-5 text-purple-400 mr-2 flex-shrink-0" />
                  <span className="text-white truncate">{employee.name}</span>
                </div>
                <div className="col-span-2 md:col-span-2 text-center text-slate-300">
                  {employee.arrival_time || '09:00'}
                </div>
                <div className="col-span-2 md:col-span-2 text-center text-slate-300">
                  {employee.departure_time || '18:00'}
                </div>
                
                <div className="col-span-2 md:col-span-2 text-right text-white flex items-center justify-end gap-3">
                  <span>{employee.due ? `RS. ${Number(employee?.due).toLocaleString()}` : 'N/A'}</span>
                </div>
                <div className="col-span-1 md:col-span-1 flex justify-end" onClick={(e)=>e.stopPropagation()}>
                  <Button size="icon" variant="outline" className="h-7 w-7 bg-slate-700 border-slate-600 text-white hover:bg-slate-600" onClick={(e) => openEdit(employee, e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {filteredEmployees.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center text-white mt-8"
          >
            No employees found matching your search.
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
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter the details of the new Employee you want to add.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newEmployeeName" className="text-right">
                  Employee Name
                </Label>
                <Input
                  id="newEmployeeName"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Enter employee's name"
                />
                <Label htmlFor="newEmployeeDue" className="text-right">
                  Employee's Due
                </Label>
                <Input
                  id="newEmployeeDue"
                  value={newEmployeeDue}
                  onChange={(e) => setNewEmployeeDue(e.target.value)}
                  className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Enter opening due amount"
                  type="number"
                  step="0.01"
                />
                <Label htmlFor="newEmployeeHourlyRate" className="text-right">
                  Hourly Rate
                </Label>
                <Input
                  id="newEmployeeHourlyRate"
                  value={newEmployeeHourlyRate}
                  onChange={(e) => setNewEmployeeHourlyRate(e.target.value)}
                  className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Enter hourly rate"
                  type="number"
                  step="0.01"
                  min="0"
                />
                <Label htmlFor="newEmployeeArrivalTime" className="text-right">
                  Arrival Time
                </Label>
                <Input
                  id="newEmployeeArrivalTime"
                  value={newEmployeeArrivalTime}
                  onChange={(e) => setNewEmployeeArrivalTime(e.target.value)}
                  className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                  type="time"
                />
                <Label htmlFor="newEmployeeDepartureTime" className="text-right">
                  Departure Time
                </Label>
                <Input
                  id="newEmployeeDepartureTime"
                  value={newEmployeeDepartureTime}
                  onChange={(e) => setNewEmployeeDepartureTime(e.target.value)}
                  className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                  type="time"
                />
                <Label htmlFor="newEmployeeIsHourlyWage" className="text-right">
                  Hourly Wage
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Checkbox
                    id="newEmployeeIsHourlyWage"
                    checked={newEmployeeIsHourlyWage}
                    onCheckedChange={setNewEmployeeIsHourlyWage}
                    className="border-gray-600 data-[state=checked]:bg-purple-600"
                  />
                  <span className="text-sm text-slate-400">Generate wage transactions on checkout</span>
                </div>
                <Label htmlFor="deviceSerialNumber" className="text-right">
                  Biometric Device
                </Label>
                <div className="col-span-3">
                  <Select
                    value={selectedDeviceSerialNumber}
                    onValueChange={setSelectedDeviceSerialNumber}
                  >
                    <SelectTrigger className="w-full bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500">
                      <SelectValue placeholder={devices.length ? 'Select a device to sync' : 'No devices available'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Do not sync now</SelectItem>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.serial_number}>
                          {device.name || device.serial_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {addEmployeeError ? (
                <p className="text-sm text-red-400">{addEmployeeError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" disabled={isSubmitting} onClick={handleAddEmployee} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isSubmitting ? 'Saving...' : 'Add Employee'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Delete selected employee?</DialogTitle>
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

        {/* Edit dialog (name + hourly rate) */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription className="text-slate-400">
                Update employee details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editEmployeeName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="editEmployeeName"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Enter employee's name"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editEmployeeHourlyRate" className="text-right">
                    Hourly Rate
                  </Label>
                  <Input
                    id="editEmployeeHourlyRate"
                    value={editForm.hourly_rate ?? ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, hourly_rate: e.target.value }))}
                    className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Enter hourly rate"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editArrivalTime" className="text-right">
                    Arrival Time
                  </Label>
                  <Input
                    id="editArrivalTime"
                    value={editForm.arrival_time ?? ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, arrival_time: e.target.value }))}
                    className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                    type="time"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editDepartureTime" className="text-right">
                    Departure Time
                  </Label>
                  <Input
                    id="editDepartureTime"
                    value={editForm.departure_time ?? ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, departure_time: e.target.value }))}
                    className="col-span-3 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                    type="time"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editIsHourlyWage" className="text-right">
                    Hourly Wage
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Checkbox
                      id="editIsHourlyWage"
                      checked={editForm.is_hourly_wage}
                      onCheckedChange={(checked) => setEditForm((p) => ({ ...p, is_hourly_wage: checked }))}
                      className="border-gray-600 data-[state=checked]:bg-purple-600"
                    />
                    <span className="text-sm text-slate-400">Generate wage transactions on checkout</span>
                  </div>
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
