import { useState } from 'react'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { formatHours, chartColors } from '../hooks/useData'

/**
 * Custom tooltip component for all charts
 */
function CustomTooltip({ active, payload, label, formatter }) {
    if (!active || !payload?.length) return null

    return (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
            <p className="text-dark-300 text-sm mb-2">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-dark-200 font-medium">
                        {formatter ? formatter(entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

/**
 * Trend Area Chart - for daily/weekly trends
 */
export function TrendChart({ data, dataKey = 'hours', height = 300 }) {
    // Format dates for display
    const formattedData = data.map(item => ({
        ...item,
        dateLabel: format(new Date(item.date), 'd MMM', { locale: it }),
    }))

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    tickFormatter={(value) => `${value}h`}
                    dx={-10}
                />
                <Tooltip
                    content={<CustomTooltip formatter={(v) => formatHours(v)} />}
                />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke="#667eea"
                    strokeWidth={2}
                    fill="url(#colorHours)"
                    dot={false}
                    activeDot={{ r: 6, fill: '#667eea', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={800}
                    animationEasing="ease-out"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

/**
 * Bar Chart - for comparing teams/users/epics
 */
export function ComparisonBarChart({ data, dataKey = 'total_hours', nameKey = 'name', height = 300, horizontal = false }) {
    if (horizontal) {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={true} vertical={false} />
                    <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8b949e', fontSize: 12 }}
                        tickFormatter={(value) => `${value}h`}
                    />
                    <YAxis
                        type="category"
                        dataKey={nameKey}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#c9d1d9', fontSize: 12 }}
                        width={90}
                    />
                    <Tooltip
                        content={<CustomTooltip formatter={(v) => formatHours(v)} />}
                    />
                    <Bar
                        dataKey={dataKey}
                        fill="#667eea"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={30}
                        animationDuration={600}
                        animationEasing="ease-in-out"
                    >
                        {data.map((entry, index) => (
                            <Cell key={index} fill={chartColors[index % chartColors.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis
                    dataKey={nameKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    tickFormatter={(value) => `${value}h`}
                    dx={-10}
                />
                <Tooltip
                    content={<CustomTooltip formatter={(v) => formatHours(v)} />}
                />
                <Bar
                    dataKey={dataKey}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                    animationDuration={600}
                    animationEasing="ease-in-out"
                >
                    {data.map((entry, index) => (
                        <Cell key={index} fill={chartColors[index % chartColors.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}

/**
 * Grouped Bar Chart - for comparing multiple series (e.g. instances) per category (e.g. user)
 */
export function GroupedBarChart({ data, keys, height = 300, colors = chartColors }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal vertical={false} />
                <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    tickFormatter={(value) => `${value}h`}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#c9d1d9', fontSize: 12 }}
                    width={90}
                />
                <Tooltip
                    content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                            <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
                                <p className="text-dark-300 text-sm mb-2">{payload[0]?.payload?.full_name || label}</p>
                                {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-dark-400 text-sm">{entry.name}:</span>
                                        <span className="text-dark-200 font-medium">{formatHours(entry.value)}</span>
                                    </div>
                                ))}
                            </div>
                        )
                    }}
                />
                <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ color: '#c9d1d9', fontSize: 12 }}
                />
                {keys.map((key, i) => (
                    <Bar
                        key={key}
                        dataKey={key}
                        name={key}
                        fill={colors[i % colors.length]}
                        radius={[0, 4, 4, 0]}
                        maxBarSize={20}
                        animationDuration={600}
                        animationEasing="ease-in-out"
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    )
}


/**
 * Pie/Donut Chart - for distribution
 */
export function DistributionChart({ data, dataKey = 'value', nameKey = 'name', height = 300, innerRadius = 60 }) {
    const [hiddenItems, setHiddenItems] = useState(new Set())

    const toggleItem = (name) => {
        setHiddenItems(prev => {
            const next = new Set(prev)
            if (next.has(name)) {
                next.delete(name)
            } else {
                // Don't allow hiding all items
                if (next.size < data.length - 1) {
                    next.add(name)
                }
            }
            return next
        })
    }

    const visibleData = data.filter(item => !hiddenItems.has(item[nameKey]))
    const total = visibleData.reduce((sum, item) => sum + item[dataKey], 0)

    // Map each original item to its fixed color
    const colorMap = {}
    data.forEach((item, index) => {
        colorMap[item[nameKey]] = chartColors[index % chartColors.length]
    })

    return (
        <div>
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={visibleData}
                        dataKey={dataKey}
                        nameKey={nameKey}
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={innerRadius + 40}
                        paddingAngle={2}
                        label={false}
                        labelLine={false}
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {visibleData.map((entry) => (
                            <Cell
                                key={entry[nameKey]}
                                fill={colorMap[entry[nameKey]]}
                                stroke="transparent"
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const item = payload[0]
                            return (
                                <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
                                    <p className="text-dark-200 font-medium">{item.payload.full_name || item.name}</p>
                                    <p className="text-dark-300">{formatHours(item.value)}</p>
                                    <p className="text-dark-400 text-sm">
                                        {((item.value / total) * 100).toFixed(1)}% del totale
                                    </p>
                                </div>
                            )
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {/* Custom clickable legend below the chart */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 px-2">
                {data.map((item) => {
                    const isHidden = hiddenItems.has(item[nameKey])
                    const color = colorMap[item[nameKey]]
                    return (
                        <button
                            key={item[nameKey]}
                            onClick={() => toggleItem(item[nameKey])}
                            className={`flex items-center gap-1.5 text-xs transition-opacity duration-200 ${isHidden ? 'opacity-30' : 'opacity-100'} hover:opacity-80`}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                            />
                            <span className="text-dark-300">{item.full_name || item[nameKey]}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/**
 * Multi-series Trend Area Chart - for comparing trends across JIRA instances
 */
export function MultiTrendChart({ series, height = 300 }) {
    // series: [{ name: string, data: [{date, hours}], color: string }]
    if (!series || series.length === 0) return null

    // Merge all dates from all series into a single dataset
    const dateMap = {}
    series.forEach(s => {
        s.data.forEach(item => {
            const key = item.date
            if (!dateMap[key]) {
                dateMap[key] = { date: key, dateLabel: format(new Date(key), 'd MMM', { locale: it }) }
            }
            dateMap[key][s.name] = item.hours
        })
    })

    const mergedData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={mergedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    {series.map((s, i) => (
                        <linearGradient key={s.name} id={`multiColor${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    tickFormatter={(value) => `${value}h`}
                    dx={-10}
                />
                <Tooltip
                    content={<CustomTooltip formatter={(v) => formatHours(v)} />}
                />
                <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ color: '#c9d1d9', fontSize: 12 }}
                />
                {series.map((s, i) => (
                    <Area
                        key={s.name}
                        type="monotone"
                        dataKey={s.name}
                        name={s.name}
                        stroke={s.color}
                        strokeWidth={2}
                        fill={`url(#multiColor${i})`}
                        dot={false}
                        activeDot={{ r: 5, fill: s.color, stroke: '#fff', strokeWidth: 2 }}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    )
}

/**
 * Chart Card - wrapper for charts with title
 */
export function ChartCard({ title, subtitle, children, className = '' }) {
    return (
        <div className={`glass-card p-6 ${className}`}>
            <div className="mb-4">
                <h3 className="font-semibold text-dark-100">{title}</h3>
                {subtitle && <p className="text-sm text-dark-400">{subtitle}</p>}
            </div>
            {children}
        </div>
    )
}

/**
 * Mini Sparkline - small inline chart
 */
export function Sparkline({ data, dataKey = 'hours', width = 100, height = 30 }) {
    return (
        <ResponsiveContainer width={width} height={height}>
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke="#667eea"
                    strokeWidth={1.5}
                    fill="url(#sparklineGradient)"
                    dot={false}
                    animationDuration={500}
                    animationEasing="ease-out"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
