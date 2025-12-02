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

// Mirrors AllDailyReport styling/flow but focused on orders

const OrderReport = () => {
  const { branchId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const api = useAxios()
  const navigate = useNavigate()

  const methodColor = {
    cash: "text-green-400",
    online: "text-blue-400",
    card: "text-purple-400",
    default: "text-slate-200",
  }

  useEffect(() => {
    fetchOrderReport()
  }, [])

  const fetchOrderReport = async (params = {}) => {
    setLoading(true)
    try {
      const queryString = new URLSearchParams(params).toString()
      const response = await api.get(`order/report/branch/${branchId}/?${queryString}`)
      const transactions = response.data.transactions || []
      const totals = {
        cash: response.data.total_cash_amount || 0,
        card: response.data.total_card_amount || 0,
        online: response.data.total_online_amount || 0,
        count: transactions.length,
        net: (response.data.total_income || 0),
      }
      setData({
        transactions,
        totals,
        total_income: response.data.total_income || 0,
      })
    } catch (err) {
      setError("Failed to fetch order report")
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (e) => {
    e.preventDefault()
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    fetchOrderReport(params)
  }

  const handlePrint = () => window.print()

  const handleDownloadCSV = () => {
    if (!data || !data.transactions.length) return
    let csv = "Date,Bill No,Type,Method,Description,Net Amount\n"
    data.transactions.forEach(t => {
      csv += `${t.date},${t.bill_no || ''},${t.type || 'Order'},${t.method || ''},"${(t.description || '').replace(/\n/g,' ')}",${t.net_amount || 0}\n`
    })
    csv += `\nCash Total,,${data.totals.cash}\nOnline Total,,${data.totals.online}\nCard Total,,${data.totals.card}\nNet Total,,${data.totals.net}\nCount,,${data.totals.count}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Order_Report.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDownloadPDF = () => {
    if (!data || !data.transactions.length) return
    const doc = new jsPDF()
    doc.text("Order Report", 14, 10)
    const headers = [["Date","Bill","Type","Method","Description","Net"]]
    const body = data.transactions.map(t => [
      t.date,
      t.bill_no || '',
      t.type || 'Order',
      t.method || '',
      (t.description || '').replace(/\n/g,' '),
      t.net_amount || 0,
    ])
    body.push(["","","","","Cash Total", data.totals.cash])
    body.push(["","","","","Online Total", data.totals.online])
    body.push(["","","","","Card Total", data.totals.card])
    body.push(["","","","","Net Total", data.totals.net])
    body.push(["","","","","Transactions", data.totals.count])
    doc.autoTable({ head: headers, body, startY: 20 })
    doc.save('Order_Report.pdf')
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">Loading...</div>
  if (error) return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">{error}</div>
  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-3 sm:p-4 lg:px-8 print:bg-white print:p-0">
      <Button onClick={() => navigate('/')} variant="outline" className="w-full lg:w-auto px-5 mb-4 text-black border-white print:hidden hover:bg-gray-700 hover:text-white">
        <ArrowLeft className="mr-2 h-4 w-3" /> Back to Dashboard
      </Button>
      <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg print:shadow-none print:bg-white">
        <CardHeader className="border-b border-slate-700 print:border-gray-200 relative">
          <CardTitle className="text-2xl lg:text-3xl font-bold text-white print:text-black">Order Report</CardTitle>
          <p className="text-sm text-gray-400 print:text-gray-600">{format(new Date(), "MMMM d, yyyy")}</p>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6">
          <div className="mb-6 space-y-3 sm:space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4 print:hidden">
            <form onSubmit={handleDateFilter} className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="startDate" className="text-white whitespace-nowrap">Start:</Label>
                <Input type="date" id="startDate" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="endDate" className="text-white whitespace-nowrap">End:</Label>
                <Input type="date" id="endDate" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500" />
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
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] text-white print:text-black">Date</TableHead>
                  <TableHead className="text-white print:text-black">Bill No</TableHead>
                  <TableHead className="text-white print:text-black">Type</TableHead>
                  <TableHead className="text-white print:text-black">Method</TableHead>
                  <TableHead className="text-white print:text-black">Description</TableHead>
                  <TableHead className="text-right text-white print:text-black">Net Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((t,i)=>(
                  <TableRow key={i}>
                    <TableCell className="font-medium text-white print:text-black">{t.date}</TableCell>
                    <TableCell className="text-white print:text-black">{t.bill_no}</TableCell>
                    <TableCell className="text-white print:text-black">{t.type || 'Order'}</TableCell>
                    <TableCell className={`print:text-black ${methodColor[t.method] ?? methodColor.default}`}>{t.method}</TableCell>
                    <TableCell className="text-white print:text-black whitespace-pre-wrap">{t.description}</TableCell>
                    <TableCell className={`text-right font-semibold print:text-black ${methodColor[t.method] ?? methodColor.default}`}>{(t.net_amount || 0).toLocaleString('en-US',{style:'currency',currency:'NPR'})}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:flex lg:justify-end">
            <div className="w-full sm:w-64 bg-slate-800 p-4 rounded-lg print:bg-gray-100">
              <div className="flex justify-between mb-2"><span className="font-semibold text-white print:text-black">Cash Total:</span><span className="text-white print:text-black">{data.totals.cash.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
              <div className="flex justify-between mb-2"><span className="font-semibold text-white print:text-black">Online Total:</span><span className="text-white print:text-black">{data.totals.online.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
              <div className="flex justify-between mb-2"><span className="font-semibold text-white print:text-black">Card Total:</span><span className="text-white print:text-black">{data.totals.card.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
              <div className="flex justify-between mb-2 border-t border-slate-600 pt-2"><span className="font-semibold text-white print:text-black">Net Total Income:</span><span className="text-white print:text-black">{data.total_income.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-400 print:text-gray-600"><p>This report is auto-generated and does not require a signature.</p></div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderReport;
