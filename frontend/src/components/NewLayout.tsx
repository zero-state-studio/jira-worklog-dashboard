import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Clock,
  Users,
  RefreshCw,
  DollarSign,
  FileText,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getConfig } from '../api/client'

interface LayoutProps {
  children: React.ReactNode
  dateRange: {
    startDate: Date
    endDate: Date
  }
  setDateRange: (range: { startDate: Date; endDate: Date }) => void
  selectedInstance: string | null
  setSelectedInstance: (instance: string | null) => void
}

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
}

interface NavSection {
  title: string
  items: NavItem[]
}

export default function NewLayout({
  children,
  dateRange,
  setDateRange,
  selectedInstance,
  setSelectedInstance,
}: LayoutProps) {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    getConfig().then(setConfig).catch(console.error)
  }, [])

  // Navigation structure
  const navSections: NavSection[] = [
    {
      title: 'WORKSPACE',
      items: [
        { path: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { path: '/app/worklogs', label: 'Worklogs', icon: <Clock size={16} /> },
        { path: '/app/teams', label: 'Teams', icon: <Users size={16} /> },
        { path: '/app/sync', label: 'Sync', icon: <RefreshCw size={16} /> },
      ],
    },
    {
      title: 'BILLING',
      items: [
        { path: '/app/billing/clients', label: 'Clients', icon: <Users size={16} /> },
        { path: '/app/billing/projects', label: 'Projects', icon: <FileText size={16} /> },
        { path: '/app/billing/invoices', label: 'Invoices', icon: <Receipt size={16} /> },
        { path: '/app/billing/rates', label: 'Rates', icon: <DollarSign size={16} /> },
      ],
    },
    {
      title: 'SYSTEM',
      items: [{ path: '/app/settings', label: 'Settings', icon: <Settings size={16} /> }],
    },
  ]

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs = pathSegments.map((segment, index) => {
      const path = `/${pathSegments.slice(0, index + 1).join('/')}`
      const label = segment.charAt(0).toUpperCase() + segment.slice(1)
      return { path, label }
    })
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // User info (mock - replace with actual user data)
  const user = {
    name: config?.user?.name || 'User',
    email: config?.user?.email || 'user@example.com',
    role: config?.user?.role || 'Admin',
    initials: 'U',
  }

  return (
    <div className="h-screen flex bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-[48px]' : 'w-[220px]'
        } bg-surface border-r border-solid flex flex-col transition-all duration-200`}
      >
        {/* Logo & Toggle */}
        <div className="h-[48px] flex items-center justify-between px-3 border-b border-solid">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
                <Clock size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-primary">Worklog</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 hover:bg-surface-hover rounded transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={16} className="text-secondary" />
            ) : (
              <ChevronLeft size={16} className="text-secondary" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              {!sidebarCollapsed && (
                <div className="px-2 mb-2">
                  <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">
                    {section.title}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-surface-active text-accent font-medium'
                          : 'text-secondary hover:bg-surface-hover hover:text-primary'
                      }`
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="border-t border-solid p-3">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-surface-hover transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-white">{user.initials}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 text-left overflow-hidden">
                <div className="text-sm font-medium text-primary truncate">{user.name}</div>
                <div className="text-xs text-tertiary truncate">{user.role}</div>
              </div>
            )}
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div className="absolute bottom-16 left-3 bg-surface border border-solid rounded-md shadow-md py-1 min-w-[180px]">
              <NavLink
                to="/app/profile"
                className="block px-3 py-2 text-sm text-primary hover:bg-surface-hover transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Profile
              </NavLink>
              <button
                onClick={() => {
                  // Logout logic here
                  window.location.href = '/login'
                }}
                className="w-full text-left px-3 py-2 text-sm text-error hover:bg-surface-hover transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-[48px] bg-surface border-b border-solid flex items-center justify-between px-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <span className="text-tertiary">/</span>}
                <NavLink
                  to={crumb.path}
                  className={
                    index === breadcrumbs.length - 1
                      ? 'text-primary font-semibold'
                      : 'text-secondary hover:text-primary transition-colors'
                  }
                >
                  {crumb.label}
                </NavLink>
              </React.Fragment>
            ))}
          </div>

          {/* Page Actions Slot */}
          <div className="flex items-center gap-3">
            {/* This slot can be filled by pages via context or props */}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-bg">{children}</main>
      </div>
    </div>
  )
}
