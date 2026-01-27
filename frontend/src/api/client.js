/**
 * API client for the JIRA Worklog Dashboard backend.
 */

const API_BASE = '/api'

/**
 * Format a date for API requests
 */
function formatDate(date) {
    return date.toISOString().split('T')[0]
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin)

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value)
        }
    })

    const response = await fetch(url)

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
}

// ============ Dashboard API ============

export async function getDashboard(startDate, endDate, jiraInstance = null) {
    return fetchApi('/dashboard', {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        jira_instance: jiraInstance
    })
}

// ============ Teams API ============

export async function getTeams() {
    return fetchApi('/teams')
}

export async function getTeamDetail(teamName, startDate, endDate, jiraInstance = null) {
    return fetchApi(`/teams/${encodeURIComponent(teamName)}`, {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        jira_instance: jiraInstance
    })
}

// ============ Users API ============

export async function getUsers() {
    return fetchApi('/users')
}

export async function getUserDetail(email, startDate, endDate, jiraInstance = null) {
    return fetchApi(`/users/${encodeURIComponent(email)}`, {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        jira_instance: jiraInstance
    })
}

// ============ Epics API ============

export async function getEpics(startDate, endDate, jiraInstance = null) {
    return fetchApi('/epics', {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        jira_instance: jiraInstance
    })
}

export async function getEpicDetail(epicKey, startDate, endDate, jiraInstance = null) {
    return fetchApi(`/epics/${encodeURIComponent(epicKey)}`, {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        jira_instance: jiraInstance
    })
}

// ============ Config & Health API ============

export async function getConfig() {
    return fetchApi('/config')
}

export async function getHealth() {
    return fetchApi('/health')
}

export async function clearCache() {
    const response = await fetch(`${API_BASE}/cache/clear`, { method: 'POST' })
    return response.json()
}

// ============ Sync API ============

export async function getSyncDefaults() {
    return fetchApi('/sync/defaults')
}

export async function getSyncStatus() {
    return fetchApi('/sync/status')
}

export async function getSyncHistory(limit = 20) {
    return fetchApi('/sync/history', { limit })
}

export async function syncWorklogs(startDate, endDate, jiraInstances = null) {
    const response = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            jira_instances: jiraInstances
        })
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Sync Error: ${response.status}`)
    }

    return response.json()
}

// ============ Settings API - Helper functions ============

async function fetchApiPost(endpoint, data = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
}

async function fetchApiPut(endpoint, data = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
}

async function fetchApiDelete(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE'
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
}

// ============ Settings API - Teams ============

export async function getSettingsTeams() {
    return fetchApi('/settings/teams')
}

export async function createTeam(name) {
    return fetchApiPost('/settings/teams', { name })
}

export async function updateTeam(teamId, data) {
    return fetchApiPut(`/settings/teams/${teamId}`, data)
}

export async function deleteTeam(teamId) {
    return fetchApiDelete(`/settings/teams/${teamId}`)
}

// ============ Settings API - Users ============

export async function getSettingsUsers() {
    return fetchApi('/settings/users')
}

export async function createUser(data) {
    return fetchApiPost('/settings/users', data)
}

export async function updateUser(userId, data) {
    return fetchApiPut(`/settings/users/${userId}`, data)
}

export async function deleteUser(userId) {
    return fetchApiDelete(`/settings/users/${userId}`)
}

// ============ Settings API - JIRA Accounts ============

export async function fetchJiraAccountId(userId, jiraInstance) {
    return fetchApiPost(`/settings/users/${userId}/fetch-account/${encodeURIComponent(jiraInstance)}`, {})
}

export async function deleteJiraAccount(userId, jiraInstance) {
    return fetchApiDelete(`/settings/users/${userId}/jira-accounts/${encodeURIComponent(jiraInstance)}`)
}

// ============ Settings API - Import ============

export async function importConfigToDatabase() {
    return fetchApiPost('/settings/import-config', {})
}

export async function getJiraInstances() {
    return fetchApi('/settings/jira-instances')
}

// ============ Logs API ============

export async function getLogs(params = {}) {
    return fetchApi('/logs', {
        page: params.page || 1,
        page_size: params.pageSize || 50,
        level: params.level,
        start_date: params.startDate,
        end_date: params.endDate,
        endpoint: params.endpoint,
        request_id: params.requestId
    })
}

export async function getLogStats() {
    return fetchApi('/logs/stats')
}

export async function downloadLogs(format = 'json', filters = {}) {
    const url = new URL(`${API_BASE}/logs/download`, window.location.origin)
    url.searchParams.set('format', format)

    if (filters.level) url.searchParams.set('level', filters.level)
    if (filters.startDate) url.searchParams.set('start_date', filters.startDate)
    if (filters.endDate) url.searchParams.set('end_date', filters.endDate)
    if (filters.endpoint) url.searchParams.set('endpoint', filters.endpoint)

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
    }

    const blob = await response.blob()
    const contentDisposition = response.headers.get('Content-Disposition')
    const filename = contentDisposition?.match(/filename=(.+)/)?.[1] || `logs.${format}`

    // Trigger download
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

export async function deleteOldLogs(beforeDays = 30) {
    return fetchApiDelete(`/logs?before_days=${beforeDays}`)
}

// ============ Issues API ============

export async function getIssueDetail(issueKey, startDate, endDate) {
    const params = {}
    if (startDate) params.start_date = formatDate(startDate)
    if (endDate) params.end_date = formatDate(endDate)
    return fetchApi(`/issues/${encodeURIComponent(issueKey)}`, params)
}

export async function syncIssueWorklogs(issueKey) {
    return fetchApiPost(`/issues/${encodeURIComponent(issueKey)}/sync`, {})
}
