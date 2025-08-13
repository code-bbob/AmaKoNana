'use client'

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Smartphone,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Container,
  Zap,
  Shield,
  LogOut,
  BookUser,
  Menu,
  X,
  Building,
  ChevronDown,
  RefreshCw
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useBranchManagement } from "../hooks/useBranchManagement"

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isChangingBranch, setIsChangingBranch] = useState(false)
  
  // Use branch management hook
  const { navigateWithBranch, currentBranch, clearBranch } = useBranchManagement()

  const toggleSidebar = () => setIsOpen(!isOpen)

  useEffect(() => {
    setIsOpen(false)
  }, [location])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.sidebar')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  }

  // Grouped menu structure for collapsible dropdowns
  const groupedMenu = [
    {
      label: 'Inventory',
      icon: Container,
      items: [
        { title: 'Inventory', icon: Container, path: 'inventory' },
        { title: 'Manufacture', icon: Zap, path: 'manufacture' }
      ]
    },
    {
      label: 'Purchase',
      icon: ShoppingCart,
      items: [
        { title: 'Purchases', icon: ShoppingCart, path: 'purchases' },
        { title: 'PurchaseReturn', icon: TrendingDown, path: 'purchase-returns' },
        { title: 'PurchaseReport', icon: TrendingDown, path: 'purchase-report', externalReport: true }
      ]
    },
    {
      label: 'Sales',
      icon: TrendingUp,
      items: [
        { title: 'Sales', icon: TrendingUp, path: 'sales' },
        { title: 'SalesReturn', icon: TrendingDown, path: 'sales-returns' },
        { title: 'SalesReport', icon: TrendingUp, path: 'sales-report', externalReport: true }
      ]
    },
    {
      label: 'Staff',
      icon: Shield,
      items: [
        { title: 'Staffs', icon: TrendingUp, path: 'staff' },
        { title: 'StaffTransaction', icon: TrendingUp, path: 'staff-transactions' }
      ]
    },
    {
      label: 'Vendors',
      icon: BookUser,
      items: [
        { title: 'Vendors', icon: BookUser, path: 'vendors' },
        { title: 'VendorTransactions', icon: BookUser, path: 'vendor-transactions' }
      ]
    },
    // Future groups could include Debtors, etc.
  ]

  const [openGroups, setOpenGroups] = useState(() => {
    // Default open top 1-2 core groups
    return {
      Inventory: true,
      Purchase: false,
      Sales: false,
      Staff: false,
      Vendors: false,
    }
  })

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const handleNavigation = (path) => {
    setIsOpen(false)
    if (path === '/mobile') {
      // Mobile section doesn't need branch in URL for the landing page
      navigate(path)
    } else {
      // Use branch management for other paths
      navigateWithBranch(path)
    }
  }

  const handleChangeBranch = async () => {
    console.log('Change branch clicked')
    setIsChangingBranch(true)
    try {
      // Clear the selected branch to trigger branch selection
      clearBranch()
      console.log('Branch cleared, navigating to select-branch')
      setIsOpen(false) // Close sidebar on mobile
      // Navigate to branch selection page
      navigate('/select-branch')
    } catch (error) {
      console.error('Error changing branch:', error)
    } finally {
      setIsChangingBranch(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        className="fixed top-4 left-4 z-50 lg:hidden text-white"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      <AnimatePresence>
        {(isOpen || window.innerWidth >= 1024) && (
          <motion.div
            className="sidebar fixed top-0 left-0 z-40 w-64 h-full bg-slate-800 shadow-xl overflow-y-auto"
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-6 pt-16 lg:pt-6">
              <div 
                className="text-2xl font-bold text-center mb-3 text-white cursor-pointer" 
                onClick={() => {
                  navigate('/')
                  setIsOpen(false)
                }}
              >
                All Inventory
              </div>
              
              {/* Enhanced Branch Selector */}
              {currentBranch && (
                <div className="mb-2">
                  <div className="flex items-center space-x-2 p-3 bg-slate-700 rounded-lg">
                    <Building className="h-5 w-5 text-purple-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {currentBranch.name || `Branch ${currentBranch.id}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {currentBranch.enterprise_name || 'Current Branch'}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleChangeBranch()
                          }} 
                          disabled={isChangingBranch}
                          className="cursor-pointer"
                        >
                          <RefreshCw className={`mr-2 h-4 w-4 ${isChangingBranch ? 'animate-spin' : ''}`} />
                          Change Branch
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
              
              <nav className="space-y-2">
                {groupedMenu.map(group => {
                  const isGroupOpen = openGroups[group.label]
                  return (
                    <div key={group.label} className="border border-slate-700/40 rounded-md overflow-hidden">
                      <button
                        onClick={() => toggleGroup(group.label)}
                        className="w-full flex items-center justify-between px-4 py-2 bg-slate-700/40 hover:bg-slate-700 text-slate-200 text-sm font-medium"
                      >
                        <span className="flex items-center">
                          <group.icon className="mr-2 h-4 w-4" />
                          {group.label}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {isGroupOpen && (
                          <motion.ul
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col"
                          >
                            {group.items.map(item => {
                              const isExternalReport = item.externalReport
                              if (isExternalReport) {
                                const fullPath = currentBranch ? `/${item.path}/branch/${currentBranch.id}` : '#'
                                return (
                                  <li key={item.path} className="border-t border-slate-700/30">
                                    <a
                                      href={fullPath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`block px-6 py-2 text-slate-300 text-sm hover:bg-slate-700 hover:text-white ${!currentBranch ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                      <div className="flex items-center">
                                        <item.icon className="mr-2 h-4 w-4" />
                                        {item.title}
                                        <span className="ml-auto text-[10px] uppercase tracking-wide bg-slate-600/60 px-1.5 py-0.5 rounded">Report</span>
                                      </div>
                                    </a>
                                  </li>
                                )
                              }
                              const fullPath = item.path === '/mobile' ? '/mobile' : (currentBranch ? `/${item.path}/branch/${currentBranch.id}` : '#')
                              return (
                                <li key={item.path} className="border-t border-slate-700/30">
                                  <a
                                    href={fullPath}
                                    className={`block px-6 py-2 text-slate-300 text-sm hover:bg-slate-700 hover:text-white ${!currentBranch && item.path !== '/mobile' ? 'opacity-50 pointer-events-none' : ''}`}
                                    onClick={(e) => {
                                      if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
                                        e.preventDefault()
                                        handleNavigation(item.path)
                                      }
                                    }}
                                  >
                                    <div className="flex items-center">
                                      <item.icon className="mr-2 h-4 w-4" />
                                      {item.title}
                                    </div>
                                  </a>
                                </li>
                              )
                            })}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
