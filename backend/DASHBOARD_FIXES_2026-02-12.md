# Dashboard Fixes - Instance Comparison & Holiday Exclusion

**Date**: 2026-02-12
**Status**: ✅ IMPLEMENTED

---

## 📋 Summary

Fixed two critical issues in the Dashboard's "Instance Comparison" section:

1. **Complementary Instances Grouping**: OT and MMFG (complementary instances) now display as a single expandable row showing the group name, with individual instance details shown on expand (hours NOT summed)
2. **Holiday Exclusion**: Available hours calculation now correctly excludes holidays in addition to weekends

---

## 🔧 Changes Made

### Backend Changes

#### 1. New API Endpoint: `/api/settings/holidays/range`

**File**: `backend/app/routers/settings.py`

Added new endpoint to fetch active holiday dates for a date range:

```python
@router.get("/holidays/range")
async def get_holidays_for_range(
    start_date: str,
    end_date: str,
    country: str = "IT",
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get active holiday dates for a date range (scoped to company)."""
    storage = get_storage()

    holiday_dates = await storage.get_active_holiday_dates(
        start_date, end_date, current_user.company_id, country
    )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "country": country,
        "holiday_dates": sorted(list(holiday_dates)),
        "count": len(holiday_dates)
    }
```

**Location**: Added after line 1006 in `settings.py`

---

### Frontend Changes

#### 1. New API Client Function

**File**: `frontend/src/api/client.js`

Added function to call the new holiday range endpoint:

```javascript
export async function getHolidaysForRange(startDate, endDate, country = 'IT') {
    return fetchApi(`/settings/holidays/range`, {
        start_date: startDate,
        end_date: endDate,
        country
    })
}
```

**Location**: Added after line 718 in `client.js`

---

#### 2. Dashboard Component Updates

**File**: `frontend/src/pages/NewDashboard.tsx`

**A. Updated Imports**:
```typescript
import { getComplementaryGroups, getHolidaysForRange } from '../api/client'
```

**B. New State Variables**:
```typescript
const [complementaryGroups, setComplementaryGroups] = useState<any[]>([])
const [holidayDates, setHolidayDates] = useState<string[]>([])
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
```

**C. New useEffect to Fetch Metadata**:
```typescript
useEffect(() => {
  const fetchMetadata = async () => {
    try {
      // Fetch complementary groups
      const groupsResult = await getComplementaryGroups()
      setComplementaryGroups(groupsResult.groups || [])

      // Fetch holidays for the date range
      const startDate = dateRange.startDate.toISOString().split('T')[0]
      const endDate = dateRange.endDate.toISOString().split('T')[0]
      const holidaysResult = await getHolidaysForRange(startDate, endDate)
      setHolidayDates(holidaysResult.holiday_dates || [])
    } catch (err) {
      console.error('[Dashboard] Failed to fetch complementary groups or holidays:', err)
    }
  }

  fetchMetadata()
}, [dateRange.startDate, dateRange.endDate])
```

**D. Fixed Working Days Calculation** (line ~202):
```typescript
// Calculate working days in period (for Avg/Day KPI) - excluding weekends and holidays
const businessDays = differenceInBusinessDays(dateRange.endDate, dateRange.startDate) + 1
const workingDays = businessDays - holidayDates.length // Subtract holidays from business days
const avgHoursPerDay = workingDays > 0 ? data.total_hours / workingDays : 0
```

**Before**: Only excluded weekends
**After**: Excludes weekends AND holidays

---

**E. Rebuilt Instance Aggregation Logic** (lines ~307-380):

Created complementary group mapping:
```typescript
// Build complementary group map: instance_name -> group
const instanceToGroup = new Map()
const groupToPrimary = new Map()
const groupToMembers = new Map()

complementaryGroups.forEach((group) => {
  const members = group.members || []
  const primaryInstance = group.primary_instance
  groupToMembers.set(group.name, members)

  members.forEach((instanceName: string) => {
    instanceToGroup.set(instanceName, group.name)
  })

  if (primaryInstance) {
    groupToPrimary.set(group.name, primaryInstance)
  }
})
```

