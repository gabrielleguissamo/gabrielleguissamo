import { useState, useEffect } from 'react'
import { Users, Calendar, TrendingUp, FileEdit } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { AppSession } from '../../types'

const PIE_COLORS = ['#2d7a3a', '#3d9b4d', '#82c98b', '#b4e0ba']

const statusVariant = {
  confirmado: 'success' as const,
  pendente: 'warning' as const,
  cancelado: 'danger' as const,
}

const statusLabel = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
}

type SessionWithPatient = AppSession & { patients?: { name: string } }

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setDate(now.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start, end }
}

function toISO(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function Dashboard() {
  const { user } = useAuth()

  const [activePatients, setActivePatients] = useState(0)
  const [weekSessions, setWeekSessions] = useState(0)
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [pendingRecords, setPendingRecords] = useState(0)
  const [todaySessions, setTodaySessions] = useState<SessionWithPatient[]>([])
  const [weeklyChartData, setWeeklyChartData] = useState<{ semana: string; sessoes: number }[]>([])
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function loadDashboard() {
      setLoading(true)
      try {
      const today = toISO(new Date())
      const { start: weekStart, end: weekEnd } = getWeekRange()
      const { start: monthStart, end: monthEnd } = getMonthRange()

      // Active patients count
      const { count: patCount } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'ativo')
      setActivePatients(patCount ?? 0)

      // This week sessions
      const { count: weekCount } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('date', toISO(weekStart))
        .lte('date', toISO(weekEnd))
        .neq('status', 'cancelado')
      setWeekSessions(weekCount ?? 0)

      // Month revenue (paid transactions)
      const { data: txData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user!.id)
        .eq('status', 'pago')
        .gte('date', toISO(monthStart))
        .lte('date', toISO(monthEnd))
      const revenue = (txData ?? []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
      setMonthRevenue(revenue)

      // Pending records (patients without a record in last 7 days — approx: sessions without linked records)
      const { count: recCount } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'confirmado')
        .lt('date', today)
        .gte('date', toISO(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
        .is('notes', null)
      setPendingRecords(recCount ?? 0)

      // Today's sessions
      const { data: todayData } = await supabase
        .from('sessions')
        .select('*, patients(name)')
        .eq('user_id', user!.id)
        .eq('date', today)
        .order('time', { ascending: true })
      setTodaySessions((todayData ?? []) as SessionWithPatient[])

      // Weekly chart — last 8 weeks (consultas em paralelo, nao em serie)
      const weekOffsets = [7, 6, 5, 4, 3, 2, 1, 0]
      const chartCounts = await Promise.all(weekOffsets.map(i => {
        const wStart = new Date(weekStart)
        wStart.setDate(wStart.getDate() - i * 7)
        const wEnd = new Date(wStart)
        wEnd.setDate(wStart.getDate() + 6)
        return supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .gte('date', toISO(wStart))
          .lte('date', toISO(wEnd))
          .neq('status', 'cancelado')
          .then(({ count }) => count ?? 0)
      }))
      setWeeklyChartData(weekOffsets.map((i, idx) => ({ semana: `S${8 - i}`, sessoes: chartCounts[idx] })))

      // Pie chart — session types (all time)
      const { data: allSessions } = await supabase
        .from('sessions')
        .select('type')
        .eq('user_id', user!.id)
        .neq('status', 'cancelado')
      const typeCounts: Record<string, number> = {}
      ;(allSessions ?? []).forEach((s: { type: string }) => {
        typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1
      })
      const total = Object.values(typeCounts).reduce((a, b) => a + b, 0) || 1
      const labels: Record<string, string> = {
        presencial: 'Presencial', online: 'Online', domiciliar: 'Domiciliar', escola: 'Escola',
      }
      const pie = Object.entries(typeCounts).map(([k, v]) => ({
        name: labels[k] ?? k,
        value: Math.round((v / total) * 100),
      }))
      setPieData(pie.length > 0 ? pie : [
        { name: 'Presencial', value: 0 },
      ])
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [user])

  const metrics = [
    { label: 'Pacientes ativos', value: String(activePatients), icon: Users, color: 'text-green-500' },
    { label: 'Sessões esta semana', value: String(weekSessions), icon: Calendar, color: 'text-blue-500' },
    { label: 'Receita do mês', value: monthRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingUp, color: 'text-green-400' },
    { label: 'Notas pendentes', value: String(pendingRecords), icon: FileEdit, color: 'text-orange-400' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-ink-4">{label}</span>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="font-serif text-2xl font-semibold text-ink">
              {loading ? <span className="w-16 h-7 bg-gray-100 rounded animate-pulse inline-block" /> : value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3 p-5">
          <h3 className="font-medium text-ink mb-4">Sessões por semana</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sessoes" stroke="#2d7a3a" strokeWidth={2} dot={{ fill: '#2d7a3a' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="xl:col-span-2 p-5">
          <h3 className="font-medium text-ink mb-4">Tipo de atendimento</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={10} />
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-medium text-ink mb-4">Agenda de hoje</h3>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-4 border-b border-gray-100">
                  <th className="pb-3 font-medium">Horário</th>
                  <th className="pb-3 font-medium">Paciente</th>
                  <th className="pb-3 font-medium">Tipo</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todaySessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ink-5">Nenhuma sessão hoje.</td>
                  </tr>
                ) : todaySessions.map(a => (
                  <tr key={a.id}>
                    <td className="py-3 font-mono text-ink-3">{a.time.slice(0, 5)}</td>
                    <td className="py-3 text-ink font-medium">{a.patients?.name ?? '—'}</td>
                    <td className="py-3 text-ink-4 capitalize">{a.type}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
