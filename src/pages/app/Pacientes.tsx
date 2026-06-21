import { useState, useEffect } from 'react'
import { Plus, Search, X, Trash2, Pencil, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Toast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { PLAN_LIMITS } from '../../lib/planLimits'
import { formatCPF, formatPhone } from '../../lib/masks'
import { calcAge } from '../../lib/formatDate'
import type { Patient } from '../../types'

const statusVariant = { ativo: 'success' as const, em_espera: 'warning' as const, inativo: 'neutral' as const }
const statusLabel = { ativo: 'Ativo', em_espera: 'Em espera', inativo: 'Inativo' }

function initials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Pacientes() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showLimitModal, setShowLimitModal] = useState(() => sessionStorage.getItem('limitModalDismissed') !== 'true')
  const [visibleCount, setVisibleCount] = useState(30)

  // Form state
  const [form, setForm] = useState<{
    name: string; birth_date: string; cpf: string; diagnosis: string;
    guardian_name: string; phone: string; email: string; insurance: string;
    status: Patient['status']; notes: string; session_value: string;
  }>({
    name: '', birth_date: '', cpf: '', diagnosis: '',
    guardian_name: '', phone: '', email: '', insurance: '',
    status: 'ativo', notes: '', session_value: '',
  })

  async function fetchPatients() {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      setToast({ message: 'Erro ao carregar pacientes', type: 'error' })
    } else {
      setPatients((data ?? []) as Patient[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchPatients() }, [user])

  const emptyForm = {
    name: '', birth_date: '', cpf: '', diagnosis: '',
    guardian_name: '', phone: '', email: '', insurance: '',
    status: 'ativo' as Patient['status'], notes: '', session_value: '',
  }

  function openNewPatient() {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEditPatient(p: Patient) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      birth_date: p.birth_date ?? '',
      cpf: p.cpf ?? '',
      diagnosis: p.diagnosis ?? '',
      guardian_name: p.guardian_name ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      insurance: p.insurance ?? '',
      status: p.status,
      notes: '',
      session_value: p.session_value != null ? String(p.session_value) : '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!user || !form.name) return
    if (!editingId && limitReached) {
      setToast({ message: `Limite de ${patientLimit} pacientes do plano ${planLabel} atingido. Faça upgrade para cadastrar mais.`, type: 'error' })
      return
    }
    setSaving(true)
    const sessionValue = form.session_value ? parseFloat(form.session_value) : null
    const payload = {
      name: form.name,
      birth_date: form.birth_date || null,
      cpf: form.cpf || null,
      diagnosis: form.diagnosis || null,
      guardian_name: form.guardian_name || null,
      phone: form.phone || null,
      email: form.email || null,
      insurance: form.insurance || null,
      status: form.status,
      session_value: sessionValue,
    }

    if (editingId) {
      const { error } = await supabase.from('patients').update(payload).eq('id', editingId)
      setSaving(false)
      if (error) {
        setToast({ message: 'Erro ao salvar paciente', type: 'error' })
        return
      }
      setToast({ message: 'Paciente atualizado com sucesso!', type: 'success' })
    } else {
      const { data: inserted, error } = await supabase.from('patients').insert({
        user_id: user.id,
        ...payload,
      }).select('id').single()

      if (error) {
        setSaving(false)
        setToast({ message: 'Erro ao salvar paciente', type: 'error' })
        return
      }

      if (sessionValue && sessionValue > 0 && inserted) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          patient_id: inserted.id,
          date: new Date().toISOString().slice(0, 10),
          amount: sessionValue,
          type: 'sessao',
          status: 'pendente',
        })
      }

      setSaving(false)
      setToast({ message: 'Paciente salvo com sucesso!', type: 'success' })
    }

    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    fetchPatients()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Deseja excluir este paciente?')) return
    const { error } = await supabase.from('patients').delete().eq('id', id)
    if (error) {
      setToast({ message: 'Erro ao excluir paciente', type: 'error' })
    } else {
      setToast({ message: 'Paciente excluído', type: 'success' })
      setPatients(prev => prev.filter(p => p.id !== id))
    }
  }

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const plan = profile?.plan ?? 'inicial'
  const patientLimit = PLAN_LIMITS[plan].patients
  const limitReached = patients.length >= patientLimit
  const planLabel = plan === 'inicial' ? 'Inicial' : plan === 'profissional' ? 'Profissional' : 'Business'
  const isUnlimited = !Number.isFinite(patientLimit)
  const usagePercent = isUnlimited ? 0 : Math.min(100, (patients.length / patientLimit) * 100)
  const nearLimit = !isUnlimited && usagePercent >= 90 && !limitReached
  const barColor = usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 90 ? 'bg-amber-500' : 'bg-green-500'

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink">Meus Pacientes</h2>
        <Button onClick={openNewPatient} disabled={limitReached}>
          <Plus className="w-4 h-4" /> Novo paciente
        </Button>
      </div>

      {!isUnlimited && (
        <div>
          <div className="flex items-center justify-between text-sm text-ink-4 mb-1">
            <span>{patients.length} de {patientLimit} pacientes (plano {planLabel})</span>
            <span>{Math.round(usagePercent)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${usagePercent}%` }} />
          </div>
        </div>
      )}

      {limitReached && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 flex-shrink-0" />
            Você atingiu o limite de {patientLimit} pacientes do plano {planLabel}. Faça upgrade para cadastrar mais pacientes.
          </span>
          <a href="/configuracoes" className="font-medium underline whitespace-nowrap">Fazer upgrade</a>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-5" />
        <input
          className="w-full h-12 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-green-500"
          placeholder="Buscar paciente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.slice(0, visibleCount).map(p => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                  {initials(p.name)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-ink-4">
                    {p.birth_date ? `${calcAge(p.birth_date)} anos` : '—'}
                    {p.session_value ? ` · R$ ${Number(p.session_value).toFixed(2).replace('.', ',')}/sessão` : ''}
                  </p>
                </div>
                <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
              </div>
              <p className="text-sm text-ink-3 mb-3">{p.diagnosis ?? '—'}</p>
              <div className="flex items-center justify-between">
                <button
                  className="text-sm text-green-600 hover:underline font-medium"
                  onClick={() => navigate(`/prontuarios?patient=${p.id}`)}
                >
                  Ver prontuário →
                </button>
                <div className="flex items-center gap-3">
                  <button
                    className="text-ink-4 hover:text-green-600 transition-colors"
                    onClick={() => openEditPatient(p)}
                    title="Editar paciente"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="text-ink-4 hover:text-red-500 transition-colors"
                    onClick={() => handleDelete(p.id)}
                    title="Excluir paciente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-3 text-center text-ink-4 text-sm py-12">Nenhum paciente encontrado.</p>
          )}
        </div>
      )}

      {!loading && filtered.length > visibleCount && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisibleCount(c => c + 30)}>Carregar mais</Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="patient-modal-title">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 id="patient-modal-title" className="font-serif text-lg font-semibold">{editingId ? 'Editar paciente' : 'Novo paciente'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null) }}><X className="w-5 h-5 text-ink-4" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Nome completo" placeholder="Nome do paciente" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Data de nascimento" type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
                <Input label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))} inputMode="numeric" />
              </div>
              <Input label="CID-10 / Diagnóstico" placeholder="ex: F84.0 - Autismo" value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
              <Input label="Nome do responsável" placeholder="Nome do responsável" value={form.guardian_name} onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} inputMode="numeric" />
                <Input label="E-mail" type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <Input label="Convênio / Particular" placeholder="ex: Unimed, Particular" value={form.insurance} onChange={e => setForm(f => ({ ...f, insurance: e.target.value }))} />
              <Input
                label="Valor da sessão (R$)"
                type="number"
                placeholder="0,00"
                value={form.session_value}
                onChange={e => setForm(f => ({ ...f, session_value: e.target.value }))}
              />
              {editingId && (
                <p className="text-xs text-ink-5 -mt-2">
                  Alterar este valor não muda lançamentos já criados — apenas as próximas sessões agendadas.
                </p>
              )}
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Status</label>
                <select
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as Patient['status'] }))}
                >
                  <option value="ativo">Ativo</option>
                  <option value="em_espera">Em espera</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => { setShowModal(false); setEditingId(null) }}>Cancelar</Button>
                <Button fullWidth onClick={handleSave} disabled={saving || !form.name}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar paciente'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {nearLimit && showLimitModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="limit-modal-title">
          <Card className="p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <h3 id="limit-modal-title" className="font-serif text-lg font-semibold text-ink">Quase no limite</h3>
            </div>
            <p className="text-sm text-ink-4 mb-4">
              Você já usou {patients.length} de {patientLimit} pacientes ({Math.round(usagePercent)}%) do plano {planLabel}.
              Faça upgrade para um plano com mais espaço e continue cadastrando pacientes sem interrupções.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => { sessionStorage.setItem('limitModalDismissed', 'true'); setShowLimitModal(false) }}>Continuar</Button>
              <Button fullWidth onClick={() => { window.location.href = '/configuracoes' }}>Fazer upgrade</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