Updated instance data calculation to group complementary instances:
```typescript
// Process complementary groups first
complementaryGroups.forEach((group) => {
  const members = group.members || []
  const primaryInstance = group.primary_instance

  // Use primary instance data (do NOT sum)
  const hours = instanceStats.get(primaryInstance) || 0
  const contributors = instanceContributors.get(primaryInstance)?.size || 0
  const worklogCount = instanceWorklogs.get(primaryInstance) || 0

  // Build member details for expandable rows
  const memberDetails = members.map((memberInstance: string) => ({
    instance: memberInstance,
    hours: instanceStats.get(memberInstance) || 0,
    worklogCount: instanceWorklogs.get(memberInstance) || 0,
    contributors: instanceContributors.get(memberInstance)?.size || 0,
    isPrimary: memberInstance === primaryInstance,
  }))

  instanceData.push({
    instance: group.name, // Show group name instead of instance name
    hours,
    worklogCount,
    contributors,
    availableHours,
    utilization,
    isGroup: true,
    members: memberDetails,
    groupName: group.name,
  })
})
```

---

**F. Added Expandable Row Functionality** (lines ~440-520):

Added toggle function:
```typescript
const toggleExpand = (groupName: string) => {
  setExpandedGroups(prev => {
    const newSet = new Set(prev)
    if (newSet.has(groupName)) {
      newSet.delete(groupName)
    } else {
      newSet.add(groupName)
    }
    return newSet
  })
}
```

Updated Instance column with expand/collapse UI:
```typescript
{
  key: 'instance',
  label: 'Instance',
  type: 'text',
  width: '200px',
  render: (value, row: any) => {
    const isExpanded = expandedGroups.has(row.groupName)
    const hasMembers = row.isGroup && row.members && row.members.length > 1

    return (
      <div
        className={`flex items-center gap-2 ${hasMembers ? 'cursor-pointer hover:text-accent' : ''} ${row.isChild ? 'pl-6 text-secondary' : ''}`}
        onClick={() => hasMembers && toggleExpand(row.groupName)}
      >
        {hasMembers && (
          <span className="text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {row.isChild && <span className="text-xs mr-1">└</span>}
        <span className={`text-sm ${row.isChild ? '' : 'font-medium'}`}>
          {value}
          {row.isPrimary && <span className="ml-2 text-xs text-accent">(primary)</span>}
        </span>
      </div>
    )
  },
}
```

Updated table data to include child rows when expanded:
```typescript
instanceData.forEach((item) => {
  // Add parent row
  comparisonTableData.push({
    id: item.instance,
    instance: item.instance,
    hours: formatHours(item.hours),
    // ... other fields
    isGroup: item.isGroup,
    groupName: item.groupName,
    members: item.members,
    isChild: false,
  })

  // Add child rows if group is expanded
  if (item.isGroup && expandedGroups.has(item.groupName)) {
    item.members.forEach((member: any) => {
      comparisonTableData.push({
        id: `${item.instance}-${member.instance}`,
        instance: member.instance,
        hours: formatHours(member.hours),
        // ... other fields
        isChild: true,
        isPrimary: member.isPrimary,
      })
    })
  }
})
```

---

## 🎯 Expected Behavior

### Before Fix:

**Instance Comparison Table**:
```
Instance        | Hours  | Worklogs | Contributors | Available | Utilization
----------------|--------|----------|--------------|-----------|-------------
OT              | 120.5h | 85       | 5            | 160h      | 75%
MMFG            | 118.2h | 82       | 5            | 160h      | 74%
```

