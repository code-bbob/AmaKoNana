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

  // Grouped menu with mainPath (label click navigates) and arrow-only expansion
  const groupedMenu = [
    {
      label: 'Inventory',
      icon: Container,
      mainPath: 'inventory',
      items: [
        { title: 'Inventory', icon: Container, path: 'inventory' },
        { title: 'Manufacture', icon: Zap, path: 'manufacture' }
      ]
    },
    {
      label: 'Purchase',
      icon: ShoppingCart,
      mainPath: 'purchases/form', // label click goes to add purchase form
      items: [
        { title: 'Add Purchase', icon: ShoppingCart, path: 'purchases/form' },
        { title: 'Purchases', icon: ShoppingCart, path: 'purchases' },
        { title: 'Purchase Return', icon: TrendingDown, path: 'purchase-returns' },
        { title: 'Purchase Report', icon: TrendingDown, path: 'purchase-report', externalReport: true }
      ]
    },
    {
      label: 'Sales',
      icon: TrendingUp,
      mainPath: 'sales/form',
      items: [
        { title: 'Add Sales', icon: TrendingUp, path: 'sales/form' },
        { title: 'Sales', icon: TrendingUp, path: 'sales' },
        { title: 'Sales Return', icon: TrendingDown, path: 'sales-returns' },
        { title: 'Sales Report', icon: TrendingUp, path: 'sales-report', externalReport: true }
      ]
    },
    {
      label: 'Staff',
      icon: Shield,
      mainPath: 'staff',
      items: [
        { title: 'Staffs', icon: TrendingUp, path: 'staff' },
        { title: 'Staff Transaction', icon: TrendingUp, path: 'staff-transactions' },
        { title: 'Product Incentives', icon: Container, path: 'staff/product-incentives' }
      ]
    },
    {
      label: 'Vendors',
      icon: BookUser,
      mainPath: 'vendors',
      items: [
        { title: 'Vendors', icon: BookUser, path: 'vendors' },
        { title: 'Vendor Transactions', icon: BookUser, path: 'vendor-transactions' }
      ]
    },
    {
      label: 'Debtors',
      icon: BookUser,
      mainPath: 'debtors',
      items: [
        { title: 'Debtors', icon: BookUser, path: 'debtors' },
        { title: 'Debtor Transactions', icon: BookUser, path: 'debtor-transactions' }
      ]
    },
    {
      label: 'Transfer',
      icon: RefreshCw,
      mainPath: 'transfer/form',
      items: [
        { title: 'Add Transfer', icon: RefreshCw, path: 'transfer/form' }
      ]
    }
    ,
    {
      label: 'Orders',
      icon: ShoppingCart,
      mainPath: 'orders/form',
      items: [
        { title: 'Add Order', icon: ShoppingCart, path: 'orders/form' },
        { title: 'Orders', icon: ShoppingCart, path: 'orders' }
      ]
    }
  ]

  const [openGroups, setOpenGroups] = useState(() => {
    // Start all closed, except the one matching current route (if any)
    const initial = {}
    groupedMenu.forEach(g => { initial[g.label] = false })
    const seg = location.pathname.split('/').filter(Boolean)[0]
    if (seg) {
      const matchGroup = groupedMenu.find(g => g.items.some(i => i.path === seg))
      if (matchGroup) initial[matchGroup.label] = true
    }
    return initial
  })

  // When route changes, auto-open the relevant group while keeping others' current state (optional: collapse others)
  useEffect(() => {
    const seg = location.pathname.split('/').filter(Boolean)[0]
    if (!seg) return
    const matchGroup = groupedMenu.find(g => g.items.some(i => i.path === seg))
    if (matchGroup && !openGroups[matchGroup.label]) {
      setOpenGroups(prev => ({ ...prev, [matchGroup.label]: true }))
    }
  }, [location.pathname])

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  // Build full href for a group main path including current branch
  const buildGroupHref = (mainPath) => {
    if (!currentBranch || !mainPath) return '#'
    return `/${mainPath}/branch/${currentBranch.id}`
  }

  const handleNavigation = (path) => {
    setIsOpen(false)
    
      // Use branch management for other paths
      navigateWithBranch(path)
    
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
            className="sidebar fixed top-0 left-0 z-40 w-64 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl overflow-y-auto no-scrollbar border-r border-slate-700/40 backdrop-blur"
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="relative p-6 pt-16 lg:pt-6">
              <div
                className="text-2xl font-bold text-center mb-4 text-white cursor-pointer tracking-wide"
                onClick={() => {
                  navigate(`/branch/${currentBranch.id}`)
                  setIsOpen(false)
                }}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300 drop-shadow-sm">Aama Ko Nana</span>
              </div>
              {/* Centered Expand / Collapse All control */}
              <div className="flex justify-center mb-3">
                <div className="flex items-center text-[10px] font-medium uppercase tracking-wide rounded-full overflow-hidden border border-slate-600/60 bg-slate-800/70 backdrop-blur-sm shadow-inner shadow-slate-900/50">
                  <button
                    aria-label="Expand all groups"
                    onClick={() => setOpenGroups(Object.fromEntries(Object.keys(openGroups).map(k => [k, true])))}
                    className="px-3 py-1 flex items-center gap-1 text-slate-300 hover:bg-slate-700/70 hover:text-white transition"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                    Open
                  </button>
                  <span className="w-px h-4 bg-slate-600/60" />
                  <button
                    aria-label="Collapse all groups"
                    onClick={() => setOpenGroups(Object.fromEntries(Object.keys(openGroups).map(k => [k, false])))}
                    className="px-3 py-1 flex items-center gap-1 text-slate-400 hover:bg-slate-700/70 hover:text-white transition"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,0.7)]"></span>
                    Close
                  </button>
                </div>
              </div>
              
              {/* Enhanced Branch Selector */}
              {currentBranch && (
                <div className="mb-4">
                  <div className="flex items-center space-x-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow-inner">
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
              
              <nav className="space-y-3 mt-2">
                {groupedMenu.map(group => {
                  const isGroupOpen = openGroups[group.label]
                  return (
                    <div key={group.label} className="group border border-slate-700/50 rounded-xl overflow-hidden bg-slate-800/40 backdrop-blur-sm shadow-md shadow-slate-900/40 transition hover:border-slate-500/60">
                      <div className="w-full flex items-center justify-between pr-2 bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 text-sm font-medium transition relative">
                        <a
                          href={buildGroupHref(group.mainPath || group.items[0]?.path)}
                          onClick={(e) => {
                            if (!currentBranch) { e.preventDefault(); return }
                            // Regular click -> client navigation
                            if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
                              e.preventDefault()
                              const navPath = group.mainPath || group.items[0]?.path
                              if (navPath) handleNavigation(navPath)
                            }
                          }}
                          className={`flex items-center gap-2 flex-1 px-4 py-2 ${currentBranch ? 'cursor-pointer' : 'opacity-60 pointer-events-none'} select-none`}
                        >
                          <span className="relative flex items-center justify-center h-6 w-6 rounded-md bg-slate-700/60 group-hover:bg-slate-600/70 transition">
                            <group.icon className="h-4 w-4 text-indigo-300" />
                          </span>
                          <span>{group.label}</span>
                        </a>
                        <button
                          aria-label={`Toggle ${group.label}`}
                          onClick={(e) => { e.stopPropagation(); toggleGroup(group.label) }}
                          className="ml-1 p-1 rounded-md hover:bg-slate-600/60 transition"
                        >
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isGroupOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <span className={`pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-400 via-fuchsia-400 to-pink-400 opacity-0 group-hover:opacity-70 transition ${isGroupOpen ? 'opacity-70' : ''}`}></span>
                      </div>
                      <AnimatePresence initial={false}>
                        {isGroupOpen && (
                          <motion.ul
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col bg-slate-800/40"
                          >
                            {group.items.map(item => {
                              const isExternalReport = item.externalReport
                              // Determine active state by comparing current pathname core segment
                              let active = false
                              if (!isExternalReport) {
                                const segs = location.pathname.split('/').filter(Boolean)
                                const first = segs[0]
                                const second = segs[1]
                                // Multi-part path (e.g., purchases/form)
                                if (item.path.includes('/')) {
                                  const parts = item.path.split('/')
                                  if (parts[0] === first && parts[1] === second) active = true
                                } else {
                                  // Single segment item should NOT be active on a form sub-route
                                  if (first === item.path && second !== 'form') active = true
                                }
                              }
                              if (isExternalReport) {
                                const fullPath = currentBranch ? `/${item.path}/branch/${currentBranch.id}` : '#'
                                return (
                                  <li key={item.path} className="border-t border-slate-700/30">
                                    <a
                                      href={fullPath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`block px-6 py-2 text-slate-300 text-xs tracking-wide hover:bg-slate-700/70 hover:text-white transition ${!currentBranch ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <item.icon className="h-3.5 w-3.5 text-fuchsia-300" />
                                        <span>{item.title}</span>
                                        <span className="ml-auto text-[9px] uppercase tracking-wide bg-gradient-to-r from-fuchsia-500/30 to-pink-500/30 text-pink-200 px-1.5 py-0.5 rounded-full border border-pink-400/30 shadow-inner">Report</span>
                                      </div>
                                    </a>
                                  </li>
                                )
                              }
                              const fullPath = item.path === '/mobile' ? '/mobile' : (currentBranch ? `/${item.path}/branch/${currentBranch.id}` : '#')
                              return (
                                <li key={item.path} className="border-t border-slate-700/30 relative">
                                  <a
                                    href={fullPath}
                                    className={`block px-6 py-2 text-slate-300 text-xs tracking-wide hover:bg-slate-700/70 hover:text-white transition group/item ${active ? 'bg-slate-700/80 text-white shadow-inner' : ''} ${!currentBranch && item.path !== '/mobile' ? 'opacity-50 pointer-events-none' : ''}`}
                                    onClick={(e) => {
                                      if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
                                        e.preventDefault()
                                        handleNavigation(item.path)
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <item.icon className={`h-3.5 w-3.5 ${active ? 'text-indigo-300' : 'text-indigo-200 group-hover/item:text-indigo-300'} transition`} />
                                      <span className="truncate">{item.title}</span>
                                      {active && <span className="ml-auto h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 animate-pulse" />}
                                    </div>
                                  </a>
                                  {active && <span className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-indigo-400 via-fuchsia-400 to-pink-400" />}
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
