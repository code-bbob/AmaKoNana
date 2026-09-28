'use client';

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, ChevronLeft, ChevronRight, Search, Plus, ArrowLeft } from 'lucide-react'
import useAxios from '@/utils/useAxios'
import { format } from 'date-fns'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '@/components/allsidebar'

export default function AllWithdrawalsPage() {
  const api = useAxios()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [filters, setFilters] = useState({})

  const navigate = useNavigate()
  const { branchId } = useParams()

  const fetchPage = async (page = 1, activeFilters = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ ...activeFilters, page: String(page) })
      const response = await api.get(`alltransaction/withdrawals/branch/${branchId}/?${params}`)
      setRows(response.data.results)
      setCurrentPage(response.data.page)
      setTotalPages(response.data.total_pages)
      setError(null)
    } catch (err) {
      setError('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPage(1) }, [])

  // Both the search box and the date range feed the same filter set, so either
  // submit re-runs the query from page 1 and paging keeps them applied.
  const applyFilters = () => {
    const next = {
      ...(localSearchTerm ? { search: localSearchTerm } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    }
    setFilters(next)
    fetchPage(1, next)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    applyFilters()
  }

  const handleDateSearch = (e) => {
    e.preventDefault()
    applyFilters()
  }

  if (loading) {
    return (<div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">Loading...</div>)
  }

  if (error) {
    return (<div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">{error}</div>)
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-grow p-4 px-8 lg:p-6 lg:ml-64">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6"
        >
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 lg:mb-0">Withdrawals</h1>
          <Button onClick={() => navigate('/')} variant="outline" className="w-full lg:w-auto px-5 text-black border-white hover:bg-gray-700 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-3" />
            Back to Dashboard
          </Button>
        </motion.div>

        <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
          <form onSubmit={handleSearch} className="w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input type="text" placeholder="Search by amount or description..." value={localSearchTerm} onChange={(e) => setLocalSearchTerm(e.target.value)} className="pl-10 w-full lg:w-64 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
            </div>
          </form>

          <form onSubmit={handleDateSearch} className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="startDate" className="text-white whitespace-nowrap">Start:</Label>
              <Input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="endDate" className="text-white whitespace-nowrap">End:</Label>
              <Input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
            </div>
            <Button type="submit" className="w-full lg:w-auto bg-purple-600 hover:bg-purple-700 text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Search by Date
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          {rows.length > 0 ? (
            rows.map((wd) => (
              <Card key={`${wd.id}-${wd.date}`} onClick={() => navigate(`/withdrawals/branch/${branchId}/edit/${wd.id}`)} className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-lg lg:text-xl font-medium text-white flex flex-col lg:flex-row justify-between items-start lg:items-center">
                    <div>
                      <p className='text-sm text-gray-400'>Withdrawal</p>
                    </div>
                    <span className="mt-2 lg:mt-0 text-sm lg:text-base">{format(new Date(wd.date), 'dd MMM yyyy')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-2 p-3 lg:p-4 bg-slate-800 rounded-lg">
                    {wd.description && <div className="text-white font-medium mb-2">{wd.description}</div>}
                    <div className="flex justify-between items-center text-sm text-slate-300">
                      <span className='font-bold text-green-400 text-l'>Amount: RS. {wd.amount?.toLocaleString()}</span>
                      <span className="text-white">Posted by {wd?.employee_name || '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-white">No withdrawals found.</div>
          )}
        </div>

        <div className="flex justify-center mt-6 space-x-4">
          <Button onClick={() => fetchPage(currentPage - 1, filters)} disabled={currentPage <= 1 || loading} className="bg-slate-700 hover:bg-slate-600 text-white">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <span className="text-white self-center">Page {currentPage} of {totalPages}</span>
          <Button onClick={() => fetchPage(currentPage + 1, filters)} disabled={currentPage >= totalPages || loading} className="bg-slate-700 hover:bg-slate-600 text-white">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
      <Button className="fixed bottom-8 right-8 rounded-full w-14 h-14 lg:w-16 lg:h-16 shadow-lg bg-purple-600 hover:bg-purple-700 text-white" onClick={() => navigate(`/withdrawals/form/branch/${branchId}`)}>
        <Plus className="w-6 h-6 lg:w-8 lg:h-8" />
      </Button>
    </div>
  )
}
