import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Users, Clock, CheckCircle2, AlertCircle, DollarSign, TrendingUp,
  Wallet, RefreshCw, XCircle, BarChart3, Gift,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import type { Profile } from '../../types'
import { ADMIN_EMAIL } from '../../lib/adminConfig'
import { FREE_REPORT_LIMIT } from '../../lib/planLimits'

const PLAN_LABELS: Record<string, string> = {
  inicial: 'Inicial',
  profissional: 'Profissional',
  business: 'Business',
}

const PIE_COLORS = ['#2d7a3a', '#3d9b4d', '#82c98b', '#b4e0ba']

interface SubscriptionRow {
  id: string
  user_id: string
  plan: 'inicial' | 'profissional' | 'business'
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid'
  amount: number
  current_period_end: string | null
  canceled_at: string | null
  source: 'stripe' | 'manual'
}

interface PaymentRow {
  id: string
  user_id: string
  amount: number
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  paid_at: string | null
  created_at: string
}

function relatoriosGratuitosRestantes(p: Profile) {
  return Math.max(0, FREE_REPORT_LIMIT - (p.free_reports_used ?? 0))
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const SUB_STATUS_LABELS: Record<SubscriptionRow['status'], string> = {
  trialing: 'Em teste',
  active: 'Ativo',
  past_due: 'Inadimplente',
  canceled: 'Cancelado',
  incomplete: 'Incompleto',
  unpaid: 'Não pago',
}

const PAYMENT_STATUS_LABELS: Record<PaymentRow['status'], string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado',
}

const SUB_STATUS_VARIANTS: Record<SubscriptionRow['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  trialing: 'warning',
  active: 'success',
  past_due: 'danger',
  canceled: 'neutral',
  incomplete: 'danger',
  unpaid: 'danger',
}

