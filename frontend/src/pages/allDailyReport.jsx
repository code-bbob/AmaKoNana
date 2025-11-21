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

// The backend income-expense-report endpoint returns: { transactions: [...], net_cash_in_hand }
// Each transaction object may have: id, bill_no, net_amount, description, method, cash_amount, cheque_amount, transfer_amount, type
// We will enrich each transaction with a synthetic date (today) because backend items currently lack an explicit date field.

const AllIncomeExpenseReport = () => {
	const { branchId } = useParams()
	const [data, setData] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [startDate, setStartDate] = useState("")
	const [endDate, setEndDate] = useState("")
	const api = useAxios()
	const navigate = useNavigate()

	useEffect(() => {
		fetchIncomeExpenseData()
	}, [])

	const decorateTransactions = (txns) => {
		const todayStr = format(new Date(), "yyyy-MM-dd")
		return txns.map(t => ({ ...t, date: t.date || todayStr }))
	}

	const fetchIncomeExpenseData = async (params = {}) => {
		setLoading(true)
		try {
			const queryString = new URLSearchParams(params).toString()
			const response = await api.get(`alltransaction/income-expense-report/branch/${branchId}/?${queryString}`)
			const transactions = decorateTransactions(response.data.transactions || [])
            let cash = response.data.total_cash_amount;
            let card = response.data.total_card_amount;
            let online = response.data.total_online_amount;
			// Summaries
			// let cash = 0, cheque = 0, transfer = 0, net = 0
			// transactions.forEach(t => {
			// 	const amt = t.net_amount || 0
			// 	net += amt
			// 	// if (t.method === 'cash') cash += amt
			// 	// if (t.method === 'cheque') cheque += amt
			// 	// if (t.method === 'transfer') transfer += amt
			// 	// explicit fields
			// 	// cash += t.cash_amount || 0
			// 	// cheque += t.cheque_amount || 0
			// 	// transfer += t.transfer_amount || 0
			// })
			setData({
				transactions,
				net_cash_in_hand: response.data.net_cash_in_hand || cash,
				previous_closing_cash: response.data.previous_closing_cash || 0,
				totals: { cash, card, online, count: transactions.length }
			})
		} catch (err) {
			setError("Failed to fetch income-expense report")
		} finally {
			setLoading(false)
		}
	}

	const handleDateFilter = (e) => {
		e.preventDefault()
		const params = {}
		if (startDate) params.start_date = startDate
		if (endDate) params.end_date = endDate
		fetchIncomeExpenseData(params)
	}

	const handlePrint = () => window.print()

	const handleDownloadCSV = () => {
		if (!data || !data.transactions.length) return
		let csv = "Date,Bill No,Type,Method,Description,Net Amount\n"
		data.transactions.forEach(t => {
			csv += `${t.date},${t.bill_no || ''},${t.type || ''},${t.method || ''},"${(t.description || '').replace(/\n/g,' ')}",${t.net_amount || 0}\n`
		})
		csv += `\nCash Total,,${data.totals.cash}\nCheque Total,,${data.totals.cheque}\nTransfer Total,,${data.totals.transfer}\nNet Total,,${data.totals.net}\nNet Cash In Hand,,${data.net_cash_in_hand}\nCount,,${data.totals.count}\n`
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'Income-Expense_Report.csv'
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
	}

	const handleDownloadPDF = () => {
		if (!data || !data.transactions.length) return
		const doc = new jsPDF()
		doc.text("Income-Expense Report", 14, 10)
		const headers = [["Date","Bill","Type","Method","Description","Net"]]
		const body = data.transactions.map(t => [
			t.date,
			t.bill_no || '',
			t.type || '',
			t.method || '',
			(t.description || '').replace(/\n/g,' '),
			t.net_amount || 0,
		])
		body.push(["","","","","Cash Total", data.totals.cash])
		body.push(["","","","","Cheque Total", data.totals.cheque])
		body.push(["","","","","Transfer Total", data.totals.transfer])
		body.push(["","","","","Net Total", data.totals.net])
		body.push(["","","","","Net Cash In Hand", data.net_cash_in_hand])
		body.push(["","","","","Transactions", data.totals.count])
		doc.autoTable({ head: headers, body, startY: 20 })
		doc.save('Income-Expense_Report.pdf')
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
					<CardTitle className="text-2xl lg:text-3xl font-bold text-white print:text-black">Income-Expense Report</CardTitle>
					<p className="text-sm text-gray-400 print:text-gray-600">{format(new Date(), "MMMM d, yyyy")}</p>
				</CardHeader>
				<CardContent className="pt-6">
					<div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4 print:hidden">
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
					<Table>
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
									<TableCell className="text-white print:text-black">{t.type || 'N/A'}</TableCell>
									<TableCell className="text-white print:text-black">{t.method}</TableCell>
									<TableCell className="text-white print:text-black whitespace-pre-wrap">{t.description}</TableCell>
									{/* <TableCell className="text-right text-white print:text-black">{(t.net_amount || 0).toLocaleString('en-US',{style:'currency',currency:'NPR'})}</TableCell> */}
                                    <TableCell className={parseFloat(t.net_amount)>=0?t.method==='cash'?'text-right text-green-400 font-semibold print:text-black':'text-right text-blue-400 font-semibold print:text-black':'text-right text-red-400 font-semibold print:text-black'}>{(t.net_amount || 0).toLocaleString('en-US',{style:'currency',currency:'NPR'})}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="mt-6 flex justify-end">
						<div className="w-72 bg-slate-800 p-4 rounded-lg print:bg-gray-100">
							<div className="flex justify-between mb-2"><span className="font-semibold text-white print:text-black">Transactions:</span><span className="text-white print:text-black">{data.totals.count}</span></div>
							{/* <div className="flex justify-between mb-2"><span className="font-semibold text-white print:text-black">Net Total:</span><span className="text-white print:text-black">{data.totals.net.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div> */}
							<div className="flex justify-between mb-2"><span className="font-semibold text-white print:text-black">Cash Total:</span><span className="text-white print:text-black">{data.totals.cash.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
							<div className="flex justify-between mb-2"><span className="font-semibold text-white print:text-black">Online Total:</span><span className="text-white print:text-black">{data.totals.online.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
							<div className="flex justify-between mb-2"><span className="font-semibold text-white print:text-black">Card Total:</span><span className="text-white print:text-black">{data.totals.card.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
                            <div className="flex justify-between mb-2 border-t border-slate-600 pt-2"><span className="font-semibold text-white print:text-black">Last Closing Cash:</span><span className="text-white print:text-black">{(data.previous_closing_cash)?.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
							<div className="flex justify-between mb-2 border-t border-slate-600 pt-2"><span className="font-semibold text-white print:text-black">Net Cash In Hand:</span><span className="text-white print:text-black">{data.net_cash_in_hand.toLocaleString('en-US',{style:'currency',currency:'NPR'})}</span></div>
						</div>
					</div>
					<div className="mt-8 text-center text-sm text-gray-400 print:text-gray-600"><p>This report is auto-generated and does not require a signature.</p></div>
				</CardContent>
			</Card>
		</div>
	)
}

export default AllIncomeExpenseReport;
