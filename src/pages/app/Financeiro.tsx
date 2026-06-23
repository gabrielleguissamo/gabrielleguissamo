import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Toast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { Transaction, Patient } from '../../types'

const statusVariant = { pago: 'success' as const, pendente: 'warning' as const, cancelado: 'danger' as const }
const statusLabel = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' }

type TransactionWithPatient = Transaction & { patients?: { name: string } }

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getMonthOptions() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return months
}

export function Financeiro() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<TransactionWithPatient[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const monthOptions = getMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].key)
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmedSessions, setConfirmedSessions] = useState(0)

  const [form, setForm] = useState({
    patient_id: '', date: '', amount: '', type: 'sessao' as Transaction['type'],
    payment_method: 'PIX', status: 'pendente' as Transaction['status'],
    mensesRepetir: '1',
  })

  async function fetchTransactions() {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, patients(name)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    if (error) {
      setToast({ message: 'Erro ao carregar lançamentos', type: 'error' })
    } else {
      setTransactions((data ?? []) as TransactionWithPatient[])
    }
    setLoading(false)
  }

  async function fetchPatients() {
    if (!user) return
    const { data } = await supabase
      .from('patients')
      .select('id, name, status, session_value')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
    if (data) setPatients(data as Patient[])
  }

  async function fetchConfirmedSessions() {
    if (!user) return
    // 'date' e coluna nativa do Postgres: `${selectedMonth}-32` lanca erro de parsing
    // (dia 32 invalido) e fazia a consulta falhar silenciosamente, travando o contador em 0.
    const [ano, mes] = selectedMonth.split('-').map(Number)
    const inicioMesSeguinte = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    const { count, error } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'confirmado')
      .gte('date', `${selectedMonth}-01`)
      .lt('date', inicioMesSeguinte)
    if (error) {
      console.error('Erro ao buscar sessões confirmadas:', error)
    }
    setConfirmedSessions(count ?? 0)
  }

  useEffect(() => { fetchTransactions(); fetchPatients() }, [user])
  useEffect(() => { fetchConfirmedSessions() }, [user, selectedMonth])

  async function handleSave() {
    if (!user || !form.date || !form.amount || parseFloat(form.amount) <= 0) return
    setSaving(true)

    const n = form.type === 'mensalidade' ? Math.min(Math.max(parseInt(form.mensesRepetir) || 1, 1), 24) : 1
    const baseDate = new Date(form.date + 'T00:00:00')
    const diaOriginal = baseDate.getDate()
    const pad = (v: number) => String(v).padStart(2, '0')
    const rows = Array.from({ length: n }, (_, i) => {
      // Calcula ano/mes alvo e usa o ultimo dia do mes se o dia original nao existir
      // (ex: mensalidade no dia 31 de janeiro -> 28/29 de fevereiro, nunca pula para marco).
      const mesAlvo = baseDate.getMonth() + i
      const ultimoDiaDoMes = new Date(baseDate.getFullYear(), mesAlvo + 1, 0).getDate()
      const dia = Math.min(diaOriginal, ultimoDiaDoMes)
      const d = new Date(baseDate.getFullYear(), mesAlvo, dia)
      return {
        user_id: user.id,
        patient_id: form.patient_id || null,
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        amount: parseFloat(form.amount),
        type: form.type,
        payment_method: form.payment_method,
        status: i === 0 ? form.status : 'pendente',
      }
    })

    const { error } = await supabase.from('transactions').insert(rows)
    setSaving(false)
    if (error) {
      setToast({ message: 'Erro ao salvar lançamento', type: 'error' })
    } else {
      setToast({ message: n > 1 ? `${n} mensalidades geradas!` : 'Lançamento salvo!', type: 'success' })
      setShowModal(false)
      setForm({ patient_id: '', date: '', amount: '', type: 'sessao', payment_method: 'PIX', status: 'pendente', mensesRepetir: '1' })
      fetchTransactions()
    }
  }

  async function handleMarkAsPaid(id: string) {
    const { error } = await supabase.from('transactions').update({ status: 'pago' }).eq('id', id)
    if (error) {
      setToast({ message: 'Erro ao atualizar lançamento', type: 'error' })
    } else {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'pago' } : t))
      setToast({ message: 'Pagamento confirmado!', type: 'success' })
    }
  }

  const filtered = transactions.filter(t => {
    const monthMatch = t.date.startsWith(selectedMonth)
    const statusMatch = !statusFilter || t.status === statusFilter
    return monthMatch && statusMatch
  })

  // Metrics from current month transactions
  const currentMonth = transactions.filter(t => t.date.startsWith(selectedMonth))
  const monthRevenue = currentMonth.filter(t => t.status === 'pago').reduce((sum, t) => sum + t.amount, 0)
  const paidSessions = currentMonth.filter(t => t.type === 'sessao' && t.status === 'pago')
  const avgTicket = paidSessions.length > 0 ? paidSessions.reduce((s, t) => s + t.amount, 0) / paidSessions.length : 0
  const overdue = currentMonth.filter(t => t.status === 'pendente').reduce((sum, t) => sum + t.amount, 0)

  const metrics = [
    { label: 'Receita do mês', value: formatBRL(monthRevenue), icon: TrendingUp, color: 'text-green-500' },
    { label: 'Sessões realizadas', value: String(confirmedSessions), icon: Calendar, color: 'text-blue-500' },
    { label: 'Ticket médio', value: formatBRL(avgTicket), icon: DollarSign, color: 'text-green-400' },
    { label: 'Inadimplência', value: formatBRL(overdue), icon: AlertCircle, color: 'text-orange-400' },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-ink-4">{label}</span>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <select
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <select
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Novo lançamento
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-4 border-b border-gray-100">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Paciente</th>
                  <th className="pb-3 font-medium">Tipo</th>
                  <th className="pb-3 font-medium">Valor</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-5">Nenhum lançamento encontrado.</td>
                  </tr>
                ) : filtered.map(t => (
                  <tr key={t.id}>
                    <td className="py-3 text-ink-4">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 text-ink font-medium">{t.patients?.name ?? '—'}</td>
                    <td className="py-3 text-ink-3 capitalize">{t.type}{t.session_id ? ' (agenda)' : ''}</td>
                    <td className="py-3 font-medium text-ink">{formatBRL(t.amount)}</td>
                    <td className="py-3"><Badge variant={statusVariant[t.status]}>{statusLabel[t.status]}</Badge></td>
                    <td className="py-3 text-right">
                      {t.status === 'pendente' && (
                        <button className="text-sm text-green-600 hover:underline font-medium" onClick={() => handleMarkAsPaid(t.id)}>
                          Confirmar pagamento
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <Modal onClose={() => setShowModal(false)} maxWidth="max-w-md">
            <h3 className="font-serif text-lg font-semibold text-ink mb-4 pr-6">Novo lançamento</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Paciente</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.patient_id}
                  onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                >
                  <option value="">Sem paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink-2 block mb-1">Data</label>
                  <input
                    type="date"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-2 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    placeholder="0,00"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Tipo</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as Transaction['type'] }))}
                >
                  <option value="sessao">Sessão</option>
                  <option value="avaliacao">Avaliação</option>
                  <option value="material">Material</option>
                  <option value="mensalidade">Mensalidade</option>
                </select>
              </div>
              {form.type === 'mensalidade' && (
                <div>
                  <label className="text-sm font-medium text-ink-2 block mb-1">Repetir por quantos meses</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                    value={form.mensesRepetir}
                    onChange={e => setForm(f => ({ ...f, mensesRepetir: e.target.value }))}
                  />
                  <p className="text-xs text-ink-5 mt-1">Gera um lançamento por mês, na mesma data, a partir da data informada.</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Forma de pagamento</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                >
                  <option>PIX</option>
                  <option>Cartão de crédito</option>
                  <option>Cartão de débito</option>
                  <option>Dinheiro</option>
                  <option>Transferência</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Status</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as Transaction['status'] }))}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button fullWidth onClick={handleSave} disabled={saving || !form.date || !form.amount}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
        </Modal>
      )}

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
