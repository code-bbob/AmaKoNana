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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Printer,
  Download,
  ChevronDown,
  Search,
  ArrowLeft,
  User,
  Phone,
  CreditCard,
  Plus,
  ChevronsUpDown,
  Check,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useAxios from "@/utils/useAxios";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { createDateSelection, parseDateString } from "@/lib/calendar-sync";
import { getTodayDate } from "bs-ad-calendar-react";
import { AttendanceDateFilter } from "@/components/AttendanceDateFilter";

function padNum(value) {
  return String(value).padStart(2, "0");
}

function adDelta(adDate, dayOffset) {
  const d = new Date(`${adDate}T00:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return `${d.getFullYear()}-${padNum(d.getMonth() + 1)}-${padNum(d.getDate())}`;
}

function getBsMonthAdRange(bsYear, monthIndex) {
  const startBs = `${bsYear}-${padNum(monthIndex + 1)}-01`;
  let nextYear = bsYear;
  let nextMonth = monthIndex + 1;
  if (monthIndex === 11) {
    nextYear = bsYear + 1;
    nextMonth = 0;
  }
  const nextStartBs = `${nextYear}-${padNum(nextMonth + 1)}-01`;
  const adStart = createDateSelection(startBs, "bs").ad || startBs;
  const adNextStart = createDateSelection(nextStartBs, "bs").ad || nextStartBs;
  const adEnd = adDelta(adNextStart, -1);
  return { adStart, adEnd };
}

function formatDateBs(adDateString) {
  if (!adDateString) return adDateString;
  return createDateSelection(adDateString, "ad").bs || adDateString;
}

const EmployeeStatementPage = () => {
  const { employeeId, branchId } = useParams();
  const BS_MONTHS_SHORT = [
    "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
  ];
  const BS_MONTHS_FULL = [
    "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
  ];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    const todayAd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const bs = createDateSelection(todayAd, "ad").bs || todayAd;
    const parsed = parseDateString(bs);
    return Number.isFinite(parsed.month) ? parsed.month : now.getMonth();
  });
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const api = useAxios();
  const navigate = useNavigate();

  // Add/Edit transaction dialog state
  const [dialogMode, setDialogMode] = useState(null); // null | "add" | "edit"
  const [editingTxId, setEditingTxId] = useState(null);
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    desc: "",
    employee_type: "salary",
    transaction_type: "Payment",
  });
  const [entries, setEntries] = useState([{ bill_no: "", product: "", product_name: "", quantity: "", rate: "" }]);
  const [openProduct, setOpenProduct] = useState([false]);
  const [products, setProducts] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  // Delete confirmation state
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Auto-calc amount for incentive type
  useEffect(() => {
    if (txForm.employee_type === "incentive") {
      const total = entries.reduce((sum, e) => {
        const q = parseFloat(e.quantity) || 0;
        const r = parseFloat(e.rate) || 0;
        return sum + q * r;
      }, 0);
      setTxForm((prev) => ({ ...prev, amount: total }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, txForm.employee_type]);

  useEffect(() => {
    if (txForm.employee_type === "incentive" && txForm.transaction_type !== "Salary Credited") {
      setTxForm((prev) => ({ ...prev, transaction_type: "Salary Credited" }));
    }
  }, [txForm.employee_type, txForm.transaction_type]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productRes = await api.get(`allinventory/incentiveproduct/branch/${branchId}/`);
        setProducts(productRes.data?.results ?? productRes.data ?? []);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    if (dialogMode !== null && products.length === 0) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogMode]);

  useEffect(() => {
    fetchAllTransactions();
  }, [employeeId]);

  const fetchEmployeeStatement = async (params = {}) => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(
        `alltransaction/employee/statement/${employeeId}/?${queryString}`
      );
      setData(response.data);
    } catch (err) {
      setError("Failed to fetch employee statement");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all transactions once (no date filters) for month tab filtering
  const fetchAllTransactions = async (params = {}) => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(
        `alltransaction/employee/statement/${employeeId}/?${queryString}`
      );
      setData(response.data);
    } catch (err) {
      setError("Failed to fetch employee statement");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const params = { search: searchTerm };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    fetchAllTransactions(params);
  };

  const handleRangeApply = ({ startDate: selStart, endDate: selEnd, dateFormat: fmt }) => {
    // The statement API only accepts AD dates; convert the chosen AD/BS selection back to AD.
    const adStart = createDateSelection(selStart, fmt).ad || selStart;
    const adEnd = createDateSelection(selEnd, fmt).ad || selEnd;
    setStartDate(adStart);
    setEndDate(adEnd);
    const params = { start_date: adStart, end_date: adEnd };
    if (searchTerm) params.search = searchTerm;
    fetchAllTransactions(params);
  };

  const handleTxChange = (e) => {
    const { name, value } = e.target;
    if (formError) setFormError(null);
    setTxForm((prevState) => ({ ...prevState, [name]: value }));
  };

  const resetTxForm = () => {
    setDialogMode(null);
    setEditingTxId(null);
    setTxForm({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      desc: "",
      employee_type: "salary",
      transaction_type: "Payment",
    });
    setEntries([{ bill_no: "", product: "", product_name: "", quantity: "", rate: "" }]);
    setOpenProduct([false]);
    setFormError(null);
  };

  const openAddDialog = () => {
    resetTxForm();
    setDialogMode("add");
  };

  const openEditDialog = (tx) => {
    setEditingTxId(tx.id);
    setFormError(null);
    setTxForm({
      date: tx.date,
      amount: Math.abs(Number(tx.amount)),
      desc: tx.desc || "",
      employee_type: tx.employee_type || "salary",
      transaction_type: tx.transaction_type || "Payment",
    });
    const details = tx.employee_transaction_details || [];
    const baseEntries = details.length
      ? details.map((d) => ({
          id: d.id,
          bill_no: d.bill_no || "",
          product: d.product ? d.product.toString() : "",
          product_name: d.product_name || "",
          quantity: d.quantity?.toString() || "",
          rate: d.rate?.toString() || "",
        }))
      : [{ bill_no: "", product: "", product_name: "", quantity: "", rate: "" }];
    setEntries(baseEntries);
    setOpenProduct(baseEntries.map(() => false));
    setDialogMode("edit");
  };

  const handleDeleteTransaction = async () => {
    if (!deleteTx) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await api.delete(`alltransaction/employeetransaction/${deleteTx.id}/`);
      setDeleteTx(null);
      fetchAllTransactions();
    } catch (err) {
      console.error("Error deleting data:", err);
      setDeleteError("Failed to delete employee transaction. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();

    if (!txForm.date?.trim()) {
      setFormError("Date is required");
      return;
    }
    if (!txForm.amount || parseFloat(txForm.amount) <= 0) {
      setFormError("Amount is required and must be greater than 0");
      return;
    }
    if (!txForm.transaction_type?.trim()) {
      setFormError("Transaction Type is required");
      return;
    }

    if (txForm.employee_type === "incentive") {
      const hasValidEntry = entries.some(
        (en) => en.product && en.quantity && en.rate &&
          parseFloat(en.quantity) > 0 && parseFloat(en.rate) > 0
      );
      if (!hasValidEntry) {
        setFormError("At least one complete incentive entry (product, quantity, rate) is required");
        return;
      }
    }

    try {
      setSubLoading(true);
      setFormError(null);
      const payload = {
        date: txForm.date,
        employee: employeeId,
        amount: txForm.amount,
        desc: txForm.desc?.trim() || "",
        branch: branchId,
        employee_type: txForm.employee_type,
        transaction_type: txForm.employee_type === "incentive" ? "Salary Credited" : txForm.transaction_type,
      };
      if (txForm.employee_type === "incentive") {
        payload.employee_transaction_details = entries
          .filter((en) => en.product || en.quantity || en.rate)
          .map((en) => {
            const quantity = parseFloat(en.quantity) || 0;
            const rate = parseFloat(en.rate) || 0;
            return {
              bill_no: en.bill_no?.trim() || "",
              product: en.product ? Number(en.product) : null,
              quantity,
              rate,
              total: quantity * rate,
            };
          });
      }
      if (dialogMode === "edit") {
        await api.patch(`alltransaction/employeetransaction/${editingTxId}/`, payload);
      } else {
        await api.post("alltransaction/employeetransaction/", payload);
      }
      resetTxForm();
      fetchEmployeeStatement();
    } catch (err) {
      console.error("Error submitting data:", err);
      setFormError(
        dialogMode === "edit"
          ? "Failed to update employee transaction. Please try again."
          : "Failed to submit employee transaction. Please try again."
      );
    } finally {
      setSubLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateRunningBalance = (transactions, startBalance = 0) => {
    let running = Number(startBalance) || 0;
    return transactions.map((transaction) => {
      const amt = Number(transaction.amount) || 0;
      running += amt;
      return { ...transaction, due: running };
    });
  };

  const getTransactionTypeColor = (amount) => {
    return amount > 0 ? "text-green-400" : "text-red-400";
  };

  const formatDescriptionWithDetails = (tx) => {
    if (!tx.employee_transaction_details || tx.employee_transaction_details.length === 0) {
      return tx.desc || "No description";
    }

    const details = tx.employee_transaction_details;
    const detailLines = details.map((detail) => {
      const billNo = detail.bill_no || "N/A"
      const productName = detail.product_name || "Unknown";
      const rate = detail.rate || 0;
      const quantity = detail.quantity || 0;
      // Handle both direct values and nested objects with source/parsedValue
      const total = detail.total?.parsedValue || detail.total || 0;
      return `${billNo} -> ${productName}: ${rate} × ${quantity} = Rs. ${total}`;
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

    csvContent += "\n" + escapeField("Employee Information:") + "\n";
    csvContent += [
      ["Name:", data.employee_data.name],
      ["Phone:", data.employee_data.phone_number || "N/A"],
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
    link.setAttribute("download", `Employee_Statement_${data.employee_data.name}.csv`);
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
    doc.text(`Employee Statement - ${data.employee_data.name}`, 15, 22);

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

    const totalCount = filteredTransactions.length;
    const totalDebit = Math.abs(
      filteredTransactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );
    const totalPaid = filteredTransactions
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

    doc.save(`Employee_Statement_${data.employee_data.name}.pdf`);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        Loading employee statement...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">
        {error}
      </div>
    );
  if (!data) return null;

  const currentBsToday = getTodayDate("BS");
  const currentYear = currentBsToday.year;

  // Compute AD boundaries for each of the 12 BS months of the current BS year
  const bsMonthRanges = Array.from({ length: 12 }, (_, m) => getBsMonthAdRange(currentYear, m));

  // BS start/end of the active month, for the date picker to reflect the selected tab
  const activeBsStart = createDateSelection(bsMonthRanges[activeMonth].adStart, "ad").bs || bsMonthRanges[activeMonth].adStart;
  const activeBsEnd = createDateSelection(bsMonthRanges[activeMonth].adEnd, "ad").bs || bsMonthRanges[activeMonth].adEnd;

  // Calculate running balance across ALL transactions to get the cumulative due at any point
  const allTxSorted = [...data.employee_transactions].sort((a, b) => {
    if (a.date === b.date) return a.id - b.id;
    return a.date.localeCompare(b.date);
  });

  const baseDue = data.employee_data?.previous_due !== undefined
    ? Number(data.employee_data.previous_due)
    : 0;

  // Build a map of date -> cumulative running balance at end of that transaction
  let runningBalance = baseDue;
  const txWithCumulativeBalance = allTxSorted.map((tx) => {
    runningBalance += Number(tx.amount) || 0;
    return { ...tx, cumulativeBalance: runningBalance };
  });

  // Compute previousDue for the active month (using AD boundaries of the active BS month)
  const monthStart = bsMonthRanges[activeMonth].adStart;
  const monthEnd = bsMonthRanges[activeMonth].adEnd;

  // Previous due = running balance of all transactions before the active month
  const txBeforeMonth = txWithCumulativeBalance.filter((tx) => tx.date < monthStart);
  const previousDue = txBeforeMonth.length > 0
    ? txBeforeMonth[txBeforeMonth.length - 1].cumulativeBalance
    : baseDue;

  // Filter to active month
  const filteredTransactions = txWithCumulativeBalance.filter((tx) => {
    return tx.date >= monthStart && tx.date <= monthEnd;
  });

  const transactionsWithBalance = calculateRunningBalance(filteredTransactions, previousDue);
  const computedCurrentDue = transactionsWithBalance.length
    ? transactionsWithBalance[transactionsWithBalance.length - 1].due
    : previousDue;

  const handleRowClick = (tx) => {
    navigate(`/employee-transactions/branch/${branchId}/editform/${tx.id}`);
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
            Employee Statement - {data.employee_data.name}
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
                    <p className="text-sm text-gray-400 print:text-gray-600">Employee Name</p>
                    <p className="font-semibold text-lg text-white print:text-black">{data.employee_data.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400 print:text-gray-600">Phone</p>
                    <p className="text-lg text-white print:text-black">{data.employee_data.phone_number || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400 print:text-gray-600">Month Due ({BS_MONTHS_FULL[activeMonth]})</p>
                    <p className="text-lg text-green-400 print:text-green-600">NPR {Number(computedCurrentDue).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-sm text-gray-400 print:text-gray-600">Overall Due</p>
                    <p className="text-lg text-yellow-400 print:text-yellow-600">NPR {Number(baseDue + allTxSorted.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Month Tabs */}
          <Tabs value={activeMonth.toString()} onValueChange={(val) => setActiveMonth(Number(val))} className="mb-6 print:hidden">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-slate-800 p-1">
              {BS_MONTHS_SHORT.map((month, idx) => {
                const range = bsMonthRanges[idx];
                const mStart = range.adStart;
                const mEnd = range.adEnd;
                const hasTransactions = data.employee_transactions.some(
                  (tx) => tx.date >= mStart && tx.date <= mEnd
                );
                const isCurrentMonth = idx === currentBsToday.month;
                return (
                  <TabsTrigger
                    key={month}
                    value={idx.toString()}
                    className={cn(
                      "flex-1 min-w-[60px] text-xs sm:text-sm py-2 px-1",
                      hasTransactions && "font-semibold",
                      isCurrentMonth && idx === activeMonth && "bg-emerald-600 text-white",
                      !isCurrentMonth && idx === activeMonth && "bg-purple-600 text-white"
                    )}
                  >
                    {month}
                    {hasTransactions && (
                      <span className="ml-1 text-[10px] opacity-70">
                        {data.employee_transactions.filter(
                          (tx) => tx.date >= mStart && tx.date <= mEnd
                        ).length}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:gap-4 print:hidden">
             <AttendanceDateFilter
              mode="range"
              title="Filter by Date"
              initialDateFormat="bs"
              initialDateSourceFormat="bs"
              initialStartDate={activeBsStart}
              initialEndDate={activeBsEnd}
              applyLabel="Filter by Date"
              onApply={handleRangeApply}
              className="w-auto"
            />

            <form onSubmit={handleSearch} className="w-full lg:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full lg:w-96 bg-slate-700 text-white border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
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
                  <TableHead className="text-right text-white print:text-black font-semibold print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Previous Due row */}
                {previousDue !== 0 && (
                  <TableRow className="bg-amber-900/30 print:bg-amber-50">
                    <TableCell className="font-medium text-amber-400 print:text-amber-700">
                      {BS_MONTHS_FULL[activeMonth]} 1, {currentYear}
                    </TableCell>
                    <TableCell className="text-amber-400 print:text-amber-700 font-semibold">
                      Previous Due (carried forward)
                    </TableCell>
                    <TableCell className="text-right font-semibold text-amber-400 print:text-amber-700">
                      -
                    </TableCell>
                    <TableCell className="text-right font-semibold text-amber-400 print:text-amber-700">
                      NPR {Number(previousDue).toLocaleString()}
                    </TableCell>
                    <TableCell className="print:hidden"></TableCell>
                  </TableRow>
                )}
                {transactionsWithBalance.map((tx, index) => (
                  <TableRow
                    key={tx.id}
                    onClick={() => handleRowClick(tx)}
                    className={`${index % 2 === 0 ? "bg-slate-800 print:bg-white" : "bg-slate-750 print:bg-gray-50"} hover:bg-slate-700 print:hover:bg-gray-100`}
                  >
                    <TableCell className="font-medium text-white print:text-black">
                      {formatDateBs(tx.date)}
                    </TableCell>
                    <TableCell className="text-white print:text-black max-w-xs whitespace-pre-wrap">{formatDescriptionWithDetails(tx)}</TableCell>
                    <TableCell className={`text-right font-semibold ${getTransactionTypeColor(tx.amount)} print:text-black`}>
                      {tx.amount > 0 ? "" : "-"}NPR {Math.abs(tx.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white print:text-black">
                      NPR {Number(tx.due).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Edit transaction"
                          className="h-8 w-8 bg-slate-700 border-slate-500 text-blue-400 hover:bg-blue-600 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(tx);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Delete transaction"
                          className="h-8 w-8 bg-slate-700 border-slate-500 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setDeleteTx(tx);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-80 bg-slate-800 p-6 rounded-lg print:bg-gray-100 print:border print:border-gray-200">
              <h3 className="text-white print:text-black font-semibold mb-3">{BS_MONTHS_FULL[activeMonth]} {currentYear} Summary</h3>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 print:text-gray-600">Total Transactions:</span>
                  <span className="font-semibold text-white print:text-black">{filteredTransactions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 print:text-gray-600">Total Credited Amount:</span>
                  <span className="font-semibold text-green-400 print:text-green-600">

                    NPR {filteredTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 print:text-gray-600">Total Paid Amount:</span>
                  <span className="font-semibold text-red-400 print:text-red-600">
                    NPR {Math.abs(
                      filteredTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
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

      {/* Floating Add Transaction Button */}
      <Button
        onClick={openAddDialog}
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/50 print:hidden"
        aria-label="Add employee transaction"
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* Add/Edit Employee Transaction Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(o) => { if (!o) resetTxForm(); }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto overscroll-contain bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Edit Transaction" : "Add Transaction"} - {data.employee_data.name}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Add a new transaction for this employee.
            </DialogDescription>
          </DialogHeader>
          {formError && <p className="text-red-400 mb-4">{formError}</p>}
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <Label htmlFor="tx_date" className="text-sm font-medium text-white mb-2">
                  Date
                </Label>
                <Input
                  type="date"
                  id="tx_date"
                  name="date"
                  value={txForm.date}
                  onChange={handleTxChange}
                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div className="flex flex-col">
                <Label htmlFor="tx_employee_type" className="text-sm font-medium text-white mb-2">
                  Type
                </Label>
                <Select
                  value={txForm.employee_type}
                  onValueChange={(value) => handleTxChange({ target: { name: "employee_type", value } })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="incentive">Incentive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label htmlFor="tx_transaction_type" className="text-sm font-medium text-white mb-2">
                  Transaction Type
                </Label>
                <Select
                  value={txForm.transaction_type}
                  onValueChange={(value) => handleTxChange({ target: { name: "transaction_type", value } })}
                  disabled={txForm.employee_type === "incentive"}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    {txForm.employee_type !== "incentive" && <SelectItem value="Payment">Payment</SelectItem>}
                    <SelectItem value="Salary Credited">Salary Credited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label htmlFor="tx_amount" className="text-sm font-medium text-white mb-2">
                  Amount
                </Label>
                <Input
                  type="number"
                  id="tx_amount"
                  name="amount"
                  value={txForm.amount}
                  onChange={handleTxChange}
                  className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter amount"
                  required
                  disabled={txForm.employee_type === "incentive"}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="tx_desc" className="text-sm font-medium text-white mb-2">
                Description
              </Label>
              <Input
                type="text"
                id="tx_desc"
                name="desc"
                value={txForm.desc}
                onChange={handleTxChange}
                className="bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter description"
              />
            </div>

            {txForm.employee_type === "incentive" && (
              <div className="space-y-4">
                {entries.map((entry, idx) => (
                  <div key={idx} className="bg-slate-700 text-white p-4 rounded-md shadow">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                      <div>
                        <Label className="text-sm font-medium text-white mb-2 block">Bill No.</Label>
                        <Input
                          type="text"
                          value={entry.bill_no || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEntries((prev) => prev.map((it, i) => (i === idx ? { ...it, bill_no: v } : it)));
                          }}
                          className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter bill no"
                        />
                      </div>

                      {/* Product combobox */}
                      <div className="flex flex-col col-span-2">
                        <Label className="text-sm font-medium text-white mb-2">Product</Label>
                        <Popover open={openProduct[idx]} onOpenChange={(o) => setOpenProduct((prev) => {
                          const copy = [...prev];
                          copy[idx] = o;
                          return copy;
                        })}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openProduct[idx]}
                              className="w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                            >
                              {entry.product
                                ? (products.find((p) => p.id.toString() === entry.product)?.name || "Select a product...")
                                : "Select a product..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0 bg-slate-800 border-slate-700">
                            <Command className="bg-slate-700 border-slate-600">
                              <CommandInput placeholder="Search product..." className="bg-slate-700 text-white" />
                              <CommandList>
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                  {products.map((p) => (
                                    <CommandItem
                                      key={p.id}
                                      onSelect={() => {
                                        setEntries((prev) => prev.map((it, i) => (
                                          i === idx
                                            ? { ...it, product: p.id.toString(), product_name: p.name, rate: p.rate }
                                            : it
                                        )));
                                        setOpenProduct((prev) => {
                                          const copy = [...prev];
                                          copy[idx] = false;
                                          return copy;
                                        });
                                      }}
                                      className="text-white hover:bg-slate-600"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          entry.product === p.id.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {p.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Quantity */}
                      <div>
                        <Label className="text-sm font-medium text-white mb-2 block">Quantity</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={entry.quantity}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEntries((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: v } : it)));
                          }}
                          className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                          placeholder="0"
                        />
                      </div>

                      {/* Rate */}
                      <div>
                        <Label className="text-sm font-medium text-white mb-2 block">Rate</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={entry.rate}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEntries((prev) => prev.map((it, i) => (i === idx ? { ...it, rate: v } : it)));
                          }}
                          className="bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500"
                          placeholder="0"
                        />
                      </div>

                      {/* Total (non-editable) */}
                      <div>
                        <Label className="text-sm font-medium text-white mb-2 block">Total</Label>
                        <div className="bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm">
                          {(parseFloat(entry.quantity) || 0) * (parseFloat(entry.rate) || 0)}
                        </div>
                      </div>
                    </div>

                    {entries.length > 1 && (
                      <Button
                        type="button"
                        aria-label="Remove item"
                        size="sm"
                        className="bg-red-600 mt-3 hover:bg-red-700 text-white"
                        onClick={() => {
                          setEntries((prev) => prev.filter((_, i) => i !== idx));
                          setOpenProduct((prev) => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Remove Item
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => {
                    setEntries((prev) => [...prev, { bill_no: "", product: "", product_name: "", quantity: "", rate: "" }]);
                    setOpenProduct((prev) => [...prev, false]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Another
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={subLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {subLoading
                  ? (dialogMode === "edit" ? "Updating..." : "Submitting...")
                  : (dialogMode === "edit" ? "Update Employee Transaction" : "Submit Employee Transaction")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTx !== null} onOpenChange={(o) => { if (!o) { setDeleteTx(null); setDeleteError(null); } }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription className="text-slate-300">
              This will permanently delete this transaction of{" "}
              <span className="font-semibold text-white">{data.employee_data.name}</span> dated{" "}
              <span className="font-semibold text-white">
                {deleteTx ? format(new Date(deleteTx.date), "MMM dd, yyyy") : ""}
              </span>{" "}
              for NPR {deleteTx ? Math.abs(Number(deleteTx.amount)).toLocaleString() : ""}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-red-400">{deleteError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-500 text-black hover:bg-slate-700"
              onClick={() => { setDeleteTx(null); setDeleteError(null); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTransaction}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeStatementPage;
