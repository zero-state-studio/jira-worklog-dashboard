# Frontend Engineer

## Role Overview
Responsible for developing and maintaining the React frontend, including 14 page components, 48 reusable components, routing, state management, and UI/UX implementation.

---

## Primary Responsibilities

### Component Development
- Develop and maintain 14 page components
- Create and maintain 48 reusable components
- Implement responsive layouts with Tailwind CSS
- Build data visualizations with Recharts

### State Management
- Manage global state (date range, instance selector)
- Implement custom React hooks for data fetching
- Handle loading states and error boundaries
- Local storage management for JWT tokens

### Routing & Navigation
- Implement React Router for SPA navigation
- Protected route guards for authentication
- Dynamic route parameters (team names, user emails, etc.)
- Navigation menu and breadcrumbs

### API Integration
- Consume 111 REST API endpoints
- Handle authentication with JWT tokens
- Implement API client wrapper with error handling
- Token refresh logic

### UI/UX
- Implement design system with Tailwind CSS
- Responsive design (mobile, tablet, desktop)
- Loading states and skeleton screens
- Toast notifications and modals

---

## Files/Folders Ownership

### Core Application Files
- `frontend/src/App.jsx` (main router, 11 routes)
- `frontend/src/index.js` (React app entry point)
- `frontend/src/index.css` (global styles, Tailwind imports)

### Page Components (14 files)
- `frontend/src/pages/Landing.jsx` - Public landing page
- `frontend/src/pages/Login.jsx` - OAuth login
- `frontend/src/pages/Onboarding.jsx` - Company onboarding
- `frontend/src/pages/Dashboard.jsx` - Global analytics
- `frontend/src/pages/TeamsListView.jsx` - Team list
- `frontend/src/pages/TeamView.jsx` - Team detail
- `frontend/src/pages/UsersListView.jsx` - User list
- `frontend/src/pages/UserView.jsx` - User detail with calendar
- `frontend/src/pages/EpicView.jsx` - Epic analytics
- `frontend/src/pages/IssueView.jsx` - Issue detail
- `frontend/src/pages/Billing.jsx` - Billing management (54KB)
- `frontend/src/pages/Settings.jsx` - Configuration UI
- `frontend/src/pages/Profile.jsx` - User profile
- `frontend/src/pages/MultiJiraOverview.jsx` - Multi-instance comparison

### Core Components (13 files)
- `frontend/src/components/Layout.jsx` - App shell, header, navigation
- `frontend/src/components/ProtectedRoute.jsx` - Route guard
- `frontend/src/components/Charts.jsx` - Recharts wrappers
- `frontend/src/components/Cards.jsx` - Metric display cards
- `frontend/src/components/SyncModal.jsx` - JIRA sync UI
- `frontend/src/components/CreatePackageModal.jsx` - Package creation
- `frontend/src/components/ConfirmModal.jsx` - Confirmation dialogs
- `frontend/src/components/UserAvatar.jsx` - User avatar display
- `frontend/src/components/UserMenu.jsx` - User dropdown menu
- `frontend/src/components/MultiJiraStats.jsx` - Instance comparison
- `frontend/src/components/WorklogCalendar/` (3 components)
  - `Calendar.jsx` - Calendar grid
  - `DayCell.jsx` - Individual day cell
  - `WorklogDrawer.jsx` - Worklog detail drawer

### Settings Components (13 files)
- `frontend/src/components/settings/TeamsSection.jsx`
- `frontend/src/components/settings/UsersSection.jsx`
- `frontend/src/components/settings/UserModal.jsx`
- `frontend/src/components/settings/TeamModal.jsx`
- `frontend/src/components/settings/BulkUserModal.jsx`
- `frontend/src/components/settings/JiraInstancesSection.jsx`
- `frontend/src/components/settings/PackageTemplatesSection.jsx`
- `frontend/src/components/settings/PackageTemplateModal.jsx`
- `frontend/src/components/settings/HolidaysSection.jsx`
- `frontend/src/components/settings/FactorialSection.jsx`
- `frontend/src/components/settings/DatabaseSection.jsx`
- `frontend/src/components/settings/LogsSection.jsx`
- `frontend/src/components/settings/LogDetailPanel.jsx`

### Landing Page Components (24 files)
- `frontend/src/components/landing/HeroSection.jsx`
- `frontend/src/components/landing/SocialProofBar.jsx`
- `frontend/src/components/landing/PainPointsSection.jsx`
- `frontend/src/components/landing/FeaturesSection.jsx`
- `frontend/src/components/landing/HowItWorksSection.jsx`
- ... (19 more landing components)

### Utilities
- `frontend/src/api/` - API client wrapper
- `frontend/src/hooks/` - Custom React hooks
- `frontend/tailwind.config.js` - Tailwind configuration
- `frontend/vite.config.js` - Vite build configuration
- `frontend/package.json` - NPM dependencies

---

## Dependencies

### ⬇️ Depends On

