import { useState, useEffect, useCallback } from 'react'
import { getSettingsTeams, getSettingsUsers, getJiraInstances, getComplementaryGroups, importConfigToDatabase } from '../api/client'
import TeamsSection from '../components/settings/TeamsSection'
import UsersSection from '../components/settings/UsersSection'
import LogsSection from '../components/settings/LogsSection'
import JiraInstancesSection from '../components/settings/JiraInstancesSection'

const SettingsIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
)

const ImportIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)

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

    const handleImport = async () => {
        try {
            setImporting(true)
            setImportResult(null)
            const result = await importConfigToDatabase()
            setImportResult(result)
            // Reload data
            await loadData()
        } catch (err) {
            setError(err.message)
        } finally {
            setImporting(false)
        }
    }

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

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                        <SettingsIcon />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-dark-100">Impostazioni</h1>
                        <p className="text-dark-400 text-sm">Gestisci team e utenti</p>
                    </div>
                </div>

                <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-700 text-dark-200 border border-dark-600 rounded-lg hover:bg-dark-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {importing ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-200"></div>
                            Importazione...
                        </>
                    ) : (
                        <>
                            <ImportIcon />
                            Importa da Config
                        </>
                    )}
                </button>
            </div>

            {/* Import Result */}
            {importResult && (
                <div className="mb-6 bg-accent-green/10 border border-accent-green/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-accent-green font-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Importazione completata: {importResult.jira_instances_created || 0} istanze JIRA, {importResult.teams_created} team e {importResult.users_created} utenti creati
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-4 text-red-300 hover:text-red-200 underline"
                    >
                        Chiudi
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <button
                    onClick={() => setActiveTab('jira')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                        activeTab === 'jira'
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100'
                    }`}
                >
                    JIRA ({jiraInstances.length})
                </button>
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                        activeTab === 'teams'
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100'
                    }`}
                >
                    Team ({teams.length})
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                        activeTab === 'users'
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100'
                    }`}
                >
                    Utenti ({users.length})
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                        activeTab === 'logs'
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100'
                    }`}
                >
                    Log Applicazione
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                </div>
            ) : (
                <>
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
                    {activeTab === 'logs' && (
                        <LogsSection />
                    )}
                </>
            )}
        </div>
    )
}
