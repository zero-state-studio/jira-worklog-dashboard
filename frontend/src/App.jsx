import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { subDays, startOfMonth } from 'date-fns'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TeamView from './pages/TeamView'
import UserView from './pages/UserView'
import EpicView from './pages/EpicView'
import IssueView from './pages/IssueView'
import Settings from './pages/Settings'
import UsersListView from './pages/UsersListView'
import Billing from './pages/Billing'

function App() {
    // Global date range state
    const [dateRange, setDateRange] = useState({
        startDate: startOfMonth(new Date()),
        endDate: new Date()
    })

    // Selected JIRA instance (null = all instances combined)
    const [selectedInstance, setSelectedInstance] = useState(null)

    return (
        <Layout
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedInstance={selectedInstance}
            setSelectedInstance={setSelectedInstance}
        >
            <Routes>
                <Route path="/" element={<Dashboard dateRange={dateRange} selectedInstance={selectedInstance} />} />
                <Route path="/teams" element={<Navigate to="/" replace />} />
                <Route path="/teams/:teamName" element={<TeamView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                <Route path="/users" element={<UsersListView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                <Route path="/users/:email" element={<UserView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                <Route path="/epics" element={<EpicView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                <Route path="/epics/:epicKey" element={<EpicView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                <Route path="/issues/:issueKey" element={<IssueView dateRange={dateRange} />} />
                <Route path="/billing" element={<Billing dateRange={dateRange} />} />
                <Route path="/settings" element={<Settings />} />
            </Routes>
        </Layout>
    )
}

export default App