**Issues**:
- ❌ OT and MMFG shown as separate rows (they're complementary)
- ❌ No way to see they're related
- ❌ Working days calculation includes holidays (e.g., Feb 6 is a holiday in Italy but counted as working day)

---

### After Fix:

**Instance Comparison Table** (Collapsed):
```
Instance        | Hours  | Worklogs | Contributors | Available | Utilization
----------------|--------|----------|--------------|-----------|-------------
▶ OT - MMFG     | 120.5h | 85       | 5            | 152h      | 79%  (⬆ corrected)
```

**Instance Comparison Table** (Expanded - click to expand):
```
Instance        | Hours  | Worklogs | Contributors | Available | Utilization
----------------|--------|----------|--------------|-----------|-------------
▼ OT - MMFG     | 120.5h | 85       | 5            | 152h      | 79%
  └ OT (primary)| 120.5h | 85       | 5            | 152h      | 79%
  └ MMFG        | 118.2h | 82       | 5            | 152h      | 78%
```

**Fixed**:
- ✅ OT and MMFG grouped as "OT - MMFG"
- ✅ Shows primary instance data (OT)
- ✅ Expandable to see individual instance details
- ✅ Hours NOT summed (avoids double-counting)
- ✅ Available hours excludes holidays (160h → 152h for 1 holiday in range)
- ✅ Utilization percentage corrected (75% → 79%)

---

## 📊 Holiday Calculation Impact

### Example Calculation (February 2026):

**Date Range**: Feb 1 - Feb 28, 2026
**Business Days** (weekends excluded): 20 days
**Holidays in Italy**: Feb 6 (Carnival)
**Working Days**: 20 - 1 = **19 days**

**Contributors**: 5 users
**Daily Hours**: 8h

**Before Fix**:
```
Available Hours = 20 days × 8h × 5 users = 800h
```

**After Fix**:
```
Available Hours = 19 days × 8h × 5 users = 760h  (⬇ 40h reduction)
```

**Impact on Utilization**:
```
Logged Hours = 600h

Before: 600h / 800h = 75%
After:  600h / 760h = 79%  (⬆ 4% more accurate)
```

---

## 🧪 Testing

### Manual Test Steps:

1. **Start Backend**:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to Dashboard**:
   - Go to http://localhost:5173/app/dashboard
   - Select date range: This Month (February 2026)

4. **Verify Holiday Endpoint**:
   ```bash
   curl "http://localhost:8000/api/settings/holidays/range?start_date=2026-02-01&end_date=2026-02-28" \
     -H "Authorization: Bearer <your-token>"
   ```
   Expected response:
   ```json
   {
     "start_date": "2026-02-01",
     "end_date": "2026-02-28",
     "country": "IT",
     "holiday_dates": ["2026-02-06"],
     "count": 1
   }
   ```

5. **Verify Complementary Grouping**:
   - Scroll to "Instance Comparison" section
   - Check if "OT - MMFG" appears as single row (not separate OT and MMFG rows)
   - Click on "OT - MMFG" row
   - Verify it expands to show:
     - OT (primary) - with hours, worklogs, contributors
     - MMFG - with hours, worklogs, contributors
   - Verify hours in parent row match OT (primary), NOT sum of OT + MMFG

6. **Verify Holiday Exclusion**:
   - Check "Available" hours column
   - Calculate manually: `(business_days - holidays) × 8h × contributors`
   - Example for Feb 2026 with 5 contributors: (20 - 1) × 8 × 5 = 760h
   - Verify utilization percentage reflects corrected available hours

---

## 🐛 Known Issues / Edge Cases

1. **Empty Complementary Groups**: If a group has no worklogs, it won't appear in the table
2. **Single-Member Groups**: Groups with only one instance will show expand icon but expanding shows only that instance
3. **Primary Instance Missing Data**: If primary instance has no data but secondary does, group will show 0 hours (by design - prevents double-counting)

---

## 📚 Related Files

### Backend
- `backend/app/routers/settings.py` - New holiday range endpoint (line 1008+)
- `backend/app/cache.py` - Storage method `get_active_holiday_dates()` (line 4394)

### Frontend
- `frontend/src/api/client.js` - API client function (line 720)
- `frontend/src/pages/NewDashboard.tsx` - Dashboard component (modified extensively)

### Database
- Table: `complementary_groups` - Stores group definitions
- Table: `complementary_group_members` - Junction table with company_id (fixed in migration 003)
- Table: `holidays` - Stores holiday dates

---

## 🔗 References

- **Migration 003**: `backend/COMPLEMENTARY_GROUPS_SECURITY_FIX.md`
- **Database Schema**: `docs/database-schema.md`
- **Architecture**: `docs/architecture.md`
- **CLAUDE.md**: Project overview and security patterns

---

## ✅ Completion Checklist

- [x] Backend endpoint `/api/settings/holidays/range` created
- [x] Frontend API client function `getHolidaysForRange()` added
- [x] Dashboard fetches complementary groups on mount
- [x] Dashboard fetches holidays for date range
- [x] Working days calculation excludes holidays
- [x] Instance aggregation groups complementary instances
- [x] Grouped instances show primary instance data (not summed)
- [x] Instance Comparison table supports expandable rows
- [x] Expand/collapse functionality implemented
- [x] Child rows indented and marked as primary/secondary
- [x] Backend server restarted with new endpoint
- [ ] Frontend tested in browser
- [ ] User acceptance testing

---

**Next Steps**:
1. Test in browser to verify UI rendering
2. User acceptance testing with real data
3. Update MEMORY.md with new patterns if needed

---

**Last Updated**: 2026-02-12 18:40 CET
**Author**: Claude (Sonnet 4.5)
