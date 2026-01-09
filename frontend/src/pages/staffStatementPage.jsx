"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Printer,
  Download,
  ChevronDown,
  Search,
  Calendar,
  ArrowLeft,
  User,
  Phone,
  CreditCard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useAxios from "@/utils/useAxios";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";

const StaffStatementPage = () => {
  const { staffId, branchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const api = useAxios();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStaffStatement();
  }, [staffId]);

  const fetchStaffStatement = async (params = {}) => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(
        `alltransaction/staff/statement/${staffId}/?${queryString}`
      );
      setData(response.data);
    } catch (err) {
      setError("Failed to fetch staff statement");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const params = { search: searchTerm };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    fetchStaffStatement(params);
  };

  const handleDateSearch = async (e) => {
    e.preventDefault();
    const params = { start_date: startDate, end_date: endDate };
    if (searchTerm) params.search = searchTerm;
    fetchStaffStatement(params);
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateRunningBalance = (transactions) => {
    let running = Number(data.staff_data.previous_due) || 0;
    return transactions.map((transaction) => {
      const amt = Number(transaction.amount) || 0;
      // Positive amounts are payments to staff (reduce payable to staff); negative increase due
      running += amt;
      return { ...transaction, due: running };
    });
  };

  const getTransactionTypeColor = (amount) => {
    return amount > 0 ? "text-green-400" : "text-red-400";
  };

  const formatDescriptionWithDetails = (tx) => {
    if (!tx.staff_transaction_details || tx.staff_transaction_details.length === 0) {
      return tx.desc || "No description";
    }

    const details = tx.staff_transaction_details;
    const detailLines = details.map((detail) => {
      const productName = detail.product_name || "Unknown";
      const rate = detail.rate || 0;
      const quantity = detail.quantity || 0;
      // Handle both direct values and nested objects with source/parsedValue
      const total = detail.total?.parsedValue || detail.total || 0;
      return `${productName}: ${rate} × ${quantity} = Rs. ${total}`;
    });

    const baseDesc = tx.desc ? `${tx.desc}\n` : "";
    return `${baseDesc}Items:\n${detailLines.join("\n")}`;
  };

  const handleDownloadCSV = () => {
    if (!data || !transactionsWithBalance.length) return;

    const escapeField = (val) => `"${String(val).replace(/"/g, '""')}"`;
    let csvContent = [
      "Date",
      "Description",
      "Amount",
      "Due Balance",
    ]
      .map(escapeField)
      .join(",") + "\n";

    transactionsWithBalance.forEach((tx) => {
      const sign = tx.amount > 0 ? "-" : "";
      const amt = `${sign}NPR ${Math.abs(tx.amount).toFixed(2)}`;
      const row = [
        tx.date,
        formatDescriptionWithDetails(tx),
        amt,
        `NPR ${Number(tx.due).toFixed(2)}`,
      ];
      csvContent += row.map(escapeField).join(",") + "\n";
    });

    csvContent += "\n" + escapeField("Staff Information:") + "\n";
    csvContent += [
      ["Name:", data.staff_data.name],
      ["Phone:", data.staff_data.phone_number || "N/A"],
      [
        "Current Due:",
        `NPR ${
          transactionsWithBalance.length
            ? Number(transactionsWithBalance[transactionsWithBalance.length - 1].due).toFixed(2)
            : "0.00"
        }`,
      ],
    ]
      .map((pair) => pair.map(escapeField).join(","))
      .join("\n") + "\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Staff_Statement_${data.staff_data.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (!data || !transactionsWithBalance.length) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFont("times", "italic");
    doc.setFontSize(20);
    doc.setTextColor(33, 33, 33);
    doc.text(`Staff Statement - ${data.staff_data.name}`, 15, 22);

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Statement Date: ${format(new Date(), "MMMM d, yyyy")}`, 15, 28);

    const headers = [["Date", "Description", "Amount", "Due Balance"]];
    const tableData = transactionsWithBalance.map((tx) => [
      tx.date,
      formatDescriptionWithDetails(tx),
      `${tx.amount > 0 ? "" : "-"}NPR ${Math.abs(tx.amount).toLocaleString()}`,
      `NPR ${Number(tx.due).toLocaleString()}`,
    ]);

    doc.autoTable({
      head: headers,
      body: tableData,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const totalCount = data.staff_transactions.length;
    const totalDebit = Math.abs(
      data.staff_transactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );
    const totalPaid = data.staff_transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const currentDue = transactionsWithBalance[transactionsWithBalance.length - 1]?.due || 0;

    const finalY = doc.lastAutoTable.finalY || 35;
    const rightX = pageWidth - margin;
    const lineHeight = 6;

    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text("Summary", rightX, finalY + 12, { align: "right" });

    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    let yPosition = finalY + 18;
    doc.text(`Transactions: ${totalCount}`, rightX, yPosition, { align: "right" });
    yPosition += lineHeight;
    doc.text(`Total Debit: NPR ${totalDebit.toLocaleString()}`, rightX, yPosition, { align: "right" });
    yPosition += lineHeight;
    doc.text(`Total Paid: NPR ${totalPaid.toLocaleString()}`, rightX, yPosition, { align: "right" });
    yPosition += lineHeight;
    doc.text(`Current Due: NPR ${currentDue.toLocaleString()}`, rightX, yPosition, { align: "right" });

    doc.save(`Staff_Statement_${data.staff_data.name}.pdf`);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        Loading staff statement...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">
        {error}
      </div>
    );
  if (!data) return null;

  const previousDue =
    data.staff_data && data.staff_data.previous_due !== undefined
      ? Number(data.staff_data.previous_due)
      : 0;
  const transactionsWithBalance = calculateRunningBalance(
    data.staff_transactions,
    previousDue
  );
  const computedCurrentDue = transactionsWithBalance.length
    ? transactionsWithBalance[transactionsWithBalance.length - 1].due
    : previousDue;

  const handleRowClick = (tx) => {
    // navigate to edit staff transaction page
    navigate(`/staff-transactions/branch/${branchId}/editform/${tx.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 lg:px-8 print:bg-white print:p-0">
      <Button
        onClick={() => navigate(-1)}
        variant="outline"
        className="w-full lg:w-auto px-5 mb-4 text-black border-white print:hidden hover:bg-gray-700 hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-3" />
        Back
      </Button>

      <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg print:shadow-none print:bg-white">
        <CardHeader className="border-b border-slate-700 print:border-gray-200">
          <CardTitle className="text-2xl lg:text-3xl font-bold text-white print:text-black flex items-center gap-3">
            <User className="h-8 w-8" />
            Staff Statement - {data.staff_data.name}
          </CardTitle>
          <p className="text-sm text-gray-400 print:text-gray-600">
            Statement Date: {format(new Date(), "MMMM d, yyyy")}
          </p>
          <Card className="mb-6 mt-4 bg-slate-700 border-slate-600 print:hidden">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400 print:text-gray-600">Staff Name</p>
                    <p className="font-semibold text-lg text-white print:text-black">{data.staff_data.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400 print:text-gray-600">Phone</p>
                    <p className="text-lg text-white print:text-black">{data.staff_data.phone_number || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400 print:text-gray-600">Current Due</p>
                    <p className="text-lg text-green-400 print:text-green-600">NPR {Number(computedCurrentDue).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-4 print:hidden">
            <form onSubmit={handleSearch} className="w-full lg:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full lg:w-64 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </form>

            <form
              onSubmit={handleDateSearch}
              className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4"
            >
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
                Filter by Date
              </Button>
            </form>

            <div className="flex space-x-2">
              <Button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-green-500 hover:bg-green-600 text-white">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleDownloadPDF}>Download as PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadCSV}>Download as CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="rounded-lg border border-slate-600 print:border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-700 print:bg-gray-100">
                  <TableHead className="text-white print:text-black font-semibold">Date</TableHead>
                  <TableHead className="text-white print:text-black font-semibold">Description</TableHead>
                  <TableHead className="text-right text-white print:text-black font-semibold">Amount</TableHead>
                  <TableHead className="text-right text-white print:text-black font-semibold">Due Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsWithBalance.map((tx, index) => (
                  <TableRow
                    key={tx.id}
                    onClick={() => handleRowClick(tx)}
                    className={`${index % 2 === 0 ? "bg-slate-800 print:bg-white" : "bg-slate-750 print:bg-gray-50"} hover:bg-slate-700 print:hover:bg-gray-100`}
                  >
                    <TableCell className="font-medium text-white print:text-black">
                      {format(new Date(tx.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-white print:text-black max-w-xs whitespace-pre-wrap">{formatDescriptionWithDetails(tx)}</TableCell>
                    <TableCell className={`text-right font-semibold ${getTransactionTypeColor(tx.amount)} print:text-black`}>
                      {tx.amount > 0 ? "" : "-"}NPR {Math.abs(tx.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white print:text-black">
                      NPR {Number(tx.due).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-80 bg-slate-800 p-6 rounded-lg print:bg-gray-100 print:border print:border-gray-200">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 print:text-gray-600">Total Transactions:</span>
                  <span className="font-semibold text-white print:text-black">{data.staff_transactions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 print:text-gray-600">Total Credited Amount:</span>
                  <span className="font-semibold text-green-400 print:text-green-600">

                    NPR {data.staff_transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 print:text-gray-600">Total Paid Amount:</span>
                  <span className="font-semibold text-red-400 print:text-red-600">
                    NPR {Math.abs(
                      data.staff_transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <hr className="border-slate-600 print:border-gray-300" />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-semibold text-white print:text-black">Current Due:</span>
                  <span className="text-xl font-bold text-green-400 print:text-green-400">NPR {Number(computedCurrentDue).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-400 print:text-gray-600">
            <p>This statement is auto-generated and reflects all transactions up to the statement date.</p>
            <p className="mt-1">For queries, please contact the accounts department.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffStatementPage;
