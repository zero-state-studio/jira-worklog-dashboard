# Migration Example - Before & After

Practical example showing how to migrate an existing page to use the new component library.

---

## Example: User Management Page

### BEFORE - Old Implementation

```tsx
import React, { useState } from 'react'

function UsersPage() {
  const [users, setUsers] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [team, setTeam] = useState('')

  return (
    <div className="p-8">
      {/* Header with gradient */}
      <div className="mb-6">
        <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Users
        </h1>
        <p className="text-dark-400">Manage your team members</p>
      </div>

      {/* Stats with glass cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-blue-600
                          flex items-center justify-center mb-4 shadow-glow">
            <svg className="w-6 h-6 text-white" />
          </div>
          <p className="text-dark-400 text-sm mb-2">Total Users</p>
          <p className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            156
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-green to-emerald-600
                          flex items-center justify-center mb-4 shadow-glow">
            <svg className="w-6 h-6 text-white" />
          </div>
          <p className="text-dark-400 text-sm mb-2">Active</p>
          <p className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            142
          </p>
        </div>

        {/* ... 2 more cards */}
      </div>

      {/* Form with old inputs */}
      <div className="glass-card p-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-dark-300 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg
                         text-dark-100 focus:border-accent-blue"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="text-dark-300 text-sm">Team</label>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg
                         text-dark-100"
            >
              <option>Frontend</option>
              <option>Backend</option>
            </select>
          </div>
        </div>

        <button className="mt-4 px-6 py-2 bg-gradient-primary text-white rounded-lg
                           shadow-glow hover:shadow-lg hover:scale-105 transition-all">
          Add User
        </button>
      </div>

      {/* Table with old styling */}
      <div className="glass-card p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-600">
              <th className="text-left text-dark-400 text-sm py-3">Name</th>
              <th className="text-left text-dark-400 text-sm py-3">Email</th>
              <th className="text-left text-dark-400 text-sm py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-dark-700 hover:bg-dark-700/50">
                <td className="py-3 text-dark-100">{user.name}</td>
                <td className="py-3 text-dark-200">{user.email}</td>
                <td className="py-3">
                  <span className="badge-blue">{user.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal with old styling */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center">
          <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 max-w-md">
            <h2 className="text-2xl font-bold text-dark-100 mb-4">Confirm</h2>
            <p className="text-dark-300 mb-6">Are you sure?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-dark-700 border border-dark-600 text-dark-100
                           rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-gradient-primary text-white rounded-lg
                                 shadow-glow hover:scale-105">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Problems:**
- 48px gradients everywhere (text-5xl)
- Hardcoded colors (bg-dark-800, text-dark-400)
- Glass morphism cards
- Shadow glows
- Scale animations
- Manual table implementation
- Inconsistent spacing
- Poor accessibility

**Lines of Code:** ~140 lines

---

## AFTER - New Implementation

```tsx
import React, { useState } from 'react'
import {
  Button,
  Badge,
  Card,
  Input,
  Select,
  Modal,
  KpiBar,
  DataTable,
  Column,
} from '@/components/common'