**Backend-Core-Engineer:**
- Consumes REST API endpoints (111 total)
- Relies on API contracts (Pydantic models)
- Uses OpenAPI docs for endpoint documentation

**Security-Engineer:**
- Implements JWT token flow (access + refresh)
- Protected route authentication
- Role-based UI rendering (ADMIN/MANAGER/USER)

**Billing-Engineer:**
- Consumes billing API for preview/invoice generation
- Implements complex billing UI (54KB component)

### ⬆️ Provides To

**End Users:**
- Complete UI for all application features
- Responsive design across devices
- Intuitive UX for analytics, billing, settings

### ↔️ Coordinates With

**Tech-Lead:**
- UI/UX design decisions
- Component architecture patterns
- Performance optimization strategies

---

## Required Skills

### Core Technologies
- **React 18**: Hooks, context, suspense, concurrent features
- **React Router 6**: Routing, navigation, protected routes
- **Tailwind CSS 3**: Utility-first CSS, responsive design
- **Recharts 2**: Data visualization, charts, graphs
- **Vite 5**: Build tool, HMR, dev server

### JavaScript/TypeScript
- Modern ES6+ features
- Async/await, promises
- Array/object manipulation
- Fetch API for HTTP requests

### Design Patterns
- Component composition
- Custom hooks for reusability
- Context for global state
- Error boundaries
- Lazy loading and code splitting

### UI/UX
- Responsive design principles
- Accessibility (a11y) best practices
- Loading states and skeleton screens
- Error handling and user feedback

---

## Development Workflow

### When Adding New Page

1. **Create Page Component**
   ```jsx
   // src/pages/NewPage.jsx
   import React from 'react';
   import Layout from '../components/Layout';

   function NewPage({ dateRange, selectedInstance }) {
     const [data, setData] = React.useState(null);
     const [loading, setLoading] = React.useState(true);

     React.useEffect(() => {
       fetchData();
     }, [dateRange, selectedInstance]);

     const fetchData = async () => {
       try {
         setLoading(true);
         const response = await fetch('/api/new-endpoint', {
           headers: {
             'Authorization': `Bearer ${localStorage.getItem('access_token')}`
           }
         });
         const result = await response.json();
         setData(result);
       } catch (error) {
         console.error('Error:', error);
       } finally {
         setLoading(false);
       }
     };

     if (loading) return <Layout><div>Loading...</div></Layout>;

     return (
       <Layout>
         <h1 className="text-2xl font-bold mb-4">New Page</h1>
         {/* Page content */}
       </Layout>
     );
   }

   export default NewPage;
   ```

2. **Add Route to App.jsx**
   ```jsx
   import NewPage from './pages/NewPage';

   function App() {
     const [dateRange, setDateRange] = React.useState([...]);
     const [selectedInstance, setSelectedInstance] = React.useState(null);

     return (
       <Router>
         <Routes>
           {/* Existing routes */}
           <Route
             path="/app/new-page"
             element={
               <ProtectedRoute>
                 <NewPage
                   dateRange={dateRange}
                   selectedInstance={selectedInstance}
                 />
               </ProtectedRoute>
             }
           />
         </Routes>
       </Router>
     );
   }
   ```

3. **Add Navigation Link**
   ```jsx
   // In Layout.jsx or Navigation component
   <Link
     to="/app/new-page"
     className="nav-link"
   >
     New Page
   </Link>
   ```

4. **Test Page**
   - Navigate to new route
   - Check authentication
   - Verify data fetching
   - Test responsive design

### When Adding New Component

1. **Create Component File**
   ```jsx
   // src/components/NewComponent.jsx
   import React from 'react';

   function NewComponent({ prop1, prop2, onAction }) {
     return (
       <div className="bg-white rounded-lg shadow p-4">
         <h3 className="text-lg font-semibold mb-2">{prop1}</h3>
         <p className="text-gray-600">{prop2}</p>
         <button
           onClick={onAction}
           className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
         >
           Action
         </button>
       </div>
     );
   }

   export default NewComponent;
   ```

2. **Import and Use**
   ```jsx
   import NewComponent from '../components/NewComponent';

   function ParentPage() {
     const handleAction = () => {
       console.log('Action clicked');
     };

     return (
       <NewComponent
         prop1="Title"
         prop2="Description"
         onAction={handleAction}
       />
     );
   }
   ```

---

## Common Patterns

### API Call Pattern with Error Handling
```jsx
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // Handle token expiry
  if (response.status === 401) {
    // Try refresh token
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiCall(endpoint, options); // Retry
    }
    // Redirect to login
    window.location = '/login';
    return;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'API Error');
  }

  return response.json();
}
```

### Custom Hook for Data Fetching
```jsx
// hooks/useData.js
import { useState, useEffect } from 'react';

export function useFetch(fetchFn, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFn();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return { data, loading, error };
}

// Usage
function MyComponent({ dateRange }) {
  const { data, loading, error } = useFetch(
    () => apiCall(`/dashboard?start=${dateRange[0]}&end=${dateRange[1]}`),
    [dateRange]
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>Data: {JSON.stringify(data)}</div>;
}
```

