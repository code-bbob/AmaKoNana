"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, ChevronLeft, ChevronRight, Search, Plus, ArrowLeft } from 'lucide-react'
import Sidebar from '@/components/allsidebar';
import useAxios from '@/utils/useAxios';
import { format } from 'date-fns'

function OrdersPage(){
  const { branchId } = useParams();
  const api = useAxios();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState()
  const [totalPages, setTotalPages] = useState()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [metadata, setMetadata] = useState({
    next: null,
    previous: null,
    count: 0
  })

  // Status Tabs
  const STATUS_TABS = [
    { key: 'pending', label: 'Pending' },
    { key: 'prepared', label: 'Prepared' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'completed', label: 'Completed' },
  ]
  const [activeStatus, setActiveStatus] = useState('pending')

  // Build base URL considering active filters; backend expects query params
  const buildBaseUrl = useCallback((overrides = {}) => {
    const params = new URLSearchParams()
    const statusVal = overrides.status ?? activeStatus
    if (statusVal) params.append('status', statusVal)
    const searchVal = overrides.search ?? localSearchTerm
    if (searchVal) params.append('search', searchVal)
    const sd = overrides.startDate ?? startDate
    const ed = overrides.endDate ?? endDate
    if (sd) params.append('start_date', sd)
    if (ed) params.append('end_date', ed)
    return `order/branch/${branchId}/?${params.toString()}`
  }, [branchId, activeStatus, localSearchTerm, startDate, endDate])

  async function fetchPaginatedData(url) {
    setLoading(true)
    try {
      const response = await api.get(url)
      setOrders(response.data.results)
      setMetadata({
        next: response.data.next,
        previous: response.data.previous,
        count: response.data.count
      })
      setTotalPages(response.data.total_pages) 
      setCurrentPage(response.data.page)
    } catch (err) {
      setError('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }
  const fetchInitData = useCallback(async (statusOverride) => {
    setLoading(true)
    try {
      const url = buildBaseUrl({ status: statusOverride })
      const response = await api.get(url)
      setOrders(response.data.results)
      setMetadata({
        next: response.data.next,
        previous: response.data.previous,
        count: response.data.count
      })
      setTotalPages(response.data.total_pages)
      setCurrentPage(response.data.page)
    } catch (err) {
      setError('Failed to fetch initial data')
    } finally {
      setLoading(false)
    }
  }, [buildBaseUrl])

  useEffect(() => {
    fetchInitData(activeStatus)
  }, [activeStatus, fetchInitData])

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = buildBaseUrl({ search: localSearchTerm, status: activeStatus })
      const response = await api.get(url)
      setOrders(response.data.results)
      setMetadata({
        next: response.data.next,
        previous: response.data.previous,
        count: response.data.count
      })
      setTotalPages(Math.ceil(response.data.count / 10)) 
      setCurrentPage(1)
    } catch (err) {
      setError('Failed to search orders')
    } finally {
      setLoading(false)
    }
  }

  const handleDateSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = buildBaseUrl({ startDate, endDate, status: activeStatus })
      const response = await api.get(url)
      setOrders(response.data.results)
      setMetadata({
        next: response.data.next,
        previous: response.data.previous,
        count: response.data.count
      })
      setTotalPages(Math.ceil(response.data.count / 10)) 
      setCurrentPage(1)
    } catch (err) {
      setError('Failed to filter orders by date')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (statusKey) => {
    if (statusKey === activeStatus) return
    setActiveStatus(statusKey)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">
        {error}
      </div>
    )
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
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 lg:mb-0">Orders</h1>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full lg:w-auto px-5 text-black border-white hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-3" />
            Back to Dashboard
          </Button>
        </motion.div>

        {/* Status Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 bg-slate-800/60 p-2 rounded-2xl shadow-inner border border-slate-700/60">
            {STATUS_TABS.map(tab => {
              const active = tab.key === activeStatus
              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => handleStatusChange(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/60 backdrop-blur-sm border ${active ? 'bg-purple-600 text-white shadow-lg border-purple-500' : 'bg-slate-700/40 hover:bg-slate-600 text-slate-300 border-slate-600/40'}`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
          <form onSubmit={handleSearch} className="w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search orders..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-10 w-full lg:w-64 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </form>

          <form onSubmit={handleDateSearch} className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="startDate" className="text-white whitespace-nowrap">Start:</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="endDate" className="text-white whitespace-nowrap">End:</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <Button type="submit" className="w-full lg:w-auto bg-purple-600 hover:bg-purple-700 text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Search by Date
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          {orders.length > 0 ? (
            orders.map((order) => (
              <Card key={`${order.id}-${order.received_date}`} onClick={() => navigate(`editform/${order.id}`)} className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/60 shadow-lg  cursor-pointer">
                <CardHeader className="border-b border-slate-700/70">
                  <CardTitle className="text-lg lg:text-xl font-medium text-white  justify-between items-start lg:items-center">
                      <div className="flex text-md justify-between">
                      <p>Due : {order.due_date}</p>
                      <p>Branch: {order.branch_name}</p>
                      </div>
                    <div className='flex justify-between'>
                      <p className='text-sm text-gray-400'>Customer Name: {order.customer_name}</p>
                      <p className='text-sm text-gray-400'>Phone: {order.customer_phone}</p>
                    <p className=" lg:mt-0 text-xs lg:text-sm text-gray-300">{format(new Date(order.received_date), 'dd MMM yyyy')}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent >
                  {order?.items?.map((item, index) => (
                    <div key={`${order.id}-${index}`} className="mb-4 last:mb-0 p-3 lg:p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors duration-300">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 gap-2">
                        <span className="text-white font-medium mb-1 lg:mb-0">{item.item}</span>
                      {/* </div> */}
                      {/* <div className="flex flex-wrap gap-3 items-center text-xs lg:text-sm text-slate-300"> */}
                        <span className="text-purple-400 inline-flex items-center gap-1">Status:
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 capitalize">{order.status}</span>
                        </span>
                        {/* {order.due_date && <span className='text-blue-400'>Due: {format(new Date(order.due_date), 'dd MMM yyyy')}</span>} */}
                        {/* <span className='text-yellow-400 capitalize'>Method: {order.advance_method?.replace('_',' ')}</span> */}
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex justify-between text-white text-sm lg:text-base">
                    {order.advance_amount && <span className="font-medium">Received: RS. {order.amount_received?.toLocaleString()}</span>}
                    {order.total_amount && <span className="font-bold text-green-400">Total: RS. {order.total_amount?.toLocaleString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-white">No orders found.</div>
          )}
        </div>

        <div className="flex justify-center mt-6 space-x-4">
          <Button
            onClick={() => fetchPaginatedData(metadata.previous)}
            disabled={!metadata.previous}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <span className="text-white self-center">Page {currentPage} of {totalPages}</span>
          <Button
            onClick={() => fetchPaginatedData(metadata.next)}
            disabled={!metadata.next}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
      <Button
        className="fixed bottom-8 right-8 rounded-full w-14 h-14 lg:w-16 lg:h-16 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
        onClick={() => navigate(`/orders/form/branch/${branchId}`)}
      >
        <Plus className="w-6 h-6 lg:w-8 lg:h-8" />
      </Button>
    </div>
  )
}
export default OrdersPage;