function UsersPage() {
  const [users, setUsers] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [team, setTeam] = useState('')

  const columns: Column[] = [
    { key: 'name', label: 'Name', type: 'text', sortable: true },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge', sortable: true },
    { key: 'actions', label: 'Actions', type: 'actions' },
  ]

  const teamOptions = [
    { value: 'frontend', label: 'Frontend Team' },
    { value: 'backend', label: 'Backend Team' },
  ]

  return (
    <div className="p-8 space-y-6">
      {/* Header - clean, no gradient */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Users</h1>
        <p className="text-secondary">Manage your team members</p>
      </div>

      {/* KPI Bar - compact, single component */}
      <KpiBar
        items={[
          { label: 'Total Users', value: 156 },
          { label: 'Active', value: 142, trend: 8, trendDirection: 'up' },
          { label: 'Pending', value: 12 },
          { label: 'Inactive', value: 2 },
        ]}
      />

      {/* Form - clean inputs */}
      <Card padding="normal">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />

          <Select
            label="Team"
            options={teamOptions}
            value={team}
            onChange={setTeam}
            searchable
          />
        </div>

        <div className="mt-4">
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Add User
          </Button>
        </div>
      </Card>

      {/* Table - enterprise-grade component */}
      <DataTable
        columns={columns}
        data={users}
        sortable
        selectable
        pagination={{
          page: 1,
          pageSize: 25,
          total: users.length,
          onPageChange: (page) => console.log('Page:', page),
          onPageSizeChange: (size) => console.log('Size:', size),
        }}
        toolbar={{
          title: 'Team Members',
          actions: (
            <Button variant="primary" size="sm">
              Export CSV
            </Button>
          ),
        }}
      />

      {/* Modal - accessible, clean */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Action"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirm}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-secondary">Are you sure you want to proceed with this action?</p>
      </Modal>
    </div>
  )
}
```

**Benefits:**
- Clean, readable code
- Design tokens only
- Accessible components
- Built-in features (sorting, pagination, search)
- Consistent spacing
- Type-safe props
- No hardcoded styles

**Lines of Code:** ~80 lines (-43% reduction)

---

## Side-by-Side Comparison

### Stats Section

**BEFORE:**
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="glass-card p-6">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue
                    to-blue-600 shadow-glow">
      <svg />
    </div>
    <p className="text-dark-400 text-sm">Total</p>
    <p className="text-5xl bg-gradient-primary bg-clip-text text-transparent">
      156
    </p>
  </div>
  {/* ... 3 more cards */}
</div>
```
**Lines:** 40+
**Issues:** Gradient overload, low density, hardcoded colors

**AFTER:**
```tsx
<KpiBar
  items={[
    { label: 'Total Users', value: 156 },
    { label: 'Active', value: 142, trend: 8, trendDirection: 'up' },
    { label: 'Pending', value: 12 },
    { label: 'Inactive', value: 2 },
  ]}
/>
```
**Lines:** 8
**Benefits:** High density, clean design, single component

---

### Form Inputs

**BEFORE:**
```tsx
<div>
  <label className="text-dark-300 text-sm">Email</label>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full px-4 py-2 bg-dark-700 border border-dark-600
               rounded-lg text-dark-100"
    placeholder="user@example.com"
  />
</div>
```
**Lines:** 11
**Issues:** Manual styling, no validation, poor accessibility

**AFTER:**
```tsx
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="user@example.com"
/>
```
**Lines:** 7
**Benefits:** Built-in validation, accessible, consistent styling

---

### Data Table

**BEFORE:**
```tsx
<div className="glass-card p-6">
  <table className="w-full">
    <thead>
      <tr className="border-b border-dark-600">
        <th className="text-left text-dark-400 text-sm py-3">Name</th>
        {/* ... manual columns */}
      </tr>
    </thead>
    <tbody>
      {users.map((user) => (
        <tr key={user.id} className="border-b hover:bg-dark-700/50">
          <td className="py-3 text-dark-100">{user.name}</td>
          {/* ... manual cells */}
        </tr>
      ))}
    </tbody>
  </table>
  {/* Manual pagination */}
</div>
```
**Lines:** 30+
**Issues:** Manual implementation, no sorting, no pagination features

**AFTER:**
```tsx
<DataTable
  columns={columns}
  data={users}
  sortable
  selectable
  pagination={paginationConfig}
  toolbar={{ title: 'Team Members' }}
/>
```
**Lines:** 8
**Benefits:** Sorting, pagination, selection, toolbar - all built-in

---

### Buttons

**BEFORE:**
```tsx
<button
  onClick={handleClick}
  className="px-6 py-2 bg-gradient-primary text-white rounded-lg
             shadow-glow hover:shadow-lg hover:scale-105 transition-all"
>
  Add User
</button>
```
**Lines:** 7
**Issues:** Gradient, glow, scale animation, hardcoded styling

**AFTER:**
```tsx
<Button variant="primary" onClick={handleClick}>
  Add User
</Button>
```
**Lines:** 3
**Benefits:** Clean, accessible, consistent

---

### Modal

**BEFORE:**
```tsx
{isModalOpen && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md">
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
      <h2 className="text-2xl font-bold text-dark-100 mb-4">Confirm</h2>
      <p className="text-dark-300 mb-6">Are you sure?</p>
      <div className="flex gap-3">
        <button className="...">Cancel</button>
        <button className="...">Confirm</button>
      </div>
    </div>
  </div>
)}
```
**Lines:** 20+
**Issues:** Manual overlay, no escape key, no click-outside, poor accessibility

**AFTER:**
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Confirm Action"
  footer={
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
    </>
  }
>
  <p className="text-secondary">Are you sure?</p>
</Modal>
```
**Lines:** 14
**Benefits:** Escape key, click-outside, accessible, consistent

---

## Migration Checklist

For each page you migrate:

### 1. Replace Components
- [ ] `glass-card` → `<Card>`
- [ ] `btn-primary` → `<Button variant="primary">`
- [ ] `badge-blue` → `<Badge variant="info">`
- [ ] Manual inputs → `<Input>` / `<Select>`
- [ ] Manual tables → `<DataTable>`
- [ ] Manual modals → `<Modal>`

### 2. Update Colors
- [ ] `bg-dark-800` → `bg-surface`
- [ ] `text-dark-100` → `text-primary`
- [ ] `text-dark-400` → `text-secondary`
- [ ] `border-dark-600` → `border`
- [ ] Remove gradients: `bg-gradient-primary`
- [ ] Remove glows: `shadow-glow`

### 3. Fix Typography
- [ ] `text-5xl` (48px) → `text-2xl` (24px - MAX)
- [ ] Use semantic sizes: xs, sm, base, lg, xl, 2xl
- [ ] Remove gradient text: `bg-clip-text text-transparent`

### 4. Simplify Interactions
- [ ] Remove `hover:scale-105`
- [ ] Remove `hover:-translate-y-1`
- [ ] Keep only `hover:bg-surface-hover`
- [ ] Remove `transition-all` (use specific properties)

### 5. Test Accessibility
- [ ] Keyboard navigation works
- [ ] Focus visible on all interactive elements
- [ ] Screen reader friendly
- [ ] Proper ARIA labels
- [ ] Form validation messages

### 6. Verify Build
```bash
npm run build  # Should complete without errors
```

---

## Quick Wins

Start with these high-impact, low-effort changes:

### 1. Replace All Buttons (5 min)
```tsx
// Find & Replace
className="btn-primary"     → <Button variant="primary">
className="btn-secondary"   → <Button variant="secondary">
```

### 2. Replace All Badges (5 min)
```tsx
// Find & Replace
className="badge-blue"   → <Badge variant="info">
className="badge-green"  → <Badge variant="success">
className="badge-red"    → <Badge variant="error">
```

### 3. Replace Color Classes (10 min)
```tsx
// Find & Replace
className="text-dark-100"   → className="text-primary"
className="text-dark-400"   → className="text-secondary"
className="bg-dark-800"     → className="bg-surface"
```

### 4. Remove Gradients (10 min)
```tsx
// Find & Delete
bg-gradient-primary bg-clip-text text-transparent
// Replace with
text-primary
```

**Total Time:** 30 minutes per page (average)

---

## Expected Results

After migration:

### Code Metrics
- **Lines of code:** -30% to -50% reduction
- **Component reuse:** 80%+ shared components
- **Type safety:** 100% (TypeScript)
- **Accessibility:** WCAG AA compliant

### Visual Changes
- **Cleaner:** Flat design, no gradients
- **Denser:** More data per screen
- **Professional:** Enterprise SaaS aesthetic
- **Consistent:** Unified design language

### Developer Experience
- **Faster:** Less custom CSS
- **Easier:** Copy-paste examples
- **Safer:** Type-checked props
- **Documented:** Clear API reference

---

## Need Help?

- **Component API:** `/src/components/common/README.md`
- **Design Tokens:** `/src/styles/README.md`
- **Live Examples:** `/src/components/common/Example.tsx`
- **Migration Progress:** `/COMPONENT_MIGRATION_PROGRESS.md`

---

**Ready to migrate?** Start with Dashboard or Settings page - they'll show the biggest visual improvement.
