"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, Download, ChevronDown, Calendar, ArrowLeft } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import useAxios from "@/utils/useAxios"
import { useNavigate, useParams } from "react-router-dom"
import jsPDF from "jspdf"
import "jspdf-autotable"

// Order Overview Page similar to Income-Expense Overview, showing advance & remaining received

const OrderOverviewPage = () => {
  const { branchId } = useParams()
  const api = useAxios()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const methodColor = {
    cash: "text-green-400",
    online: "text-blue-400",
    card: "text-purple-400",
    default: "text-slate-200"
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async (params = {}) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams(params).toString()
      const resp = await api.get(`order/overview/branch/${branchId}/?${qs}`)
      setData(resp.data)
    } catch (e) {
      setError("Failed to fetch order Overview")
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = (e) => {
    e.preventDefault()
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (searchTerm) params.search = searchTerm
    if (statusFilter) params.status = statusFilter
    fetchOverview(params)
  }

  const handlePrint = () => window.print()

  const handleDownloadCSV = () => {
    if (!data || !data.orders.length) return
    let csv = "Due Date,Bill No,Customer,Phone,Status,Total,Advance,Adv Method,Remaining,Rem Method,Net Received,Outstanding\n"
    data.orders.forEach(o => {
      csv += `${o.due_date || ''},${o.bill_no || ''},"${o.customer_name}",${o.customer_phone || ''},${o.status || ''},${o.total_amount || 0},${o.advance_received || 0},${o.advance_method || ''},${o.remaining_received || 0},${o.remaining_received_method || ''},${o.net_received || 0},${o.outstanding || 0}\n`
    })
    csv += `\nTotal Orders,,${data.totals.count}\nTotal Amount,,${data.totals.total_amount}\nTotal Advance,,${data.totals.total_advance}\nTotal Remaining,,${data.totals.total_remaining}\nNet Received,,${data.totals.net_received}\nTotal Outstanding,,${data.totals.total_outstanding}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Order_Overview.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDownloadPDF = () => {
    if (!data || !data.orders.length) return
    const doc = new jsPDF()
    doc.text("Order Overview", 14, 10)
    const head = [["Due Date","Bill","Customer","Phone","Status","Total","Advance","Remaining","Net","Outstanding"]]
    const body = data.orders.map(o => [
      o.due_date || '',
      o.bill_no || '',
      o.customer_name,
      o.customer_phone || '',
      o.status || '',
      o.total_amount || 0,
      o.advance_received || 0,
      o.remaining_received || 0,
      o.net_received || 0,
      o.outstanding || 0,
    ])
    body.push(["","","","","Total Amount", data.totals.total_amount])
    body.push(["","","","","Total Advance", data.totals.total_advance])
    body.push(["","","","","Total Remaining", data.totals.total_remaining])
    body.push(["","","","","Net Received", data.totals.net_received])
    body.push(["","","","","Outstanding", data.totals.total_outstanding])
    doc.autoTable({ head, body, startY: 20 })
    doc.save('Order_Overview.pdf')
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">Loading...</div>
  if (error) return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">{error}</div>
  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 lg:px-8 print:bg-white print:p-0">
      <Button onClick={() => navigate('/')} variant="outline" className="w-full lg:w-auto px-5 mb-4 text-black border-white print:hidden hover:bg-gray-700 hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-3" /> Back to Dashboard
      </Button>
      <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg print:shadow-none print:bg-white">
        <CardHeader className="border-b border-slate-700 print:border-gray-200">
          <CardTitle className="text-2xl lg:text-3xl font-bold text-white print:text-black">Order Overview</CardTitle>
          <p className="text-sm text-gray-400 print:text-gray-600">{format(new Date(), 'MMMM d, yyyy')}</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4 print:hidden">
            <form onSubmit={handleFilter} className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="startDate" className="text-white whitespace-nowrap">Start:</Label>
                <Input type="date" id="startDate" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="endDate" className="text-white whitespace-nowrap">End:</Label>
                <Input type="date" id="endDate" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="searchTerm" className="text-white whitespace-nowrap">Search:</Label>
                <Input type="text" id="searchTerm" placeholder="Customer / Phone / Item" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="statusFilter" className="text-white whitespace-nowrap">Status:</Label>
                <Input type="text" id="statusFilter" placeholder="pending" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
              </div>
              <Button type="submit" className="w-full lg:w-auto bg-purple-600 hover:bg-purple-700 text-white">
                <Calendar className="w-4 h-4 mr-2" /> Filter
              </Button>
            </form>

            <div className="flex space-x-2">
              <Button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-green-500 hover:bg-green-600 text-white">
                    <Download className="mr-2 h-4 w-4" /> Download <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleDownloadPDF}>Download as PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadCSV}>Download as CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-700 print:border-gray-300">
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white print:text-black">Due Date</TableHead>
                  <TableHead className="text-white print:text-black">Bill No</TableHead>
                  <TableHead className="text-white print:text-black">Customer</TableHead>
                  <TableHead className="text-white print:text-black">Phone</TableHead>
                  <TableHead className="text-white print:text-black">Status</TableHead>
                  <TableHead className="text-right text-white print:text-black">Total</TableHead>
                  <TableHead className="text-right text-white print:text-black">Advance</TableHead>
            <TableHead className="text-right text-white print:text-black">Completion</TableHead>
                  <TableHead className="text-right text-white print:text-black">Net Received</TableHead>
                  <TableHead className="text-right text-white print:text-black">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map((o, idx) => {
                  const advColor = methodColor[o.advance_method] || methodColor.default
                  const remColor = methodColor[o.remaining_received_method] || methodColor.default
                  const outstandingColor = o.outstanding > 0 ? 'text-red-400' : 'text-green-400'
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-white print:text-black">{o.due_date || ''}</TableCell>
                      <TableCell className="text-white print:text-black">{o.bill_no || ''}</TableCell>
                      <TableCell className="text-white print:text-black">{o.customer_name}</TableCell>
                      <TableCell className="text-white print:text-black">{o.customer_phone}</TableCell>
                      <TableCell className="text-white print:text-black">{o.status}</TableCell>
                      <TableCell className="text-right text-white print:text-black">{(o.total_amount || 0).toLocaleString('en-US',{style:'currency',currency:'NPR'})}</TableCell>
                      <TableCell className={`text-right font-semibold print:text-black ${advColor}`}>{(o.advance_received || 0).toLocaleString('en-US',{style:'currency',currency:'NPR'})}</TableCell>
                      <TableCell className={`text-right font-semibold print:text-black ${remColor}`}>{(o.remaining_received || 0).toLocaleString('en-US',{style:'currency',currency:'NPR'})}</TableCell>
                      <TableCell className={`text-right text-white font-semibold print:text-black`}>{(o.net_received || 0).toLocaleString('en-US',{style:'currency',currency:'NPR'})}</TableCell>
                      <TableCell className={`text-right font-semibold print:text-black ${outstandingColor}`}>{(o.outstanding || 0).toLocaleString('en-US',{style:'currency',currency:'NPR'})}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-80 bg-slate-800 p-4 rounded-lg print:bg-gray-100 space-y-2">
              <div className="flex justify-between"><span className="font-semibold text-white print:text-black">Orders:</span><span className="text-white print:text-black">{data.totals.count}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-white print:text-black">Total Amount:</span><span className="text-white print:text-black">{data.totals.total_amount.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-white print:text-black">Advance Total:</span><span className="text-green-400 font-bold print:text-black">{data.totals.total_advance.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-white print:text-black">Completion Total:</span><span className="text-green-600 font-bold print:text-black">{data.totals.total_remaining.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-white print:text-black">Net Received:</span><span className="text-purple-400 font-bold print:text-black">{data.totals.net_received.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-white print:text-black">Outstanding:</span><span className="text-red-400 font-bold print:text-black">{data.totals.total_outstanding.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-400 print:text-gray-600">
            <p>This Overview is auto-generated and does not require a signature.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderOverviewPage
