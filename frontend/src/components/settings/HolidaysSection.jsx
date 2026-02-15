import { useState, useEffect } from 'react'
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../../api/client'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
)

const ChevronRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
)

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
)

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)

const TYPE_BADGES = {
    fixed: { label: 'Nazionale', className: 'bg-accent-blue/20 text-accent-blue' },
    variable: { label: 'Variabile', className: 'bg-accent-purple/20 text-accent-purple' },
    custom: { label: 'Personalizzato', className: 'bg-accent-green/20 text-success' },
}

function formatDayOfWeek(dateStr) {
    try {
        const d = new Date(dateStr + 'T00:00:00')
        return format(d, 'EEEE', { locale: it })
    } catch {
        return ''
    }
}

function formatDateDisplay(dateStr) {
    try {
        const d = new Date(dateStr + 'T00:00:00')
        return format(d, 'd MMMM', { locale: it })
    } catch {
        return dateStr
    }
}

function AddHolidayModal({ isOpen, onClose, onSave, year }) {
    const [name, setName] = useState('')
    const [dateValue, setDateValue] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setName('')
            setDateValue('')
            setError('')
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim() || !dateValue) return

        setSaving(true)
        setError('')
        try {
            await onSave(name.trim(), dateValue)
            onClose()
        } catch (err) {
            setError(err.message || 'Errore durante il salvataggio')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface border border-solid rounded-xl p-6 w-full max-w-md shadow-lg">
                <h3 className="text-lg font-semibold text-primary mb-4">Aggiungi Festivita'</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-secondary mb-1">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-surface border border-solid rounded-lg px-3 py-2 text-primary focus:border-focus focus:outline-none"
                            placeholder="Es. Santo Patrono"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-secondary mb-1">Data</label>
                        <input
                            type="date"
                            value={dateValue}
                            onChange={(e) => setDateValue(e.target.value)}
                            min={`${year}-01-01`}
                            max={`${year}-12-31`}
                            className="w-full bg-surface border border-solid rounded-lg px-3 py-2 text-primary focus:border-focus focus:outline-none"
                        />
                    </div>
                    {error && (
                        <p className="text-error text-sm">{error}</p>
                    )}
                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-surface text-secondary hover:bg-surface-hover transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || !dateValue || saving}
                            className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {saving ? 'Salvataggio...' : 'Aggiungi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function HolidaysSection() {
    const [year, setYear] = useState(new Date().getFullYear())
    const [holidays, setHolidays] = useState([])
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState({ total: 0, active: 0 })
    const [modalOpen, setModalOpen] = useState(false)

    const loadHolidays = async () => {
        setLoading(true)
        try {
            const data = await getHolidays(year)
            setHolidays(data.holidays || [])
            setStats({ total: data.total || 0, active: data.active || 0 })
        } catch (err) {
            console.error('Error loading holidays:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadHolidays()
    }, [year])

    const handleToggle = async (holiday) => {
        try {
            await updateHoliday(holiday.id, { is_active: !holiday.is_active })
            await loadHolidays()
        } catch (err) {
            console.error('Error toggling holiday:', err)
        }
    }

    const handleAdd = async (name, holidayDate) => {
        await createHoliday({ name, holiday_date: holidayDate, country: 'IT' })
        await loadHolidays()
    }

    const handleDelete = async (holidayId) => {
        try {
            await deleteHoliday(holidayId)
            await loadHolidays()
        } catch (err) {
            console.error('Error deleting holiday:', err)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-primary">Festivita'</h2>
                    <p className="text-sm text-tertiary mt-1">
                        {stats.active} festivita' attive su {stats.total} totali
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Year selector */}
                    <div className="flex items-center gap-1 bg-surface border border-solid rounded-lg">
                        <button
                            onClick={() => setYear(y => y - 1)}
                            className="p-2 hover:bg-surface rounded-l-lg transition-colors text-secondary hover:text-primary"
                        >
                            <ChevronLeftIcon />
                        </button>
                        <span className="px-3 py-2 text-primary font-semibold min-w-[60px] text-center">
                            {year}
                        </span>
                        <button
                            onClick={() => setYear(y => y + 1)}
                            className="p-2 hover:bg-surface rounded-r-lg transition-colors text-secondary hover:text-primary"
                        >
                            <ChevronRightIcon />
                        </button>
                    </div>
                    {/* Add button */}
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                    >
                        <PlusIcon />
                        <span>Aggiungi</span>
                    </button>
                </div>
            </div>

            {/* Holiday list */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-tertiary">Caricamento...</div>
                ) : holidays.length === 0 ? (
                    <div className="p-8 text-center text-tertiary">
                        Nessuna festivita' per il {year}
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-solid">
                                <th className="text-left px-6 py-3 text-tertiary text-sm font-medium">Data</th>
                                <th className="text-left px-6 py-3 text-tertiary text-sm font-medium">Giorno</th>
                                <th className="text-left px-6 py-3 text-tertiary text-sm font-medium">Nome</th>
                                <th className="text-left px-6 py-3 text-tertiary text-sm font-medium">Tipo</th>
                                <th className="text-center px-6 py-3 text-tertiary text-sm font-medium">Attiva</th>
                                <th className="text-right px-6 py-3 text-tertiary text-sm font-medium">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holidays.map((holiday) => {
                                const badge = TYPE_BADGES[holiday.holiday_type] || TYPE_BADGES.custom
                                const dayOfWeek = formatDayOfWeek(holiday.holiday_date)
                                const isWeekend = dayOfWeek === 'sabato' || dayOfWeek === 'domenica'

                                return (
                                    <tr
                                        key={holiday.id}
                                        className={`border-b border-solid/50 hover:bg-surface/30 transition-colors ${
                                            !holiday.is_active ? 'opacity-50' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-3 text-secondary text-sm">
                                            {formatDateDisplay(holiday.holiday_date)}
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            <span className={`capitalize ${isWeekend ? 'text-tertiary' : 'text-secondary'}`}>
                                                {dayOfWeek}
                                            </span>
                                            {isWeekend && (
                                                <span className="ml-2 text-xs text-tertiary">(weekend)</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-primary text-sm font-medium">
                                            {holiday.name}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <button
                                                onClick={() => handleToggle(holiday)}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                    holiday.is_active ? 'bg-accent-green' : 'bg-surface-hover'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                        holiday.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                                                    }`}
                                                    style={{ transform: `translateX(${holiday.is_active ? '18px' : '2px'})` }}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {holiday.holiday_type === 'custom' && (
                                                <button
                                                    onClick={() => handleDelete(holiday.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-tertiary hover:text-error transition-colors"
                                                    title="Elimina"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Holiday Modal */}
            <AddHolidayModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleAdd}
                year={year}
            />
        </div>
    )
}
