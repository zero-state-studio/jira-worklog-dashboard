import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import { format, subDays, startOfMonth, startOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { getConfig, getEpics } from '../api/client'
import SyncModal from './SyncModal'
import 'react-datepicker/dist/react-datepicker.css'

// Icons as SVG components
const DashboardIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
)

const TeamIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
)

const EpicIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
)

const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
)

const RefreshIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
)

const SettingsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
)

// Date range presets
const datePresets = [
    { label: 'Questa settimana', getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: new Date() }) },
    { label: 'Questo mese', getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
    { label: 'Ultimi 7 giorni', getRange: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
    { label: 'Ultimi 30 giorni', getRange: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
]

// Icons for initiative types
const ProjectIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
)

export default function Layout({ children, dateRange, setDateRange, selectedInstance, setSelectedInstance }) {
    const [config, setConfig] = useState(null)
    const [epics, setEpics] = useState([])
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [datePickerOpen, setDatePickerOpen] = useState(false)
    const [syncModalOpen, setSyncModalOpen] = useState(false)

    useEffect(() => {
        getConfig().then(setConfig).catch(console.error)
    }, [])

    // Fetch epics when date range changes
    useEffect(() => {
        if (dateRange.startDate && dateRange.endDate) {
            getEpics(dateRange.startDate, dateRange.endDate, selectedInstance)
                .then(data => setEpics(data.epics || []))
                .catch(err => console.error('Error fetching epics:', err))
        }
    }, [dateRange.startDate, dateRange.endDate, selectedInstance])

    // Group epics by parent_type
    const epicsByType = epics.reduce((acc, epic) => {
        const type = epic.parent_type || 'Other'
        if (!acc[type]) acc[type] = []
        acc[type].push(epic)
        return acc
    }, {})

    const handleDateChange = (dates) => {
        const [start, end] = dates
        setDateRange({ startDate: start, endDate: end || start })
        if (start && end) {
            setDatePickerOpen(false)
        }
    }

    const applyPreset = (preset) => {
        const { start, end } = preset.getRange()
        setDateRange({ startDate: start, endDate: end })
        setDatePickerOpen(false)
    }

    return (
        <div className="min-h-screen bg-dark-900 flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-dark-800 border-r border-dark-700 flex flex-col transition-all duration-300`}>
                {/* Logo */}
                <div className="p-4 border-b border-dark-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        {sidebarOpen && (
                            <div className="animate-fade-in">
                                <h1 className="font-bold text-dark-100">Worklog</h1>
                                <p className="text-xs text-dark-400">Dashboard</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `nav-link ${isActive ? 'nav-link-active' : ''}`
                        }
                    >
                        <DashboardIcon />
                        {sidebarOpen && <span>Dashboard</span>}
                    </NavLink>

                    {/* Teams Section */}
                    {config?.teams && config.teams.length > 0 && sidebarOpen && (
                        <div className="pt-4">
                            <p className="px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Teams</p>
                            {config.teams.map((team) => (
                                <NavLink
                                    key={team.name}
                                    to={`/teams/${encodeURIComponent(team.name)}`}
                                    className={({ isActive }) =>
                                        `nav-link ${isActive ? 'nav-link-active' : ''}`
                                    }
                                >
                                    <TeamIcon />
                                    <span className="truncate">{team.name}</span>
                                    <span className="ml-auto text-xs text-dark-500">{team.member_count}</span>
                                </NavLink>
                            ))}
                        </div>
                    )}

                    {/* Iniziative Section */}
                    <div className="pt-4">
                        {sidebarOpen && <p className="px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Iniziative</p>}

                        {/* Projects Link */}
                        {epicsByType['Project'] && epicsByType['Project'].length > 0 && (
                            <NavLink
                                to="/epics?type=Project"
                                className={({ isActive }) =>
                                    `nav-link ${isActive && window.location.search.includes('type=Project') ? 'nav-link-active' : ''}`
                                }
                            >
                                <ProjectIcon />
                                {sidebarOpen && (
                                    <>
                                        <span>Projects</span>
                                        <span className="ml-auto text-xs text-dark-500">{epicsByType['Project'].length}</span>
                                    </>
                                )}
                            </NavLink>
                        )}

                        {/* Epics Link */}
                        {epicsByType['Epic'] && epicsByType['Epic'].length > 0 && (
                            <NavLink
                                to="/epics?type=Epic"
                                className={({ isActive }) =>
                                    `nav-link ${isActive && window.location.search.includes('type=Epic') ? 'nav-link-active' : ''}`
                                }
                            >
                                <EpicIcon />
                                {sidebarOpen && (
                                    <>
                                        <span>Epics</span>
                                        <span className="ml-auto text-xs text-dark-500">{epicsByType['Epic'].length}</span>
                                    </>
                                )}
                            </NavLink>
                        )}

                        {/* All Initiatives Link */}
                        <NavLink
                            to="/epics"
                            className={({ isActive }) =>
                                `nav-link ${isActive && !window.location.search.includes('type=') ? 'nav-link-active' : ''}`
                            }
                        >
                            <EpicIcon />
                            {sidebarOpen && <span>Tutte</span>}
                        </NavLink>
                    </div>

                    {/* Settings Link */}
                    <div className="pt-4">
                        {sidebarOpen && <p className="px-4 text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">Configurazione</p>}
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'nav-link-active' : ''}`
                            }
                        >
                            <SettingsIcon />
                            {sidebarOpen && <span>Impostazioni</span>}
                        </NavLink>
                    </div>
                </nav>

                {/* Demo Mode Badge */}
                {config?.demo_mode && sidebarOpen && (
                    <div className="p-4 border-t border-dark-700">
                        <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-lg p-3">
                            <p className="text-accent-orange text-xs font-medium">Modalità Demo</p>
                            <p className="text-dark-400 text-xs mt-1">Dati di esempio</p>
                        </div>
                    </div>
                )}

                {/* Collapse Button */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-4 border-t border-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
                >
                    <svg className={`w-5 h-5 mx-auto transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                </button>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-dark-800/50 backdrop-blur-xl border-b border-dark-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Date Range Picker */}
                        <div className="relative">
                            <button
                                onClick={() => setDatePickerOpen(!datePickerOpen)}
                                className="flex items-center gap-3 glass-card px-4 py-2.5 hover:bg-dark-700/50 transition-colors"
                            >
                                <CalendarIcon />
                                <span className="text-dark-200">
                                    {format(dateRange.startDate, 'd MMM', { locale: it })} - {format(dateRange.endDate, 'd MMM yyyy', { locale: it })}
                                </span>
                            </button>

                            {datePickerOpen && (
                                <div className="absolute top-full left-0 mt-2 z-50 bg-dark-800 border border-dark-600 rounded-xl shadow-xl p-4 animate-slide-up">
                                    {/* Presets */}
                                    <div className="flex gap-2 mb-4 flex-wrap">
                                        {datePresets.map((preset) => (
                                            <button
                                                key={preset.label}
                                                onClick={() => applyPreset(preset)}
                                                className="px-3 py-1.5 text-xs font-medium text-dark-300 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>

                                    <DatePicker
                                        selected={dateRange.startDate}
                                        onChange={handleDateChange}
                                        startDate={dateRange.startDate}
                                        endDate={dateRange.endDate}
                                        selectsRange
                                        inline
                                        locale={it}
                                        maxDate={new Date()}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Center: JIRA Instance Tabs */}
                        {config?.jira_instances && config.jira_instances.length > 1 && (
                            <div className="flex items-center gap-1 bg-dark-800 rounded-xl p-1 border border-dark-600">
                                {/* All Instances tab */}
                                <button
                                    onClick={() => setSelectedInstance(null)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedInstance === null
                                        ? 'bg-gradient-primary text-white shadow-glow'
                                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700'
                                        }`}
                                >
                                    Tutti
                                </button>
                                {/* Individual instance tabs */}
                                {config.jira_instances.map((inst, index) => (
                                    <button
                                        key={inst.name}
                                        onClick={() => setSelectedInstance(inst.name)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedInstance === inst.name
                                            ? index === 0
                                                ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-glow'
                                                : 'bg-gradient-to-r from-accent-green to-emerald-600 text-white shadow-glow-green'
                                            : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700'
                                            }`}
                                    >
                                        {inst.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Right side actions */}
                        <div className="flex items-center gap-3">
                            {/* Current instance indicator (when only one) */}
                            {config?.jira_instances && config.jira_instances.length === 1 && (
                                <div className="badge-blue">
                                    {config.jira_instances[0].name}
                                </div>
                            )}

                            {/* Sync button */}
                            <button
                                onClick={() => setSyncModalOpen(true)}
                                className="btn-secondary flex items-center gap-2 border-accent-purple/50 hover:border-accent-purple text-accent-purple hover:bg-accent-purple/10"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span className="hidden sm:inline">Sincronizza</span>
                            </button>

                            {/* Refresh button */}
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <RefreshIcon />
                                <span className="hidden sm:inline">Aggiorna</span>
                            </button>
                        </div>
                    </div>

                    {/* Instance context banner when filtered */}
                    {selectedInstance && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                            <span className="text-dark-400">Visualizzando dati di:</span>
                            <span className="font-medium text-accent-blue">{selectedInstance}</span>
                            <button
                                onClick={() => setSelectedInstance(null)}
                                className="ml-2 text-dark-500 hover:text-dark-300 transition-colors"
                            >
                                (mostra tutti)
                            </button>
                        </div>
                    )}
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>

            {/* Click outside to close date picker */}
            {datePickerOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDatePickerOpen(false)}
                />
            )}

            {/* Sync Modal */}
            <SyncModal
                isOpen={syncModalOpen}
                onClose={() => setSyncModalOpen(false)}
                onSyncComplete={() => window.location.reload()}
            />
        </div>
    )
}
