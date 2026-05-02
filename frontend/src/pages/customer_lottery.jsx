"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Zap, Trophy, Calendar } from "lucide-react";
import useAxios from "../utils/useAxios";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Sidebar from "../components/allsidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomerLotteryPage() {
  const api = useAxios();
  const navigate = useNavigate();

  const [numWinners, setNumWinners] = useState("");
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [winners, setWinners] = useState([]);
  const [lotteryDrawn, setLotteryDrawn] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(null);

  const handleDraw = async () => {
    const count = numWinners ? parseInt(numWinners) : 0;
    if (count < 1) {
      setError("Please enter at least 1 winner");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const payload = {
        num_winners: count,
        use_loyalty_points: useLoyaltyPoints,
      };

      if (startDate && endDate) {
        payload.start_date = startDate;
        payload.end_date = endDate;
      }

      const response = await api.post("alltransaction/customers/lottery/", payload);

      setWinners(response.data.winners || []);
      setEligibleCount(response.data.eligible_customers_count);
      setLotteryDrawn(true);
    } catch (err) {
      console.error("Error drawing lottery:", err);
      setError(err.response?.data?.error || "Failed to draw lottery");
      setWinners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setWinners([]);
    setLotteryDrawn(false);
    setError(null);
    setNumWinners("");
    setEligibleCount(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex lg:flex-row flex-col">
      <Sidebar />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 lg:ml-64">
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-gray-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-white">Customer Lottery</h1>
            </div>
            <p className="text-gray-400">
              Draw random winners based on loyalty points (more points = more entries)
            </p>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Zap className="h-6 w-6 text-indigo-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-indigo-300 font-semibold">How it works</p>
                    <ul className="text-slate-300 text-sm mt-2 space-y-2">
                      <li>• <span className="font-medium">Date Range (Optional):</span> Leave blank to include all customers, or select dates to only include customers who made purchases during that period</li>
                      <li>• <span className="font-medium">Weighted Spin:</span> Each customer's loyalty points = lottery entries (customer with 100 points = 100 entries)</li>
                      <li>• <span className="font-medium">Fair Spin:</span> All eligible customers have equal probability regardless of loyalty points</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Input Section */}
          {!lotteryDrawn && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-indigo-400" />
                    Configure Lottery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {/* Number of Winners */}
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-2">
                        Number of Winners to Draw
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={numWinners}
                        onChange={(e) => setNumWinners(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    {/* Date Range Section */}
                    <div className="border-t border-slate-700 pt-4">
                      <p className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-400" />
                        Date Range (Optional)
                      </p>
                      <p className="text-xs text-slate-400 mb-3">
                        Leave blank to include all customers. Fill both dates to only include customers with purchases in that period.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-2">Start Date</label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-2">End Date</label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Loyalty Points Toggle */}
                    <div className="border-t border-slate-700 pt-4">
                      <p className="text-sm font-medium text-slate-300 mb-3">Spin Type</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors">
                          <input
                            type="radio"
                            name="spinType"
                            checked={useLoyaltyPoints}
                            onChange={() => setUseLoyaltyPoints(true)}
                            className="w-4 h-4"
                          />
                          <div>
                            <p className="text-sm font-medium text-white">Weighted Spin</p>
                            <p className="text-xs text-slate-400">Loyalty points = lottery entries</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-700/50 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors">
                          <input
                            type="radio"
                            name="spinType"
                            checked={!useLoyaltyPoints}
                            onChange={() => setUseLoyaltyPoints(false)}
                            className="w-4 h-4"
                          />
                          <div>
                            <p className="text-sm font-medium text-white">Fair Spin</p>
                            <p className="text-xs text-slate-400">All customers have equal probability</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-red-300 text-sm">{error}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleDraw}
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 h-auto"
                    >
                      {loading ? "Drawing..." : "🎰 Draw Lottery"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Winners Section */}
          {lotteryDrawn && winners.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-slate-800 border-slate-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-indigo-400 animate-pulse" />
                    🎉 Lottery Winners ({winners.length})
                  </CardTitle>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Spin Type:</span>
                      <span className="text-indigo-300 font-medium">
                        {useLoyaltyPoints ? "⚖️ Weighted (Loyalty Points)" : "🎲 Fair Spin"}
                      </span>
                    </div>
                    {eligibleCount && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Eligible Customers:</span>
                        <span className="text-slate-300 font-medium">{eligibleCount}</span>
                      </div>
                    )}
                    {startDate && endDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Date Range:</span>
                        <span className="text-slate-300 font-medium">{startDate} → {endDate}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto mb-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="font-semibold text-slate-300">Position</TableHead>
                          <TableHead className="font-semibold text-slate-300">Name</TableHead>
                          <TableHead className="font-semibold text-slate-300">Phone</TableHead>
                          <TableHead className="font-semibold text-slate-300 text-right">
                            Loyalty Points
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {winners.map((winner, index) => (
                          <motion.tr
                            key={winner.phone_number}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="border-slate-700 hover:bg-slate-700/50 transition-colors"
                          >
                            <TableCell className="font-bold text-indigo-400">
                              #{index + 1}
                            </TableCell>
                            <TableCell className="font-medium text-white">{winner.name}</TableCell>
                            <TableCell className="text-slate-300">{winner.phone_number}</TableCell>
                            <TableCell className="text-right">
                              <span className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-semibold border border-indigo-400/30">
                                ⭐ {winner.loyalty_points || 0}
                              </span>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button
                    onClick={handleReset}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Draw Again
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {lotteryDrawn && winners.length === 0 && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Users className="h-12 w-12 text-gray-600 mb-2" />
                    <p className="text-gray-400">No winners could be drawn</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
