'use client'

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Smartphone,
  ShoppingCart,
  TrendingUp,
  Zap,
  Shield,
  LogOut,
} from "lucide-react"
import useAxios from "../utils/useAxios"
import { useNavigate, useParams } from "react-router-dom"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { useDispatch } from "react-redux"
import { logout } from "../redux/accessSlice"
import Sidebar from "../components/allsidebar"
import ChartsDashboard from "../components/charts-dashboard"
import { clearSelectedBranch } from "../utils/branchUtils"
import { useBranchManagement } from "../hooks/useBranchManagement"

export default function AllLandingPage() {
  const api = useAxios()
  const navigate = useNavigate()
  const { branchId } = useParams()
  const [stats, setStats] = useState(null)
  const [isMonthly, setIsMonthly] = useState(false)
  const [showAmount, setShowAmount] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const dispatch = useDispatch()
  
  // Use branch management hook
  const { navigateWithBranch } = useBranchManagement()

  const handleLogout = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    clearSelectedBranch()
    dispatch(logout())
    navigate("/login")
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use branch-specific API endpoint if branchId is available from URL
        const endpoint = branchId 
          ? `alltransaction/stats/branch/${branchId}/`
          : "alltransaction/stats/"
        const response = await api.get(endpoint)
        setStats(response.data)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching stats:", err)
        setError("Failed to load statistics")
        setLoading(false)
      }
    }

    fetchStats()
  }, [branchId])

  if (loading) return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">Loading...</div>
  if (error) return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-red-500">{error}</div>
  if (!stats) return null

  const currentStats = isMonthly ? stats.monthly : stats.daily

  const getChartData = () => ({
    purchases: [
      { name: "Monthly", value: showAmount ? stats.monthly.ptamt : stats.monthly.purchases },
      { name: "Daily", value: showAmount ? stats.daily.dailyptamt : stats.daily.purchases },
    ],
    sales: [
      { name: "Monthly", value: showAmount ? stats.monthly.stamt : stats.monthly.sales },
      { name: "Daily", value: showAmount ? stats.daily.dailystamt : stats.daily.sales },
    ],
  })

  const chartData = getChartData()
  const COLORS = ["#8b5cf6", "#3b82f6"]

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar />

      <div className="flex-1 p-4 lg:p-10 lg:ml-64 overflow-y-auto">
        <div className="relative mb-8 pt-12 lg:pt-0"> {/* Added padding-top for mobile */}
          <motion.div
            initial={{ opacity: 0, x: -1000 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <motion.h1
              className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text whitespace-nowrap inline-block"
              animate={{ x: ["50%", "0%", "50%"] }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            >
              Welcome, {stats.enterprise}!
            </motion.h1>
          </motion.div>
          <Button
            onClick={handleLogout}
            className="absolute right-0 top-full mt-2 lg:top-1/2 lg:-translate-y-1/2 hover:bg-red-600 text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center space-x-2">
            <Switch
              id="stats-mode"
              checked={!isMonthly}
              onCheckedChange={(checked) => setIsMonthly(!checked)}
            />
            <Label htmlFor="stats-mode" className="text-white">
              {isMonthly ? "Monthly Stats" : "Daily Stats"}
            </Label>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
          <StatCard
            title="Total Purchases"
            value={currentStats.purchases}
            subValue={isMonthly ? currentStats.ptamt : currentStats.dailyptamt}
            icon={<ShoppingCart className="h-6 w-6 text-blue-400" />}
            onClick={() => navigateWithBranch("purchases")}
          />
          <StatCard
            title="Total Sales"
            value={currentStats.sales}
            subValue={isMonthly ? currentStats.stamt : currentStats.dailystamt}
            icon={<TrendingUp className="h-6 w-6 text-green-400" />}
            onClick={() => navigateWithBranch("sales")}
          />
          <StatCard 
            title="Profit"
            value={currentStats.profit}s

            icon={<Zap className="h-6 w-6 text-yellow-400" />}
            // onClick={() => navigate("/profit")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-8">
          <StatCard
            title="Current Stock"
            value={stats.stock}
            icon={<Smartphone className="h-6 w-6 text-purple-400" />}
            onClick={() => navigateWithBranch("inventory")}
          />
          <StatCard
            title="Brands"
            value={stats.brands}
            icon={<Shield className="h-6 w-6 text-indigo-400" />}
            onClick={() => navigateWithBranch("inventory")}
          />
        </div>

        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg">
          <CardHeader className="flex flex-col lg:flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-white mb-2 lg:mb-0">
              Financial Overview
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Switch
                id="amount-mode"
                checked={showAmount}
                onCheckedChange={setShowAmount}
              />
              <Label htmlFor="amount-mode" className="text-white">
                {showAmount ? "Show Amount" : "Show Count"}
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Purchases</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.purchases}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.purchases.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Sales</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.sales}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.sales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
            Analytics Dashboard
          </h2>
          <ChartsDashboard />
        </motion.div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subValue, icon, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-none shadow-lg hover:shadow-xl transition-shadow duration-300 group relative overflow-hidden">
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-0 transition-opacity duration-300"></div>
        <div className="absolute inset-0 bg-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors duration-300">
            {title}
          </CardTitle>
          {icon}
        </CardHeader>
        <CardContent className="relative z-10">
          {title!== "Profit" && <div className="text-xl lg:text-2xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300">
            {value}
          </div>}
          {title== "Profit" && <div className="text-xl lg:text-2xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300">
           RS. {value}
          </div>}
          {subValue !== undefined && (
            <div className="text-xs lg:text-sm text-slate-400 mt-1 group-hover:text-purple-200 transition-colors duration-300">
              Rs. {subValue.toFixed(2)}
            </div>
          )}
          {title === "Profit" && (
            <div className="text-xs lg:text-sm text-slate-400 mt-1 pb-5 group-hover:text-purple-200 transition-colors duration-300">
              
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}