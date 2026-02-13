/**
 * API client for the JIRA Worklog Dashboard backend.
 * Supports both web (via Vite proxy) and desktop (Tauri) modes.
 */

// Detect if running in Tauri desktop environment
const isTauri = () => typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined

// In Tauri, connect directly to the backend; in web, use Vite proxy
const API_BASE = isTauri() ? 'http://localhost:8000/api' : '/api'

/**
 * Get access token from localStorage
 */
function getAccessToken() {
    return localStorage.getItem('access_token')
}

/**
 * Handle authentication errors by clearing tokens and redirecting to login
 */
function handleAuthError() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
}

/**
 * Format a date for API requests
 */
function formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

/**
 * Build the full API URL, handling both web and Tauri contexts
 */
function buildApiUrl(endpoint) {
    if (isTauri()) {
        return `${API_BASE}${endpoint}`
    }
    return `${API_BASE}${endpoint}`
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(endpoint, params = {}) {
    const baseUrl = buildApiUrl(endpoint)
    const url = new URL(baseUrl, isTauri() ? undefined : window.location.origin)

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value)
        }
    })

    const token = getAccessToken()
    const headers = {}
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, { headers })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error('[API Error]', {
            status: response.status,
            url: url.toString(),
            error: error,
            detail: error.detail
        })
        throw new Error(error.detail || JSON.stringify(error) || `API Error: ${response.status}`)
    }

    return response.json()
}

// ============ Worklogs API ============

export async function getWorklogs(params = {}) {
    const {
        startDate,
        endDate,
        author,
        jiraInstance,
        page = 1,
        pageSize = 50
    } = params

    console.log('[getWorklogs] Input params:', { startDate, endDate, author, jiraInstance, page, pageSize })

    if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required')
    }

    const formattedStartDate = formatDate(startDate)
    const formattedEndDate = formatDate(endDate)

    console.log('[getWorklogs] Formatted dates:', { formattedStartDate, formattedEndDate })

    return fetchApi('/worklogs', {
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        author: author || undefined,
        jira_instance: jiraInstance || undefined,
        page,
        page_size: pageSize
    })
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

export async function getUsers(startDate = null, endDate = null, jiraInstance = null) {
    const params = {}
    if (startDate) params.start_date = formatDate(startDate)
    if (endDate) params.end_date = formatDate(endDate)
    if (jiraInstance) params.jira_instance = jiraInstance
    return fetchApi('/users', params)
}

export async function getUserDetail(userId, startDate, endDate, jiraInstance = null) {
    return fetchApi(`/users/${userId}`, {
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

export async function getIssues(startDate, endDate, jiraInstance = null) {
    return fetchApi('/epics/issues', {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        jira_instance: jiraInstance
    })
}

export async function getMultiJiraOverview(startDate, endDate) {
    return fetchApi('/dashboard/multi-jira-overview', {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
    })
}

export async function getTeamMultiJiraOverview(teamName, startDate, endDate) {
    return fetchApi(`/teams/${encodeURIComponent(teamName)}/multi-jira-overview`, {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
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
    const token = getAccessToken()
    const headers = {}
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}/cache/clear`, {
        method: 'POST',
        headers
    })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error('[API Error]', {
            status: response.status,
            url: url.toString(),
            error: error,
            detail: error.detail
        })
        throw new Error(error.detail || JSON.stringify(error) || `API Error: ${response.status}`)
    }

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
    const token = getAccessToken()
    const headers = {
        'Content-Type': 'application/json'
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            jira_instances: jiraInstances
        })
    })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Sync Error: ${response.status}`)
    }

    return response.json()
}

export async function syncWorklogsStream(startDate, endDate, jiraInstances = null, onProgress) {
    const token = getAccessToken()
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}/sync/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            jira_instances: jiraInstances
        })
    })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Sync Error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let finalResult = null
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line in buffer

        for (const line of lines) {
            if (!line.trim()) continue
            try {
                const event = JSON.parse(line)
                if (event.type === 'complete') finalResult = event
                else if (event.type === 'error') throw new Error(event.message)
                onProgress?.(event)
            } catch (e) {
                if (e.message && !e.message.startsWith('Unexpected')) throw e
            }
        }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
        try {
            const event = JSON.parse(buffer)
            if (event.type === 'complete') finalResult = event
            else if (event.type === 'error') throw new Error(event.message)
            onProgress?.(event)
        } catch (e) {
            if (e.message && !e.message.startsWith('Unexpected')) throw e
        }
    }

    return finalResult
}

