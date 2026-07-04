import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Bell, MessageCircle, Check } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Toast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { AppSession, Transaction } from '../../types'

type SessionWithPatient = AppSession & { patients?: { name: string; phone?: string } }
type TransactionWithPatient = Transaction & { patients?: { name: string; phone?: string } }

function telefoneParaWhatsApp(phone?: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return digits.startsWith('55') ? digits : '55' + digits
}

function formatDate(dateStr: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-')
    return d + '/' + m + '/' + y
  }
  return dateStr
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function toISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

export function Avisos() {
  const { user } = useAuth()
  const [sessoesPendentes, setSessoesPendentes] = useState<SessionWithPatient[]>([])
  const [cobrancasPendentes, setCobrancasPendentes] = useState<TransactionWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  async function fetchAvisos() {
    if (!user) return
    setLoading(true)
    const hoje = new Date()
    const em48h = new Date(hoje)
    em48h.setDate(em48h.getDate() + 2)

    const [sessoesRes, cobrancasRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('*, patients(name, phone)')
        .eq('user_id', user.id)
        .eq('status', 'pendente')
        .gte('date', toISO(hoje))
        .lte('date', toISO(em48h))
        .order('date', { ascending: true }),
      supabase
        .from('transactions')
        .select('*, patients(name, phone)')
        .eq('user_id', user.id)
        .eq('status', 'pendente')
        .lte('date', toISO(hoje))
        .order('date', { ascending: true }),
    ])
    setSessoesPendentes((sessoesRes.data ?? []) as SessionWithPatient[])
    setCobrancasPendentes((cobrancasRes.data ?? []) as TransactionWithPatient[])
    setLoading(false)
  }

  useEffect(() => { fetchAvisos() }, [user])

  async function criarLancamentoSessao(session: SessionWithPatient) {
    if (!user) return
    const { data: existing } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('session_id', session.id)
      .maybeSingle()
    if (existing) {
      if (existing.status === 'cancelado') {
        await supabase.from('transactions').update({ status: 'pendente' }).eq('id', existing.id)
      }
      return
    }
    const amount = session.value ?? 0
    if (amount <= 0) return
    await supabase.from('transactions').insert({
      user_id: user.id,
      patient_id: session.patient_id,
      session_id: session.id,
      date: session.date,
      amount,
      type: 'sessao',
      status: 'pendente',
    })
  }

  async function confirmarSessao(session: SessionWithPatient) {
    const { error } = await supabase.from('sessions').update({ status: 'confirmado' }).eq('id', session.id)
    if (error) {
      setToast({ message: 'Erro ao confirmar sessão', type: 'error' })
    } else {
      await criarLancamentoSessao(session)
      setSessoesPendentes(prev => prev.filter(s => s.id !== session.id))
      setToast({ message: 'Sessão confirmada!', type: 'success' })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink flex items-center gap-2">
          <Bell className="w-6 h-6 text-green-500" /> Avisos
        </h1>
        <p className="text-sm text-ink-4 mt-1">Confirmações e cobranças pendentes para resolver com um clique.</p>
      </div>

      <Card className="p-5">
        <h3 className="font-medium text-ink mb-4">Sessões para confirmar (próximas 48h)</h3>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessoesPendentes.length === 0 ? (
          <p className="text-sm text-ink-5 text-center py-6">Nenhuma sessão pendente de confirmação.</p>
        ) : (
          <div className="space-y-2">
            {sessoesPendentes.map(s => {
              const tel = telefoneParaWhatsApp(s.patients?.phone)
              const msg = 'Olá ' + (s.patients?.name ?? '') + '! Passando para confirmar sua sessão no dia ' + formatDate(s.date) + ' às ' + s.time.slice(0, 5) + '. Podemos confirmar?'
              return (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{s.patients?.name ?? '—'}</p>
                    <p className="text-xs text-ink-5">{formatDate(s.date)} às {s.time.slice(0, 5)} · {s.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tel && (
                      <a
                        href={'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-700 rounded-full text-xs font-semibold hover:bg-green-50"
                      >
                        <MessageCircle size={12} /> Confirmar via WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => confirmarSessao(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-semibold hover:bg-green-400"
                    >
                      <Check size={12} /> Confirmada
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-ink mb-4">Cobranças pendentes</h3>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cobrancasPendentes.length === 0 ? (
          <p className="text-sm text-ink-5 text-center py-6">Nenhuma cobrança pendente.</p>
        ) : (
          <div className="space-y-2">
            {cobrancasPendentes.map(t => {
              const tel = telefoneParaWhatsApp(t.patients?.phone)
              const msg = 'Olá ' + (t.patients?.name ?? '') + '! Passando para lembrar do pagamento de ' + formatBRL(t.amount) + ' referente ao dia ' + formatDate(t.date) + '. Qualquer dúvida, me chama!'
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{t.patients?.name ?? '—'}</p>
                    <p className="text-xs text-ink-5">{formatDate(t.date)} · {formatBRL(t.amount)} · {t.type}</p>
                  </div>
                  {tel && (
                    <a
                      href={'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-full text-xs font-semibold hover:bg-orange-400"
                    >
                      <MessageCircle size={12} /> Cobrar via WhatsApp
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
