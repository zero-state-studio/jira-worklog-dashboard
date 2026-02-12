# Design System - Common Components

Enterprise-grade React components built with the new design system.

**All components use ONLY design tokens** from `src/styles/design-tokens.css`.
Zero hardcoded values, consistent styling, full TypeScript support.

---

## Quick Start

```tsx
import { Button, Badge, Input, DataTable } from '@/components/common'

function MyPage() {
  return (
    <>
      <Button variant="primary">Save</Button>
      <Badge variant="success">Active</Badge>
      <Input label="Email" placeholder="you@example.com" />
    </>
  )
}
```

---

## Components

### 1. Button

Primary action component with 4 variants and 3 sizes.

```tsx
<Button variant="primary" size="md">Save Changes</Button>
<Button variant="secondary" icon={<Icon />}>Cancel</Button>
<Button variant="ghost">View Details</Button>
<Button variant="danger" loading>Delete</Button>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'ghost' | 'danger'`
- `size`: `'sm' (28px) | 'md' (32px) | 'lg' (36px)'`
- `loading`: Shows spinner, disables button
- `icon`: Optional left icon
- `disabled`: Disabled state

**Design:**
- NO shadows, NO gradients, NO scale animations
- Border radius: 6px (var --radius-md)
- Primary: bg accent, text white
- Secondary: bg white, border 1px
- Ghost: transparent bg, text secondary
- Danger: bg error, text white (use sparingly)

---

### 2. Badge

Minimal status indicator with dot + text.

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="warning">Pending</Badge>
```

**Props:**
- `variant`: `'default' | 'info' | 'success' | 'warning' | 'error'`

**Design:**
- Dot: 6px circle
- Text: 12px (var --text-xs), font-medium
- NO background pill, NO heavy padding

---

### 3. Card

Flat card with optional hover effect.

```tsx
<Card padding="normal">
  <h3>Title</h3>
  <p>Content</p>
</Card>

<Card padding="compact" hover onClick={handleClick}>
  Clickable card
</Card>
```

**Props:**
- `padding`: `'compact' (12px) | 'normal' (16px)'`
- `hover`: Shows shadow on hover
- `onClick`: Optional click handler

**Design:**
- Border: 1px solid
- Radius: 8px (var --radius-lg)
- NO shadow by default
- Hover: subtle shadow-sm

---

### 4. Input

Standard text input with label, error, and helper text.

```tsx
<Input
  label="Email"
  placeholder="you@example.com"
  error="Invalid email"
/>

<Input
  label="Username"
  helper="Lowercase only"
  disabled
/>
```

**Props:**
- `label`: Optional label above input
- `error`: Error message (red border + text)
- `helper`: Helper text below input
- All standard HTML input props

**Design:**
- Height: 36px (var --input-height)
- Font: 14px (var --text-base)
- Border: 1px solid, 6px radius
- Focus: 2px ring accent
- NO floating labels, NO animations

---

### 5. Select

Custom select with search support for long lists.

```tsx
<Select
  label="Team"
  options={teams}
  value={selectedTeam}
  onChange={setSelectedTeam}
  searchable
/>
```

**Props:**
- `label`, `error`, `helper`: Same as Input
- `options`: Array of `{ value: string, label: string }`
- `value`: Selected value
- `onChange`: Callback with selected value
- `searchable`: Enable search for lists >10 items

**Design:**
- Dropdown: shadow-md, max-height 240px
- Search input: appears when >10 options
- Selected: bg accent-subtle, text accent-text

---

### 6. Modal

Dialog overlay with header, body, and optional footer.

```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Action"
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
    </>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

**Props:**
- `isOpen`: Boolean to show/hide
- `onClose`: Close handler
- `title`: Modal title
- `size`: `'sm' (400px) | 'md' (480px) | 'lg' (640px)'`
- `footer`: Optional footer content

**Design:**
- Overlay: black/50, backdrop-blur-sm
- Content: bg white, radius 12px, shadow-lg
- Header: 16px 20px padding, X button
- Body: scrollable if overflow
- Footer: buttons aligned right

---

### 7. KpiBar

Horizontal bar with KPI metrics separated by borders.

```tsx
<KpiBar
  items={[
    { label: 'Total Hours', value: '42.5h', trend: 12, trendDirection: 'up' },
    { label: 'Active Users', value: 156 },
    { label: 'Completion', value: '87%', trend: -3, trendDirection: 'down' },
  ]}
/>
```

**Props:**
- `items`: Array of KPI items

**Item Props:**
- `label`: Uppercase 11px text
- `value`: Font-mono 20-24px bold
- `trend`: Optional percentage change
- `trendDirection`: `'up' | 'down'` (green or red)