// ============ Settings API - Helper functions ============

async function fetchApiPost(endpoint, data = {}) {
    const token = getAccessToken()
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error('[API Error]', {
            status: response.status,
            url: url.toString(),
            error: error,
            detail: error.detail
        })
        throw new Error(error.detail || JSON.stringify(error) || `API Error: ${response.status}`)
    }

    return response.json()
}

async function fetchApiPut(endpoint, data = {}) {
    const token = getAccessToken()
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
    })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error('[API Error]', {
            status: response.status,
            url: url.toString(),
            error: error,
            detail: error.detail
        })
        throw new Error(error.detail || JSON.stringify(error) || `API Error: ${response.status}`)
    }

    return response.json()
}

async function fetchApiDelete(endpoint) {
    const token = getAccessToken()
    const headers = {}
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers
    })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error('[API Error]', {
            status: response.status,
            url: url.toString(),
            error: error,
            detail: error.detail
        })
        throw new Error(error.detail || JSON.stringify(error) || `API Error: ${response.status}`)
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

export async function createUsersBulk(emails, teamId = null) {
    return fetchApiPost('/settings/users/bulk', { emails, team_id: teamId })
}

// ============ Settings API - JIRA Accounts ============

export async function bulkFetchJiraAccounts() {
    return fetchApiPost('/settings/users/bulk-fetch-accounts', {})
}

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

export async function createJiraInstance(data) {
    return fetchApiPost('/settings/jira-instances', data)
}

export async function getJiraInstance(instanceId, includeCredentials = false) {
    return fetchApi(`/settings/jira-instances/${instanceId}`, {
        include_credentials: includeCredentials
    })
}

export async function updateJiraInstance(instanceId, data) {
    return fetchApiPut(`/settings/jira-instances/${instanceId}`, data)
}

export async function deleteJiraInstance(instanceId) {
    return fetchApiDelete(`/settings/jira-instances/${instanceId}`)
}

export async function testJiraInstance(instanceId) {
    return fetchApiPost(`/settings/jira-instances/${instanceId}/test`, {})
}

export async function getInstanceIssueTypes(instanceId) {
    return fetchApi(`/settings/jira-instances/${instanceId}/issue-types`)
}

// ============ Settings API - Database Management ============

export async function clearAllWorklogs() {
    return fetchApiDelete('/settings/worklogs/clear')
}

// ============ Settings API - Complementary Groups ============

export async function getComplementaryGroups() {
    return fetchApi('/settings/complementary-groups')
}

export async function createComplementaryGroup(data) {
    return fetchApiPost('/settings/complementary-groups', data)
}

export async function getComplementaryGroup(groupId) {
    return fetchApi(`/settings/complementary-groups/${groupId}`)
}

export async function updateComplementaryGroup(groupId, data) {
    return fetchApiPut(`/settings/complementary-groups/${groupId}`, data)
}

export async function deleteComplementaryGroup(groupId) {
    return fetchApiDelete(`/settings/complementary-groups/${groupId}`)
}

export async function addInstanceToGroup(groupId, instanceId) {
    return fetchApiPost(`/settings/complementary-groups/${groupId}/members/${instanceId}`, {})
}

export async function removeInstanceFromGroup(groupId, instanceId) {
    return fetchApiDelete(`/settings/complementary-groups/${groupId}/members/${instanceId}`)
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
    const baseUrl = buildApiUrl('/logs/download')
    const url = new URL(baseUrl, isTauri() ? undefined : window.location.origin)
    url.searchParams.set('format', format)

    if (filters.level) url.searchParams.set('level', filters.level)
    if (filters.startDate) url.searchParams.set('start_date', filters.startDate)
    if (filters.endDate) url.searchParams.set('end_date', filters.endDate)
    if (filters.endpoint) url.searchParams.set('endpoint', filters.endpoint)

    const token = getAccessToken()
    const headers = {}
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, { headers })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

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

// ============ Packages API ============

export async function getPackageTemplates() {
    return fetchApi('/packages/templates')
}