export function Admin() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [grantPlans, setGrantPlans] = useState<Record<string, 'inicial' | 'profissional' | 'business'>>({})
  const [grantingId, setGrantingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<'todos' | 'inicial' | 'profissional' | 'business'>('todos')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'cortesia' | 'teste' | 'inadimplente' | 'cancelado' | 'sem_assinatura'>('todos')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  async function fetchData() {
    setLoading(true)
    const [profilesRes, subsRes, paymentsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*'),
      supabase.from('payments').select('*'),
    ])
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
    if (subsRes.data) setSubscriptions(subsRes.data as SubscriptionRow[])
    if (paymentsRes.data) setPayments(paymentsRes.data as PaymentRow[])
    setLoading(false)
  }

  useEffect(() => {
    if (user?.email !== ADMIN_EMAIL) return
    fetchData()
  }, [user])

  useEffect(() => {
    setPage(1)
  }, [search, filterPlan, filterStatus])

  async function handleGrant(userId: string, plan: 'inicial' | 'profissional' | 'business') {
    setGrantingId(userId)
    const { error } = await supabase.functions.invoke('admin-grant-plan', {
      body: { userId, action: 'grant', plan },
    })
    if (!error) await fetchData()
    setGrantingId(null)
  }

  async function handleRevoke(userId: string) {
    setGrantingId(userId)
    const { error } = await supabase.functions.invoke('admin-grant-plan', {
      body: { userId, action: 'revoke' },
    })
    if (!error) await fetchData()
    setGrantingId(null)
  }

  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />
  }

  const subsByUser = new Map(subscriptions.map(s => [s.user_id, s]))

  const ativos = subscriptions.filter(s => s.status === 'active' && s.source === 'stripe')
  const cortesias = subscriptions.filter(s => s.status === 'active' && s.source === 'manual')
  const emTesteStripe = subscriptions.filter(s => s.status === 'trialing')
  const inadimplentes = subscriptions.filter(s => s.status === 'past_due' || s.status === 'unpaid' || s.status === 'incomplete')
  const cancelados = subscriptions.filter(s => s.status === 'canceled')

  // Perfis sem assinatura no Stripe ainda — usam os 5 relatórios gratuitos vitalícios
  const semAssinatura = profiles.filter(p => !subsByUser.has(p.id))
  const trialInternoAtivo = semAssinatura.filter(p => relatoriosGratuitosRestantes(p) > 0)

  const paidPayments = payments.filter(p => p.status === 'paid')
  const pendingPayments = payments.filter(p => p.status === 'pending')
  const failedPayments = payments.filter(p => p.status === 'failed')

  // VGV — receita total acumulada (todas as cobranças pagas)
  const vgv = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // MRR — receita recorrente mensal (assinaturas ativas)
  const mrr = ativos.reduce((sum, s) => sum + Number(s.amount), 0)

  // LTV médio — receita total / clientes que já pagaram pelo menos uma vez
  const payingCustomers = new Set(paidPayments.map(p => p.user_id))
  const ltvMedio = payingCustomers.size > 0 ? vgv / payingCustomers.size : 0

  // ARPU — ticket médio entre assinantes ativos
  const arpu = ativos.length > 0 ? mrr / ativos.length : 0

  // Taxa de conversão (assinantes pagantes / total de contas)
  const conversao = profiles.length > 0 ? (ativos.length / profiles.length) * 100 : 0

  const mensalidadesPendentesValor = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // LTV individual por cliente (total já pago)
  const totalPagoPorUsuario = new Map<string, number>()
  for (const p of paidPayments) {
    totalPagoPorUsuario.set(p.user_id, (totalPagoPorUsuario.get(p.user_id) ?? 0) + Number(p.amount))
  }

  // Status de pagamentos por usuário (para busca)
  const paymentStatusLabelsByUser = new Map<string, string[]>()
  for (const pay of payments) {
    const labels = paymentStatusLabelsByUser.get(pay.user_id) ?? []
    labels.push(PAYMENT_STATUS_LABELS[pay.status] ?? pay.status)
    paymentStatusLabelsByUser.set(pay.user_id, labels)
  }

  // Filtro de busca por nome, e-mail, telefone, plano, status e pagamentos
  const searchTerm = search.trim().toLowerCase()
  const filteredProfiles = profiles.filter(p => {
    const sub = subsByUser.get(p.id)
    const plan = sub?.plan ?? p.plan
    const reportsLeft = relatoriosGratuitosRestantes(p)
    let statusKey: 'ativo' | 'cortesia' | 'teste' | 'inadimplente' | 'cancelado' | 'sem_assinatura' = 'sem_assinatura'
    let statusLabel = 'Sem assinatura'
    if (sub) {
      statusLabel = SUB_STATUS_LABELS[sub.status]
      if (sub.source === 'manual' && sub.status === 'active') {
        statusKey = 'cortesia'
        statusLabel += ' cortesia'
      } else if (sub.status === 'active') {
        statusKey = 'ativo'
      } else if (sub.status === 'trialing') {
        statusKey = 'teste'
      } else if (sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'incomplete') {
        statusKey = 'inadimplente'
      } else if (sub.status === 'canceled') {
        statusKey = 'cancelado'
      }
    } else if (reportsLeft > 0) {
      statusKey = 'teste'
      statusLabel = 'Em teste'
    }

    if (filterPlan !== 'todos' && plan !== filterPlan) return false
    if (filterStatus !== 'todos' && statusKey !== filterStatus) return false

    if (searchTerm === '') return true

    const mensalidade = sub ? formatBRL(sub.amount) : ''
    const totalPago = formatBRL(totalPagoPorUsuario.get(p.id) ?? 0)
    const paymentLabels = (paymentStatusLabelsByUser.get(p.id) ?? []).join(' ')

    const haystack = [
      p.full_name,
      p.email,
      p.phone,
      PLAN_LABELS[plan] ?? plan,
      statusLabel,
      mensalidade,
      totalPago,
      paymentLabels,
    ].filter(Boolean).join(' ').toLowerCase()

    return haystack.includes(searchTerm)
  })

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedProfiles = filteredProfiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Receita mensal (últimos 6 meses)
  const now = new Date()
  const monthsData: { key: string; label: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthsData.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }),
      total: 0,
    })
  }
  for (const p of paidPayments) {
    if (!p.paid_at) continue
    const d = new Date(p.paid_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthsData.find(m => m.key === key)
    if (entry) entry.total += Number(p.amount)
  }

  // Distribuição por plano (assinaturas ativas + em teste)
  const planCounts: Record<string, number> = {}
  for (const s of subscriptions) {
    if (s.status === 'active' || s.status === 'trialing') {
      planCounts[s.plan] = (planCounts[s.plan] ?? 0) + 1
    }
  }
  const planPieData = Object.entries(planCounts).map(([plan, value]) => ({
    name: PLAN_LABELS[plan] ?? plan,
    value,
  }))

  const kpis = [
    { label: 'MRR (receita recorrente)', value: formatBRL(mrr), Icon: RefreshCw, color: 'bg-green-50 text-green-500' },
    { label: 'VGV (receita acumulada)', value: formatBRL(vgv), Icon: DollarSign, color: 'bg-emerald-50 text-emerald-500' },
    { label: 'LTV médio', value: formatBRL(ltvMedio), Icon: Wallet, color: 'bg-blue-50 text-blue-500' },
    { label: 'ARPU (ticket médio)', value: formatBRL(arpu), Icon: BarChart3, color: 'bg-purple-50 text-purple-500' },
  ]

  const kpis2 = [
    { label: 'Clientes pagantes', value: String(ativos.length), Icon: CheckCircle2, color: 'bg-green-50 text-green-500' },
    { label: 'Em teste', value: String(emTesteStripe.length + trialInternoAtivo.length), Icon: Clock, color: 'bg-blue-50 text-blue-500' },
    { label: 'Inadimplentes', value: String(inadimplentes.length), Icon: AlertCircle, color: 'bg-red-50 text-red-500' },
    { label: 'Cancelados (churn)', value: String(cancelados.length), Icon: XCircle, color: 'bg-gray-100 text-gray-500' },
  ]

  const kpis3 = [
    { label: 'Total de contas', value: String(profiles.length), Icon: Users, color: 'bg-gray-100 text-gray-500' },
    { label: 'Conversão trial → pago', value: `${conversao.toFixed(1)}%`, Icon: TrendingUp, color: 'bg-green-50 text-green-500' },
    { label: 'Mensalidades pendentes', value: `${pendingPayments.length} (${formatBRL(mensalidadesPendentesValor)})`, Icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Cobranças falhadas', value: String(failedPayments.length), Icon: AlertCircle, color: 'bg-red-50 text-red-500' },
  ]

  const kpis4 = [
    { label: 'Cortesias / parcerias ativas', value: String(cortesias.length), Icon: Gift, color: 'bg-pink-50 text-pink-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Fraunces, serif' }}>Painel administrativo</h1>
        <p className="text-sm text-gray-500 mt-1">Visão financeira e de assinaturas da Terapô.pro</p>
      </div>

      {[kpis, kpis2, kpis3, kpis4].map((row, i) => (
        <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {row.map(({ label, value, Icon, color }) => (
            <Card key={label} className="p-5 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
              </div>
            </Card>
          ))}
        </div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Receita mensal (últimos 6 meses)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="total" fill="#2d7a3a" radius={[6, 6, 0, 0]} name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuição por plano</h3>
          <div className="h-64">
            {planPieData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Sem assinaturas ainda</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {planPieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone, plano, status ou pagamento..."
            className="flex-1 min-w-[240px] max-w-md h-10 text-sm border border-gray-200 rounded-lg px-3 outline-none focus:border-green-500"
          />
          <select
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value as typeof filterPlan)}
            className="h-10 text-sm border border-gray-200 rounded-lg px-3 outline-none focus:border-green-500"
          >
            <option value="todos">Todos os planos</option>
            <option value="inicial">Inicial</option>
            <option value="profissional">Profissional</option>
            <option value="business">Business</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="h-10 text-sm border border-gray-200 rounded-lg px-3 outline-none focus:border-green-500"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo (pagante)</option>
            <option value="cortesia">Cortesia</option>
            <option value="teste">Em teste</option>
            <option value="inadimplente">Inadimplente</option>
            <option value="cancelado">Cancelado</option>
            <option value="sem_assinatura">Sem assinatura</option>
          </select>
          {(search !== '' || filterPlan !== 'todos' || filterStatus !== 'todos') && (
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterPlan('todos'); setFilterStatus('todos') }}
              className="text-xs text-gray-500 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Telefone</th>
                <th className="px-5 py-3 font-medium">Plano</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Mensalidade</th>
                <th className="px-5 py-3 font-medium">Próxima cobrança</th>
                <th className="px-5 py-3 font-medium">Total pago (LTV)</th>
                <th className="px-5 py-3 font-medium">Cadastro</th>
                <th className="px-5 py-3 font-medium">Cortesia (admin)</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-6 text-center text-sm text-gray-400">
                    Nenhum resultado encontrado para os filtros aplicados{search ? ` ("${search}")` : ''}
                  </td>
                </tr>
              )}
              {pagedProfiles.map(p => {
                const sub = subsByUser.get(p.id)
                const reportsLeft = relatoriosGratuitosRestantes(p)
                const totalPago = totalPagoPorUsuario.get(p.id) ?? 0

                let statusBadge: React.ReactNode
                let plan = p.plan
                let mensalidade: number | null = null
                let proximaCobranca: string | null = null

                if (sub) {
                  plan = sub.plan
                  mensalidade = sub.amount
                  proximaCobranca = sub.current_period_end
                  statusBadge = <Badge variant={SUB_STATUS_VARIANTS[sub.status]}>{SUB_STATUS_LABELS[sub.status]}</Badge>
                } else if (reportsLeft > 0) {
                  statusBadge = <Badge variant="warning">Em teste · {reportsLeft} relatório{reportsLeft !== 1 ? 's' : ''} grátis restante{reportsLeft !== 1 ? 's' : ''}</Badge>
                } else {
                  statusBadge = <Badge variant="danger">Sem assinatura</Badge>
                }

                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.full_name}</td>
                    <td className="px-5 py-3 text-gray-500">{p.email}</td>
                    <td className="px-5 py-3 text-gray-500">{p.phone || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{PLAN_LABELS[plan] || plan}</td>
                    <td className="px-5 py-3">{statusBadge}</td>
                    <td className="px-5 py-3 text-gray-600">{mensalidade !== null ? formatBRL(mensalidade) : '—'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {proximaCobranca ? new Date(proximaCobranca).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{formatBRL(totalPago)}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {sub?.source === 'manual' ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="success">Cortesia · {PLAN_LABELS[sub.plan]}</Badge>
                          <button
                            className="text-xs text-red-500 hover:underline disabled:opacity-50"
                            disabled={grantingId === p.id}
                            onClick={() => handleRevoke(p.id)}
                          >
                            Revogar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            className="h-8 text-xs border border-gray-200 rounded-lg px-2"
                            value={grantPlans[p.id] ?? 'profissional'}
                            onChange={e => setGrantPlans(prev => ({ ...prev, [p.id]: e.target.value as 'inicial' | 'profissional' | 'business' }))}
                          >
                            <option value="inicial">Inicial</option>
                            <option value="profissional">Profissional</option>
                            <option value="business">Business</option>
                          </select>
                          <button
                            className="text-xs text-green-600 hover:underline disabled:opacity-50"
                            disabled={grantingId === p.id}
                            onClick={() => handleGrant(p.id, grantPlans[p.id] ?? 'profissional')}
                          >
                            Conceder
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filteredProfiles.length > 0 && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 text-sm text-gray-500">
            <span>
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProfiles.length)} de {filteredProfiles.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-green-300 hover:text-green-600 transition-colors"
              >
                Anterior
              </button>
              <span>Página {currentPage} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-green-300 hover:text-green-600 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