**Design:**
- NO separate cards
- NO shadows
- NO icons/emoji
- Items separated by border-right

---

### 8. DataTable

Enterprise data table with sorting, pagination, and multiple column types.

```tsx
const columns: Column[] = [
  { key: 'name', label: 'Name', type: 'text', sortable: true },
  { key: 'hours', label: 'Hours', type: 'duration', sortable: true },
  { key: 'rate', label: 'Rate', type: 'currency' },
  { key: 'status', label: 'Status', type: 'badge' },
]

<DataTable
  columns={columns}
  data={users}
  loading={isLoading}
  sortable
  pagination={{
    page: 1,
    pageSize: 50,
    total: 250,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  }}
  toolbar={{
    title: "Users",
    actions: <Button>Add User</Button>
  }}
/>
```

**Column Types:**
- `text`: Default, truncated with ellipsis
- `number`: Right-aligned, font-mono 12px
- `currency`: Formatted ($1,234.56)
- `date`: Compact format ("Jan 15")
- `duration`: "2h", "1h 30m", "45m"
- `link`: Accent color, font-mono for codes
- `badge`: Badge component inline
- `actions`: Dropdown menu (⋯)

**Design:**
- Header: sticky, bg surface-secondary, 11px uppercase
- Rows: 36px height, 13px text
- Hover: bg surface-hover
- NO stripe alternating
- NO borders on all sides (only bottom)
- Empty state: compact, 200px max height
- Loading: skeleton rows, 36px height

**Features:**
- Sorting (click column header)
- Pagination (25 | 50 | 100 per page)
- Row selection (optional)
- Toolbar with title + actions
- Filter row (TODO: implement as needed)

---

## Design Principles

### 1. Token-Based Styling

**✅ CORRECT:**
```tsx
className="bg-surface text-primary border"
style={{ background: 'var(--color-surface)' }}
```

**❌ WRONG:**
```tsx
className="bg-white text-gray-900 border-gray-300"
style={{ background: '#FFFFFF' }}
```

### 2. Semantic Color Names

Use semantic names, not implementation details:

- `text-primary` (not `text-gray-900`)
- `text-secondary` (not `text-gray-600`)
- `bg-surface` (not `bg-white`)
- `border` (not `border-gray-200`)

### 3. Consistent Spacing

Use the 4px spacing scale:

- `p-1` = 4px
- `p-2` = 8px
- `p-3` = 12px
- `p-4` = 16px (default for cards)
- `gap-2`, `gap-3`, `gap-4` for flex/grid

### 4. Minimal Shadows

Only use shadows when absolutely necessary:

- Cards: NO shadow by default (optional hover:shadow-sm)
- Dropdowns: shadow-md
- Modals: shadow-lg

### 5. No Decorative Effects

- NO gradients (solid colors only)
- NO glows
- NO scale/translate animations
- NO glass morphism
- NO rounded-full (max 8px radius, except modals 12px)

### 6. Typography Hierarchy

6 sizes only:

- `text-xs` = 11px (metadata, labels)
- `text-sm` = 13px (form labels, table cells)
- `text-base` = 14px (body text - DEFAULT)
- `text-lg` = 16px (section headings)
- `text-xl` = 20px (card titles)
- `text-2xl` = 24px (page titles - MAX)

### 7. Accessibility

All components include:

- `aria-label` where needed
- Keyboard navigation support
- Focus visible states
- Color contrast compliance (WCAG AA)
- Semantic HTML

---

## Integration with Existing Codebase

These components are READY to use. To migrate existing pages:

1. **Replace old components:**
   ```tsx
   // OLD
   <button className="btn-primary">Save</button>

   // NEW
   <Button variant="primary">Save</Button>
   ```

2. **Use design tokens:**
   ```tsx
   // OLD
   <div className="bg-dark-800 text-dark-100">

   // NEW
   <div className="bg-surface text-primary">
   ```

3. **Simplify layouts:**
   ```tsx
   // OLD
   <div className="glass-card p-6">

   // NEW
   <Card padding="normal">
   ```

---

## Testing

All components are type-safe and build-ready:

```bash
npm run build  # Should complete without errors
```

---

## Future Enhancements

Potential additions (create as needed):

- `Checkbox` - Custom checkbox with label
- `Radio` - Custom radio button group
- `Switch` - Toggle switch
- `Tabs` - Tab navigation
- `Dropdown` - Action dropdown menu
- `Toast` - Notification toast
- `Breadcrumbs` - Navigation breadcrumbs
- `Tooltip` - Hover tooltip
- `Avatar` - User avatar component
- `DatePicker` - Date range picker

---

**Questions?** Check `src/styles/README.md` for design token reference.