export async function createPackageTemplate(data) {
    return fetchApiPost('/packages/templates', data)
}

export async function updatePackageTemplate(templateId, data) {
    return fetchApiPut(`/packages/templates/${templateId}`, data)
}

export async function deletePackageTemplate(templateId) {
    return fetchApiDelete(`/packages/templates/${templateId}`)
}

export async function getJiraProjects(instanceName) {
    return fetchApi('/packages/jira-projects', { instance: instanceName })
}

export async function getJiraIssueTypes(instanceName, projectKey) {
    return fetchApi('/packages/jira-issue-types', { instance: instanceName, project_key: projectKey })
}

export async function createPackage(data) {
    return fetchApiPost('/packages/create', data)
}

export async function getLinkedIssues(issueKey, jiraInstance) {
    return fetchApi('/packages/linked-issues', {
        issue_key: issueKey,
        jira_instance: jiraInstance
    })
}

export async function getComplementaryInstancesForPackage(instanceNames) {
    // Fetch complementary groups and resolve which instances are complementary
    const { groups } = await getComplementaryGroups()
    const autoInstances = new Map() // name -> group_name

    for (const name of instanceNames) {
        for (const group of groups) {
            const memberNames = group.members.map(m => m.name)
            if (memberNames.includes(name)) {
                for (const member of group.members) {
                    if (!instanceNames.includes(member.name) && !autoInstances.has(member.name)) {
                        autoInstances.set(member.name, group.name)
                    }
                }
            }
        }
    }

    return autoInstances
}

// ============ Settings API - Holidays ============

export async function getHolidays(year, country = 'IT') {
    return fetchApi(`/settings/holidays/${year}`, { country })
}

export async function getHolidaysForRange(startDate, endDate, country = 'IT') {
    return fetchApi(`/settings/holidays/range`, {
        start_date: startDate,
        end_date: endDate,
        country
    })
}

export async function createHoliday(data) {
    return fetchApiPost('/settings/holidays', data)
}

export async function updateHoliday(holidayId, data) {
    return fetchApiPut(`/settings/holidays/${holidayId}`, data)
}

export async function deleteHoliday(holidayId) {
    return fetchApiDelete(`/settings/holidays/${holidayId}`)
}

export async function seedHolidays(year, country = 'IT') {
    return fetchApiPost(`/settings/holidays/${year}/seed`, { country })
}

// ============ Billing API ============

// Clients
export async function getBillingClients() {
    return fetchApi('/billing/clients')
}

export async function createBillingClient(data) {
    return fetchApiPost('/billing/clients', data)
}

export async function updateBillingClient(clientId, data) {
    return fetchApiPut(`/billing/clients/${clientId}`, data)
}

export async function deleteBillingClient(clientId) {
    return fetchApiDelete(`/billing/clients/${clientId}`)
}

// Projects
export async function getBillingProjects(clientId = null) {
    const params = {}
    if (clientId) params.client_id = clientId
    return fetchApi('/billing/projects', params)
}

export async function createBillingProject(data) {
    return fetchApiPost('/billing/projects', data)
}

export async function updateBillingProject(projectId, data) {
    return fetchApiPut(`/billing/projects/${projectId}`, data)
}

export async function deleteBillingProject(projectId) {
    return fetchApiDelete(`/billing/projects/${projectId}`)
}

// Project Mappings
export async function addBillingProjectMapping(projectId, data) {
    return fetchApiPost(`/billing/projects/${projectId}/mappings`, data)
}

export async function removeBillingProjectMapping(projectId, mappingId) {
    return fetchApiDelete(`/billing/projects/${projectId}/mappings/${mappingId}`)
}

// Rates
export async function getBillingRates(billingProjectId) {
    return fetchApi('/billing/rates', { billing_project_id: billingProjectId })
}

export async function createBillingRate(data) {
    return fetchApiPost('/billing/rates', data)
}

export async function deleteBillingRate(rateId) {
    return fetchApiDelete(`/billing/rates/${rateId}`)
}

// Classifications
export async function classifyWorklog(data) {
    return fetchApiPost('/billing/classifications', data)
}

export async function bulkClassifyWorklogs(data) {
    return fetchApiPost('/billing/classifications/bulk', data)
}

