import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { subDays, startOfMonth } from 'date-fns'
import NewLayout from './components/NewLayout'
import ProtectedRoute from './components/ProtectedRoute'
import NewDashboard from './pages/NewDashboard'
import Worklogs from './pages/Worklogs'
import NewTeams from './pages/NewTeams'
import NewBilling from './pages/NewBilling'
import TeamView from './pages/TeamView'
import TeamsListView from './pages/TeamsListView'
import UserView from './pages/UserView'
import EpicView from './pages/EpicView'
import IssueView from './pages/IssueView'
import Settings from './pages/Settings'
import UsersListView from './pages/UsersListView'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'

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
            {/* Public landing page */}
            <Route path="/" element={<Landing />} />

            {/* Auth routes - standalone without Layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Protected app routes - wrapped in Layout and protected */}
            <Route path="/app/*" element={
                <ProtectedRoute>
                    <NewLayout
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        selectedInstance={selectedInstance}
                        setSelectedInstance={setSelectedInstance}
                    >
                        <Routes>
                            <Route path="dashboard" element={<NewDashboard dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="worklogs" element={<Worklogs dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="teams" element={<NewTeams dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="teams/:teamName" element={<TeamView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="users" element={<UsersListView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="users/:email" element={<UserView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="epics" element={<EpicView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="epics/:epicKey" element={<EpicView dateRange={dateRange} selectedInstance={selectedInstance} />} />
                            <Route path="issues/:issueKey" element={<IssueView dateRange={dateRange} />} />
                            <Route path="billing/*" element={<NewBilling dateRange={dateRange} />} />
                            <Route path="settings" element={<Settings />} />
                            <Route path="profile" element={<Profile />} />

                            {/* Default redirect to dashboard */}
                            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
                        </Routes>
                    </NewLayout>
                </ProtectedRoute>
            } />

            {/* Catch-all redirect to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App

