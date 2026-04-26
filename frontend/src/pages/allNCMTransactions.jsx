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

export default function AllNCMTransactions() {
  const { branchId } = useParams()
  const api = useAxios()
  const navigate = useNavigate()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [metadata, setMetadata] = useState({
    next: null,
    previous: null,
    count: 0
  })

  async function fetchPaginatedData(url) {
    setLoading(true)
    try {
      const response = await api.get(url)
      setTransactions(response.data.results)
      setMetadata({
        next: response.data.next,
        previous: response.data.previous,
        count: response.data.count
      })
      setCurrentPage(response.data.page)
      setTotalPages(response.data.total_pages)
    } catch (err) {
      setError('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaginatedData(`alltransaction/ncmtransaction/branch/${branchId}/`)
  }, [branchId])

  const handleTransactionClick = (e, id) => {
    e.stopPropagation()
    navigate(`/ncm-transactions/branch/${branchId}/editform/${id}`)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = `alltransaction/ncmtransaction/branch/${branchId}/?search=${localSearchTerm}`
      await fetchPaginatedData(url)
      setCurrentPage(1)
    } catch {
      setError('Failed to search transactions')
      setLoading(false)
    }
  }

  const handleDateSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = `alltransaction/ncmtransaction/branch/${branchId}/?start_date=${startDate}&end_date=${endDate}`
      await fetchPaginatedData(url)
      setCurrentPage(1)
    } catch {
      setError('Failed to filter transactions by date')
      setLoading(false)
    }
  }

  const handleReferenceClick = (e, id) => {
    e.stopPropagation()
    if (id) navigate(`/sales/branch/${branchId}/editform/${id}`)
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
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 lg:mb-0">
            NCM Transactions
          </h1>
          <Button
            onClick={() => navigate('/' + branchId)}
            variant="outline"
            className="w-full lg:w-auto px-5 text-black border-white hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-3" />
            Back to Dashboard
          </Button>
        </motion.div>

        <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
          <form onSubmit={handleSearch} className="w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={localSearchTerm}
                onChange={e => setLocalSearchTerm(e.target.value)}
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
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="endDate" className="text-white whitespace-nowrap">End:</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
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
          {transactions.length > 0 ? (
            transactions.map(tx => (
              <Card
                key={`${tx.id}-${tx.date}`}
                onClick={e => handleTransactionClick(e, tx.id)}
                className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-lg lg:text-xl font-medium text-white flex flex-col lg:flex-row justify-between items-start lg:items-center">
                    <div>
                      <p className="text-sm">{tx.payment_date}</p>
                      {tx.all_sales_transaction && (
                        <p className="text-sm text-blue-500 hover:text-blue-600 hover:underline" onClick={(e)=>{handleReferenceClick(e, tx.all_sales_transaction)}}>
                          Sales Reference: {tx.all_sales_transaction}
                        </p>
                      )}
                    </div>
                    <span className="mt-2 lg:mt-0 text-sm lg:text-lg">
                      {format(new Date(tx.date), 'dd MMM yyyy')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-4 last:mb-0 p-3 lg:p-4 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors duration-300">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2">
                      <span className="text-white">{tx.desc}</span>
                        {tx.branch && (
                          <span className="text-xs text-gray-400 ml-2">
                            Branch: {tx.branch_name || tx.branch}
                          </span>
                        )}
                    </div>
                  </div>
                </CardContent>
                <div className="p-4 text-white text-right">
                    {tx.amount < 0 ? 'Amount Received' : 'Amount Credited'}:
                  RS. {parseFloat(Math.abs(tx.amount)).toLocaleString()}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center text-white">No transactions found.</div>
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
          <span className="text-white self-center">
            Page {currentPage} of {totalPages}
          </span>
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
        onClick={() => navigate(`/ncm-transactions/branch/${branchId}/form/`)}
      >
        <Plus className="w-6 h-6 lg:w-8 lg:h-8" />
      </Button>
    </div>
  )
}
