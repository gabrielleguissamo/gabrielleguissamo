import React, { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { AppSession, Patient } from '../../types'
import {
  isGoogleCalendarConnected,
  getGoogleCalendarAuthUrl,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from '../../lib/googleCalendar'

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)

const statusColors = {
  confirmado: 'bg-green-100 text-green-700 border-l-2 border-green-500',
  pendente: 'bg-yellow-50 text-yellow-700 border-l-2 border-yellow-400',
  cancelado: 'bg-gray-100 text-gray-500 border-l-2 border-gray-300 line-through',
}

type SessionWithPatient = AppSession & { patients?: { name: string } }

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Monday = 0
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function Agenda() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<SessionWithPatient[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'semana' | 'dia' | 'mes'>('semana')
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)

  const [form, setForm] = useState({
    patient_id: '', date: '', time: '', duration: '60',
    type: 'presencial' as AppSession['type'], notes: '', value: '',
    recorrente: false, frequencia: 'semanal' as 'semanal' | 'quinzenal', repeticoes: '8',
  })

  async function fetchSessions() {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('sessions')
      .select('*, patients(name), google_event_id')
      .eq('user_id', user.id)
    if (error) {
      setToast({ message: 'Erro ao carregar sessões', type: 'error' })
    } else {
      setSessions((data ?? []) as SessionWithPatient[])
    }
    setLoading(false)
  }

  async function fetchPatients() {
    if (!user) return
    const { data } = await supabase
      .from('patients')
      .select('id, name, status, session_value')
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .order('name', { ascending: true })
    if (data) setPatients(data as Patient[])
  }

  useEffect(() => { fetchSessions(); fetchPatients() }, [user])

  useEffect(() => {
    if (!user) return
    isGoogleCalendarConnected(user.id).then(setGoogleConnected)
  }, [user])

  function handleConnectGoogle() {
    const redirectUri = `${window.location.origin}/auth/google-calendar-callback`
    window.location.href = getGoogleCalendarAuthUrl(redirectUri)
  }

  function gerarDatasRecorrencia(): string[] {
    if (!form.recorrente) return [form.date]
    const step = form.frequencia === 'quinzenal' ? 14 : 7
    const n = Math.min(Math.max(parseInt(form.repeticoes) || 1, 1), 52)
    const base = new Date(form.date + 'T00:00:00')
    const datas: string[] = []
    for (let i = 0; i < n; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i * step)
      datas.push(toISO(d))
    }
    return datas
  }

  async function handleSave() {
    if (!user || !form.patient_id || !form.date || !form.time) return
    setSaving(true)

    const datas = gerarDatasRecorrencia()
    const rows = datas.map(date => ({
      user_id: user.id,
      patient_id: form.patient_id,
      date,
      time: form.time,
      duration: parseInt(form.duration) as AppSession['duration'],
      type: form.type,
      status: 'pendente' as const,
      notes: form.notes || null,
      value: form.value ? parseFloat(form.value) : null,
    }))

    const { data: inserted, error } = await supabase.from('sessions').insert(rows).select('id, date, time')

    if (error || !inserted) {
      setSaving(false)
      setToast({ message: 'Erro ao salvar sessão', type: 'error' })
      return
    }

    // Sync to Google Calendar if connected (melhor esforço, uma por ocorrência)
    let syncErrors = 0
    if (googleConnected) {
      const patient = patients.find(p => p.id === form.patient_id)
      for (const row of inserted) {
        try {
          const googleEventId = await createGoogleCalendarEvent({
            title: patient?.name ?? 'Paciente',
            date: row.date,
            time: row.time,
            duration: parseInt(form.duration),
            description: form.notes || undefined,
            type: form.type,
          })
          await supabase.from('sessions').update({ google_event_id: googleEventId }).eq('id', row.id)
        } catch {
          syncErrors++
        }
      }
    }

    const label = inserted.length > 1 ? `${inserted.length} sessões recorrentes criadas!` : 'Sessão salva!'
    if (googleConnected && syncErrors === 0) {
      setToast({ message: `${label} Sincronizado com o Google Agenda.`, type: 'success' })
    } else if (googleConnected && syncErrors > 0) {
      setToast({ message: `${label} (${syncErrors} não sincronizaram com o Google Agenda)`, type: 'success' })
    } else {
      setToast({ message: label, type: 'success' })
    }

    setSaving(false)
    setShowModal(false)
    setForm({ patient_id: '', date: '', time: '', duration: '60', type: 'presencial', notes: '', value: '', recorrente: false, frequencia: 'semanal', repeticoes: '8' })
    fetchSessions()
  }

  async function createSessionTransaction(session: SessionWithPatient) {
    if (!user) return
    const { data: existing } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('session_id', session.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'cancelado') {
        const { error } = await supabase
          .from('transactions')
          .update({ status: 'pendente' })
          .eq('id', existing.id)
        if (error) {
          setToast({ message: 'Sessão confirmada, mas houve erro ao reativar lançamento financeiro', type: 'error' })
        }
      }
      return
    }

    const patient = patients.find(p => p.id === session.patient_id)
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      patient_id: session.patient_id,
      session_id: session.id,
      date: session.date,
      amount: session.value ?? patient?.session_value ?? 0,
      type: 'sessao',
      status: 'pendente',
    })
    if (error) {
      setToast({ message: 'Sessão confirmada, mas houve erro ao gerar lançamento financeiro', type: 'error' })
    }
  }

  async function cancelSessionTransaction(sessionId: string) {
    await supabase
      .from('transactions')
      .update({ status: 'cancelado' })
      .eq('session_id', sessionId)
      .eq('status', 'pendente')
  }

  async function toggleStatus(session: SessionWithPatient) {
    const nextStatus: Record<AppSession['status'], AppSession['status']> = {
      pendente: 'confirmado',
      confirmado: 'cancelado',
      cancelado: 'pendente',
    }
    const newStatus = nextStatus[session.status]
    const { error } = await supabase
      .from('sessions')
      .update({ status: newStatus })
      .eq('id', session.id)
    if (error) {
      setToast({ message: 'Erro ao atualizar status', type: 'error' })
    } else {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: newStatus } : s))
      if (newStatus === 'confirmado') {
        await createSessionTransaction(session)
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: { type: 'confirmacao', sessionId: session.id },
          })
        } catch {
          // Silently ignore email errors
        }
      } else if (newStatus === 'cancelado') {
        await cancelSessionTransaction(session.id)
        // If cancelling and has a Google event, delete it
        if (session.google_event_id && googleConnected) {
          try {
            await deleteGoogleCalendarEvent(session.google_event_id)
            await supabase.from('sessions').update({ google_event_id: null }).eq('id', session.id)
            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, google_event_id: null } : s))
          } catch {
            // Silently ignore Google sync errors
          }
        }
      } else if (newStatus === 'pendente') {
        // Reactivating a cancelled session: recreate the Google Calendar event if needed
        if (!session.google_event_id && googleConnected) {
          try {
            const patient = patients.find(p => p.id === session.patient_id)
            const googleEventId = await createGoogleCalendarEvent({
              title: patient?.name ?? session.patients?.name ?? 'Paciente',
              date: session.date,
              time: session.time,
              duration: session.duration,
              description: session.notes ?? undefined,
              type: session.type,
            })
            await supabase.from('sessions').update({ google_event_id: googleEventId }).eq('id', session.id)
            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, google_event_id: googleEventId } : s))
          } catch {
            // Silently ignore Google sync errors
          }
        }
      }
    }
  }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function formatWeekLabel() {
    const start = weekDates[0]
    const end = weekDates[6]
    const startStr = start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    const endStr = end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    return `${startStr} a ${endStr}`
  }

  function getSessionForCell(dayIndex: number, hour: string): SessionWithPatient | undefined {
    const dateStr = toISO(weekDates[dayIndex])
    return sessions.find(s => s.date === dateStr && s.time.padStart(5, '0').slice(0, 5) === hour)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1">
          {(['dia', 'semana', 'mes'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-green-500 text-white' : 'text-ink-4 hover:text-ink'}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {googleConnected ? (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              Google Agenda conectado ✓
            </span>
          ) : (
            <Button variant="outline" onClick={handleConnectGoogle}>
              Conectar Google Agenda
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nova sessão
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <button className="p-1 text-ink-4 hover:text-ink" onClick={() => setWeekStart(w => addDays(w, -7))}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-ink">{formatWeekLabel()}</span>
          <button className="p-1 text-ink-4 hover:text-ink" onClick={() => setWeekStart(w => addDays(w, 7))}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-auto">
            <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: '700px' }}>
              <div className="border-b border-r h-10" />
              {DAYS.map((d, i) => (
                <div key={d} className="border-b border-r h-10 flex flex-col items-center justify-center text-sm font-medium text-ink-3">
                  <span>{d}</span>
                  <span className="text-xs text-ink-5">{weekDates[i].getDate()}</span>
                </div>
              ))}
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="border-b border-r px-2 py-1 text-xs text-ink-5">{hour}</div>
                  {DAYS.map((_, dayIdx) => {
                    const session = getSessionForCell(dayIdx, hour)
                    return (
                      <div key={dayIdx} className="border-b border-r h-12 p-1 relative">
                        {session && (
                          <button
                            className={`w-full text-xs rounded px-1 py-0.5 truncate text-left ${statusColors[session.status]}`}
                            onClick={() => toggleStatus(session)}
                            title="Clique para mudar status"
                          >
                            {session.patients?.name ?? 'Paciente'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="session-modal-title">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 id="session-modal-title" className="font-serif text-lg font-semibold">Nova sessão</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-ink-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Paciente</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.patient_id}
                  onChange={e => {
                    const patientId = e.target.value
                    const patient = patients.find(p => p.id === patientId)
                    setForm(f => ({
                      ...f,
                      patient_id: patientId,
                      value: patient?.session_value != null ? String(patient.session_value) : f.value,
                    }))
                  }}
                >
                  <option value="">Selecione...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink-2 block mb-1">{form.recorrente ? 'Data de início' : 'Data'}</label>
                  <input
                    type="date"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-2 block mb-1">Horário</label>
                  <input
                    type="time"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.recorrente}
                    onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))}
                    className="accent-green-500"
                  />
                  <span className="text-sm font-medium text-ink-2">Sessão recorrente?</span>
                </label>
                {form.recorrente && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-medium text-ink-4 block mb-1">Frequência</label>
                      <select
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500"
                        value={form.frequencia}
                        onChange={e => setForm(f => ({ ...f, frequencia: e.target.value as 'semanal' | 'quinzenal' }))}
                      >
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-4 block mb-1">Repetir por (semanas)</label>
                      <input
                        type="number"
                        min={1}
                        max={52}
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500"
                        value={form.repeticoes}
                        onChange={e => setForm(f => ({ ...f, repeticoes: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Duração</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                >
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Tipo</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as AppSession['type'] }))}
                >
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="domiciliar">Domiciliar</option>
                  <option value="escola">Escola</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Valor da sessão (R$)</label>
                <input
                  type="number"
                  placeholder="0,00"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                />
                <p className="text-xs text-ink-5 mt-1">
                  Ao confirmar a sessão, este valor gera o lançamento no Financeiro para este paciente.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Observações</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none h-20"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button fullWidth onClick={handleSave} disabled={saving || !form.patient_id || !form.date || !form.time}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
