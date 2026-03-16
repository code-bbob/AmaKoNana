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
  Building2,
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

const AllNCMStatementPage = () => {
  const { branchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const api = useAxios();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStatement();
  }, []);

  const fetchStatement = async (params = {}) => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(params).toString();
      let url = `alltransaction/ncm/statement/`;
      if (branchId) {
        // backend endpoint accepts branch via url path as well
        url += `branch/${branchId}/`;
      }
      if (queryString) url += `?${queryString}`;
      const response = await api.get(url);
      setData(response.data);
    } catch (err) {
      setError("Failed to fetch NCM statement");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const params = { search: searchTerm };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    fetchStatement(params);
  };

  const handleDateSearch = async (e) => {
    e.preventDefault();
    const params = { start_date: startDate, end_date: endDate };
    if (searchTerm) params.search = searchTerm;
    fetchStatement(params);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    if (!data || !transactionsWithBalance.length) {
      console.warn("No data available for CSV export");
      return;
    }

    const escapeField = (val) =>
      `"${String(val).replace(/"/g, '""')}"`;

    const includeBranch = branchId !== undefined && branchId !== null;
    let csvContent = [
      'Date',
      'Description',
      ...(includeBranch ? ['Branch'] : []),
      'Amount',
      'Due Balance'
    ].map(escapeField).join(',') + '\n';

    transactionsWithBalance.forEach(tx => {
      const sign = tx.amount > 0 ? '' : '-';
      const amt = `${sign}NPR ${Math.abs(tx.amount).toFixed(2)}`;
      const row = [
        tx.date,
        tx.desc || 'N/A',
        ...(includeBranch ? [tx.branch_name || tx.branch || '-'] : []),
        amt,
        `NPR ${Number(tx.due).toFixed(2)}`
      ];
      csvContent += row.map(escapeField).join(',') + '\n';
    });

    csvContent += '\n' + escapeField('NCM Information:') + '\n';
    csvContent += [
      ['Branch:', data.ncm_data.branch_name || 'All'],
      ['Current Due:', `NPR ${transactionsWithBalance.length ? Number(transactionsWithBalance[transactionsWithBalance.length-1].due).toFixed(2) : '0.00'}`]
    ]
      .map(pair => pair.map(escapeField).join(','))
      .join('\n') + '\n';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `NCM_Statement.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (!data || !transactionsWithBalance.length) {
      console.warn("No data available for PDF export");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFont("times", "italic");
    doc.setFontSize(20);
    doc.setTextColor(33, 33, 33);
    doc.text(`NCM Statement`, 15, 22);

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Statement Date: ${format(new Date(), "MMMM d, yyyy")}`, 15, 28);

    const headers = [["Date", "Description", "Amount", "Due Balance"]];
    const includeBranch = branchId !== undefined && branchId !== null;
    if (includeBranch) {
      headers[0].splice(2, 0, "Branch");
    }
    const tableData = transactionsWithBalance.map((tx) => {
      const row = [
        tx.date,
        tx.desc || "N/A",
      ];
      if (includeBranch) row.push(tx.branch_name || tx.branch || "-");
      row.push(`${tx.amount > 0 ? "" : "-"}NPR ${Math.abs(tx.amount).toLocaleString()}`);
      row.push(`NPR ${Number(tx.due).toLocaleString()}`);
      return row;
    });
    doc.autoTable({
      head: headers,
      body: tableData,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const totalCount = data.ncm_transactions.length;
    const totalDebit = Math.abs(
      data.ncm_transactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );
    const totalCredit = data.ncm_transactions
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
    let yPosition = finalY + 12 + lineHeight;
    doc.text(`Transactions: ${totalCount}`, rightX, yPosition, {
      align: "right",
    });
    yPosition += lineHeight;
    doc.text(
      `Total Debit: NPR ${totalDebit.toLocaleString()}`,
      rightX,
      yPosition,
      { align: "right" }
    );
    yPosition += lineHeight;
    doc.text(
      `Total Credit: NPR ${totalCredit.toLocaleString()}`,
      rightX,
      yPosition,
      { align: "right" }
    );
    yPosition += lineHeight;
    doc.text(
      `Current Due: NPR ${currentDue.toLocaleString()}`,
      rightX,
      yPosition,
      { align: "right" }
    );

    doc.save(`NCM_Statement.pdf`);
  };

  const calculateRunningBalance = (transactions, startingDue = 0) => {
    let running = Number(startingDue) || 0;
    return transactions.map((transaction) => {
      const amt = Number(transaction.amount) || 0;
      running += amt;
      return { ...transaction, due: running };
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        Loading NCM statement...
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
    data.ncm_data && data.ncm_data.previous_due !== undefined
      ? Number(data.ncm_data.previous_due)
      : 0;
  const transactionsWithBalance = calculateRunningBalance(
    data.ncm_transactions,
    previousDue
  );
  const computedCurrentDue = transactionsWithBalance.length
    ? transactionsWithBalance[transactionsWithBalance.length - 1].due
    : previousDue;

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
            <Building2 className="h-8 w-8" />
            NCM Statement
          </CardTitle>
          <p className="text-sm text-gray-400 print:text-gray-600">
            Statement Date: {format(new Date(), "MMMM d, yyyy")}
          </p>
          <Card className="mb-6 mt-4 bg-slate-700 border-slate-600 print:hidden">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400 print:text-gray-600">
                      Branch
                    </p>
                    <p className="font-semibold text-lg text-white print:text-black">
                      {data.ncm_data.branch_name || "All"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-sm text-gray-400 print:text-gray-600">
                      Current Receivable 
                    </p>
                    <p className="text-lg text-red-400 print:text-red-600">
                      NPR {Number(computedCurrentDue).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Filters */}
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
                <Label
                  htmlFor="startDate"
                  className="text-white whitespace-nowrap"
                >
                  Start:
                </Label>
                <Input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label
                  htmlFor="endDate"
                  className="text-white whitespace-nowrap"
                >
                  End:
                </Label>
                <Input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <Button
                type="submit"
                className="w-full lg:w-auto bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Filter by Date
              </Button>
            </form>

            <div className="flex space-x-2">
              <Button
                onClick={handlePrint}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleDownloadPDF}>
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadCSV}>
                    Download as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Statement Table */}
          <div className="rounded-lg border border-slate-600 print:border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-700 print:bg-gray-100">
                  <TableHead className="text-white print:text-black font-semibold">
                    Date
                  </TableHead>
                  <TableHead className="text-white print:text-black font-semibold">
                    Description
                  </TableHead>
                  {branchId && (
                    <TableHead className="text-white print:text-black font-semibold">
                      Branch
                    </TableHead>
                  )}
                  <TableHead className="text-right text-white print:text-black font-semibold">
                    Amount
                  </TableHead>
                  <TableHead className="text-right text-white print:text-black font-semibold">
                    Receiveable
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsWithBalance.map((transaction, index) => (
                  <TableRow
                    key={transaction.id}
                    className={`${
                      index % 2 === 0
                        ? "bg-slate-800 hover:bg-slate-600 print:bg-white hover:cursor-pointer"
                        : "bg-slate-750 print:bg-gray-50 hover:bg-slate-600 hover:cursor-pointer"
                    } cursor-default`}
                    // Navigate to sales edit if linked, else to ncm edit
                    onClick={() => {
                      if (transaction.all_sales_transaction) {
                        navigate(`/sales/branch/${transaction.branch}/editform/${transaction.all_sales_transaction}`);
                      } else {
                        navigate(`/ncm-transactions/branch/${transaction.branch}/editform/${transaction.id}`);
                      }
                    }}
                  >
                    <TableCell className="text-white print:text-black">
                      {transaction.date}
                    </TableCell>
                    <TableCell className="text-white print:text-black">
                      {transaction.desc || "N/A"}
                    </TableCell>
                    {branchId && (
                      <TableCell className="text-white print:text-black">
                        {transaction.branch_name || transaction.branch || "-"}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-white print:text-black">
                      {transaction.amount > 0 ? '-' : ''}NPR {Math.abs(transaction.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-white print:text-black">
                      NPR {Number(transaction.due).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllNCMStatementPage;
