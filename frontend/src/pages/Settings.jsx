import { useState, useEffect, useCallback } from 'react'
import { getSettingsTeams, getSettingsUsers, getJiraInstances, getComplementaryGroups } from '../api/client'
import TeamsSection from '../components/settings/TeamsSection'
import UsersSection from '../components/settings/UsersSection'
import LogsSection from '../components/settings/LogsSection'
import JiraInstancesSection from '../components/settings/JiraInstancesSection'
import PackageTemplatesSection from '../components/settings/PackageTemplatesSection'
import HolidaysSection from '../components/settings/HolidaysSection'
import FactorialSection from '../components/settings/FactorialSection'
import DatabaseSection from '../components/settings/DatabaseSection'

const CatIconSystem = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
)

const CatIconOrganization = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
)

const CatIconIntegration = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
)

const CatIconConfig = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
)

const SettingsIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/>
    </svg>
)

export default function Settings() {
    const [activeTab, setActiveTab] = useState('jira')
    const [teams, setTeams] = useState([])
    const [users, setUsers] = useState([])
    const [jiraInstances, setJiraInstances] = useState([])
    const [complementaryGroups, setComplementaryGroups] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [teamsData, usersData, instancesData, groupsData] = await Promise.all([
                getSettingsTeams(),
                getSettingsUsers(),
                getJiraInstances(),
                getComplementaryGroups()
            ])

            setTeams(teamsData)
            setUsers(usersData)
            setJiraInstances(instancesData.instances || [])
            setComplementaryGroups(groupsData.groups || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleTeamsChange = async () => {
        const teamsData = await getSettingsTeams()
        setTeams(teamsData)
    }

    const handleUsersChange = async () => {
        const usersData = await getSettingsUsers()
        setUsers(usersData)
    }

    const handleJiraDataChange = async () => {
        const [instancesData, groupsData] = await Promise.all([
            getJiraInstances(),
            getComplementaryGroups()
        ])
        setJiraInstances(instancesData.instances || [])
        setComplementaryGroups(groupsData.groups || [])
    }

    // Navigation configuration
    const navigation = [
        {
            category: 'Generale',
            icon: CatIconIntegration,
            items: [
                { id: 'jira', label: 'Integrazioni JIRA', count: jiraInstances.length },
                { id: 'factorial', label: 'Integrazione Factorial' }
            ]
        },
        {
            category: 'Organizzazione',
            icon: CatIconOrganization,
            items: [
                { id: 'teams', label: 'Gestione Team', count: teams.length },
                { id: 'users', label: 'Gestione Utenti', count: users.length }
            ]
        },
        {
            category: 'Configurazione',
            icon: CatIconConfig,
            items: [
                { id: 'packages', label: 'Pacchetti Ore' },
                { id: 'holidays', label: 'Giorni Festivi' }
            ]
        },
        {
            category: 'Sistema',
            icon: CatIconSystem,
            items: [
                { id: 'database', label: 'Gestione Database' },
                { id: 'logs', label: 'Log Applicazione' }
            ]
        }
    ]

    return (
        <div className="animate-fade-in h-[calc(100vh-2rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                        <SettingsIcon />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-dark-100">Impostazioni</h1>
                        <p className="text-dark-400 text-sm">Gestisci le configurazioni globali</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex-shrink-0 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200 underline">
                        Chiudi
                    </button>
                </div>
            )}

            {/* Main Layout */}
            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-64 flex-shrink-0 overflow-y-auto pr-2">
                    <div className="space-y-6">
                        {navigation.map((section) => (
                            <div key={section.category}>
                                <div className="flex items-center gap-2 mb-2 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                                    <section.icon />
                                    {section.category}
                                </div>
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === item.id
                                                ? 'bg-gradient-primary text-white shadow-sm'
                                                : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
                                                }`}
                                        >
                                            <span>{item.label}</span>
                                            {item.count !== undefined && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === item.id
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-dark-800 text-dark-400'
                                                    }`}>
                                                    {item.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-dark-900/50 rounded-2xl border border-dark-800/50 p-6 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                        </div>
                    ) : (
                        <div className="max-w-4xl">
                            {activeTab === 'jira' && (
                                <JiraInstancesSection
                                    instances={jiraInstances}
                                    complementaryGroups={complementaryGroups}
                                    onDataChange={handleJiraDataChange}
                                />
                            )}
                            {activeTab === 'teams' && (
                                <TeamsSection
                                    teams={teams}
                                    onTeamsChange={handleTeamsChange}
                                />
                            )}
                            {activeTab === 'users' && (
                                <UsersSection
                                    users={users}
                                    teams={teams}
                                    jiraInstances={jiraInstances}
                                    onUsersChange={handleUsersChange}
                                />
                            )}
                            {activeTab === 'packages' && (
                                <PackageTemplatesSection />
                            )}
                            {activeTab === 'holidays' && (
                                <HolidaysSection />
                            )}
                            {activeTab === 'database' && (
                                <DatabaseSection />
                            )}
                            {activeTab === 'logs' && (
                                <LogsSection />
                            )}
                            {activeTab === 'factorial' && (
                                <FactorialSection />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