// Preview
export async function getBillingPreview(clientId, periodStart, periodEnd, groupBy = 'project', billingProjectId = null) {
    const params = {
        client_id: clientId,
        period_start: formatDate(periodStart),
        period_end: formatDate(periodEnd),
        group_by: groupBy
    }
    if (billingProjectId) params.billing_project_id = billingProjectId
    return fetchApi('/billing/preview', params)
}

// Invoices
export async function createInvoice(data) {
    return fetchApiPost('/billing/invoices', {
        ...data,
        period_start: formatDate(data.period_start),
        period_end: formatDate(data.period_end)
    })
}

export async function getInvoices(clientId = null, status = null) {
    const params = {}
    if (clientId) params.client_id = clientId
    if (status) params.status = status
    return fetchApi('/billing/invoices', params)
}

export async function getInvoice(invoiceId) {
    return fetchApi(`/billing/invoices/${invoiceId}`)
}

export async function issueInvoice(invoiceId) {
    return fetchApiPost(`/billing/invoices/${invoiceId}/issue`, {})
}

export async function voidInvoice(invoiceId) {
    return fetchApiPost(`/billing/invoices/${invoiceId}/void`, {})
}

export async function deleteInvoice(invoiceId) {
    return fetchApiDelete(`/billing/invoices/${invoiceId}`)
}

export async function exportInvoiceExcel(invoiceId) {
    const baseUrl = buildApiUrl(`/billing/invoices/${invoiceId}/export.xlsx`)
    const url = new URL(baseUrl, isTauri() ? undefined : window.location.origin)

    const token = getAccessToken()
    const headers = {}
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, { headers })

    if (response.status === 401) {
        handleAuthError()
        throw new Error('Authentication required')
    }

    if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`)
    }

    const blob = await response.blob()
    const contentDisposition = response.headers.get('Content-Disposition')
    const filename = contentDisposition?.match(/filename="?(.+?)"?$/)?.[1] || `fattura_${invoiceId}.xlsx`

    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

// ============ Factorial API ============

// Configuration
export async function getFactorialConfig() {
    return fetchApi('/factorial/config')
}

export async function setFactorialConfig(apiKey) {
    return fetchApiPost('/factorial/config', { api_key: apiKey })
}

export async function deleteFactorialConfig() {
    return fetchApiDelete('/factorial/config')
}

// Employee Mapping (Single)
export async function fetchFactorialEmployeeId(userId) {
    return fetchApiPost(`/factorial/users/${userId}/fetch-employee-id`)
}

export async function deleteFactorialAccount(userId) {
    return fetchApiDelete(`/factorial/users/${userId}/factorial-account`)
}

// Employee Mapping (Bulk)
export async function bulkFetchFactorialEmployees() {
    return fetchApiPost('/factorial/users/bulk-fetch-employees')
}

// Leaves Sync
export async function syncFactorialLeaves(startDate, endDate) {
    return fetchApiPost('/factorial/sync-leaves', {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
    })
}

export async function getFactorialLeaves(startDate, endDate, userId = null, status = null) {
    const params = {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
    }
    if (userId) params.user_id = userId
    if (status) params.status = status
    return fetchApi('/factorial/leaves', params)
}

// ============ Profile & Auth API ============

export async function getProfile() {
    const response = await fetchApi('/auth/me')
    // Transform { user: {...}, company: {...} } to { ...user, company: {...} }
    return { ...response.user, company: response.company }
}

export async function updateProfile(data) {
    const response = await fetchApiPut('/auth/profile', data)
    // Transform { user: {...}, company: {...} } to { ...user, company: {...} }
    return { ...response.user, company: response.company }
}

export async function updateCompany(data) {
    return fetchApiPut('/auth/company', data)
}

export async function completeOnboarding(onboardingToken, companyName) {
    // No auth header needed - uses onboarding token
    const response = await fetch(`${API_BASE}/auth/complete-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            onboarding_token: onboardingToken,
            company_name: companyName
        })
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Onboarding Error: ${response.status}`)
    }

    return response.json()
}

export async function logout() {
    try {
        const token = getAccessToken()
        const headers = {}
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers })
    } finally {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
    }
}

export async function deleteAccount() {
    const response = await fetch(`${API_BASE}/auth/account`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAccessToken()}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || 'Failed to delete account')
    }

    const result = await response.json()

    // Clear local storage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')

    return result
}