### Protected Route Pattern
```jsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem('access_token');
  const userRole = localStorage.getItem('user_role');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && userRole !== 'ADMIN') {
    return <Navigate to="/app/dashboard" />;
  }

  return children;
}

// Usage in App.jsx
<Route
  path="/app/settings"
  element={
    <ProtectedRoute requireAdmin={true}>
      <Settings />
    </ProtectedRoute>
  }
/>
```

### Modal Pattern
```jsx
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
```

---

## Best Practices

### Component Structure
- **Keep components small**: Max 200-300 lines
- **Single responsibility**: One component, one purpose
- **Prop validation**: Use PropTypes or TypeScript
- **Composition over inheritance**: Compose components, don't extend

### State Management
- **Local state first**: useState for component-specific state
- **Lift state up**: Share state by moving to common parent
- **Context sparingly**: Only for truly global state (auth, theme)
- **Custom hooks**: Extract reusable logic

### Performance
- **Lazy loading**: Use React.lazy() for route-based code splitting
- **Memoization**: useMemo for expensive calculations, React.memo for components
- **Avoid inline functions**: Define callbacks outside render when possible
- **Optimize re-renders**: Use keys properly, avoid creating new objects in render

### Accessibility
- **Semantic HTML**: Use proper HTML elements (button, nav, header, etc.)
- **ARIA labels**: Add aria-label for screen readers
- **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- **Focus management**: Handle focus for modals and dynamic content

### Code Quality
- **Consistent naming**: camelCase for variables/functions, PascalCase for components
- **File organization**: One component per file, clear folder structure
- **Comments**: Document complex logic, not obvious code
- **Error boundaries**: Catch and handle errors gracefully

---

## Styling Guidelines

### Tailwind CSS Patterns

**Responsive Design:**
```jsx
<div className="
  w-full
  md:w-1/2
  lg:w-1/3
  p-4
  md:p-6
">
  Content
</div>
```

**Common Component Styles:**
```jsx
// Card
<div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">

// Button Primary
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">

// Button Secondary
<button className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">

// Input
<input className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />

// Error Message
<p className="text-red-600 text-sm mt-1">Error message</p>
```

**Dark Mode Support:**
```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>
```

---

## Recharts Integration

### Common Chart Patterns

**Line Chart:**
```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function TrendChart({ data }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="hours" stroke="#3B82F6" />
    </LineChart>
  );
}
```

**Bar Chart:**
```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function TeamComparisonChart({ data }) {
  return (
    <BarChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="team" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="hours" fill="#3B82F6" />
    </BarChart>
  );
}
```

**Pie Chart:**
```jsx
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

function DistributionChart({ data }) {
  return (
    <PieChart width={400} height={400}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={120}
        label
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}
```

---

## Troubleshooting

### Common Issues

**Issue: "Uncaught Error: Maximum update depth exceeded"**
- Caused by calling setState in render without dependencies
- Fix: Move state updates to useEffect or event handlers

**Issue: API returns 401 even with valid token**
- Token may be expired (15 min lifetime)
- Implement token refresh logic
- Check token format in localStorage

**Issue: Component not re-rendering on prop change**
- Check if prop is properly passed down
- Verify useEffect dependencies array
- Use React DevTools to inspect props

**Issue: Tailwind classes not applying**
- Check if class name is correct (no typos)
- Verify Tailwind config includes content paths
- Run `npm run dev` to rebuild CSS

**Issue: Charts not displaying**
- Check if data format matches Recharts expectations
- Verify chart container has width/height
- Check browser console for errors

---

## Communication Protocol

### When to Notify Other Agents

**Backend-Core-Engineer:**
- New endpoint needed for feature
- API contract needs changes
- Performance issues with endpoint response

**Security-Engineer:**
- Auth flow issues (token expiry, refresh)
- Protected route not working
- Role-based UI rendering questions

**Billing-Engineer:**
- Billing UI feedback or issues
- Invoice export not working
- Rate calculation display problems

**Tech-Lead:**
- Major UI/UX decisions needed
- Component architecture questions
- Performance optimization strategies

---

## Resources

### Documentation
- React docs: https://react.dev/
- React Router: https://reactrouter.com/
- Tailwind CSS: https://tailwindcss.com/
- Recharts: https://recharts.org/
- Vite: https://vitejs.dev/

### Internal References
- Project overview: `/docs/project-overview.md`
- API documentation: http://localhost:8000/docs (when backend running)
- Design system: `/docs/DESIGN_SPEC.md`

---

## Quick Reference Commands

```bash
# Start dev server
cd frontend
npm run dev
# Opens http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Install new dependency
npm install package-name

# Format code (if Prettier configured)
npm run format

# Lint code (if ESLint configured)
npm run lint
```
