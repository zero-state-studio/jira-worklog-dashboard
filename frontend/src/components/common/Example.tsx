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
} from './index'

/**
 * Component Library Examples
 *
 * This file demonstrates all components from the design system.
 * NOT meant for production - just a showcase/testing ground.
 */

export function ComponentExamples() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectValue, setSelectValue] = useState('')

  // Example data for DataTable
  const columns: Column[] = [
    { key: 'name', label: 'Name', type: 'text', sortable: true },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'hours', label: 'Hours', type: 'duration', sortable: true },
    { key: 'rate', label: 'Rate', type: 'currency' },
    { key: 'status', label: 'Status', type: 'badge' },
  ]

  const data = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      hours: '42.5h',
      rate: 1250,
      status: 'active',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      hours: '38h',
      rate: 1500,
      status: 'active',
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      hours: '45h',
      rate: 1100,
      status: 'inactive',
    },
  ]

  const selectOptions = [
    { value: 'frontend', label: 'Frontend Team' },
    { value: 'backend', label: 'Backend Team' },
    { value: 'devops', label: 'DevOps Team' },
    { value: 'design', label: 'Design Team' },
  ]

  return (
    <div className="p-8 space-y-12 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary mb-2">Design System Components</h1>
        <p className="text-secondary">
          All components built with design tokens - zero hardcoded values
        </p>
      </div>

      {/* Buttons */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" size="sm">
            Small Primary
          </Button>
          <Button variant="primary" size="md">
            Medium Primary
          </Button>
          <Button variant="primary" size="lg">
            Large Primary
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button
            variant="primary"
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
            }
          >
            With Icon
          </Button>
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Badges</h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="default">Default</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Cards</h2>
        <div className="grid grid-cols-3 gap-4">
          <Card padding="compact">
            <h3 className="font-semibold text-primary mb-1">Compact Card</h3>
            <p className="text-sm text-secondary">With 12px padding</p>
          </Card>
          <Card padding="normal">
            <h3 className="font-semibold text-primary mb-1">Normal Card</h3>
            <p className="text-sm text-secondary">With 16px padding</p>
          </Card>
          <Card padding="normal" hover>
            <h3 className="font-semibold text-primary mb-1">Hover Card</h3>
            <p className="text-sm text-secondary">Shows shadow on hover</p>
          </Card>
        </div>
      </section>

      {/* Inputs & Select */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Form Inputs</h2>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input label="Password" type="password" helper="Min 8 characters" />
          <Input label="Error State" error="This field is required" />
          <Select
            label="Select Team"
            options={selectOptions}
            value={selectValue}
            onChange={setSelectValue}
            searchable
          />
        </div>
      </section>

      {/* KPI Bar */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">KPI Bar</h2>
        <KpiBar
          items={[
            { label: 'Total Hours', value: '1,234h', trend: 12, trendDirection: 'up' },
            { label: 'Active Users', value: 156 },
            { label: 'Completion', value: '87%', trend: -3, trendDirection: 'down' },
            { label: 'Avg Rate', value: '$125/h' },
          ]}
        />
      </section>

      {/* Modal Trigger */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Modal</h2>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          Open Modal
        </Button>

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
              <Button
                variant="primary"
                onClick={() => {
                  alert('Confirmed!')
                  setIsModalOpen(false)
                }}
              >
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-secondary">
            This is a modal dialog. Click outside, press Escape, or click Cancel to close.
          </p>
          <p className="text-secondary mt-4">
            All actions are contained in the footer with proper alignment.
          </p>
        </Modal>
      </section>

      {/* DataTable */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Data Table</h2>
        <DataTable
          columns={columns}
          data={data}
          sortable
          selectable
          pagination={{
            page: 1,
            pageSize: 25,
            total: 3,
            onPageChange: (page) => console.log('Page:', page),
            onPageSizeChange: (size) => console.log('Page size:', size),
          }}
          toolbar={{
            title: 'Team Members',
            actions: (
              <Button variant="primary" size="sm">
                Add Member
              </Button>
            ),
          }}
        />
      </section>

      {/* Empty State Example */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Empty State</h2>
        <DataTable
          columns={columns}
          data={[]}
          toolbar={{
            title: 'Empty Table',
          }}
        />
      </section>

      {/* Loading State Example */}
      <section>
        <h2 className="text-xl font-semibold text-primary mb-4">Loading State</h2>
        <DataTable
          columns={columns}
          data={[]}
          loading
          toolbar={{
            title: 'Loading Table',
          }}
        />
      </section>
    </div>
  )
}
