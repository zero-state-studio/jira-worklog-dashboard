import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { subDays, startOfMonth } from 'date-fns'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import TeamView from './pages/TeamView'
import TeamsListView from './pages/TeamsListView'
import UserView from './pages/UserView'
import EpicView from './pages/EpicView'
import IssueView from './pages/IssueView'
import Settings from './pages/Settings'
import UsersListView from './pages/UsersListView'
import Billing from './pages/Billing'
import Login from './pages/Login'

function App() {
    // Global date range state
    const [dateRange, setDateRange] = useState({
        startDate: startOfMonth(new Date()),
        endDate: new Date()
    })

    // Selected JIRA instance (null = all instances combined)
    const [selectedInstance, setSelectedInstance] = useState(null)

    return (
        <Routes>
            {/* Auth route - standalone without Layout */}
            <Route path="/login" element={<Login />} />

            {/* App routes - wrapped in Layout and protected */}
            <Route path="/*" element={
                <ProtectedRoute>
                    <Layout
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        selectedInstance={selectedInstance}
                        setSelectedInstance={setSelectedInstance}
                    >
                        <Routes>
                            <Route path="/" element={<Dashboard dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="/teams" element={<TeamsListView dateRange={dateRange} selectedInstance={selectedInstance} />} />
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
                </ProtectedRoute>
            } />
        </Routes>
    )
}

export default App

