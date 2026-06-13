import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AuthCard } from '../../components/auth/AuthCard'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

export function Cadastro() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    crfTo: '', state: '', agreed: false
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) return setError('As senhas não coincidem.')
    if (!form.agreed) return setError('Você precisa aceitar os termos.')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, crf_to: form.crfTo, state: form.state } }
    })
    if (error) setError(error.message)
    else navigate('/verificar-email', { state: { email: form.email } })
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <span className="font-serif text-3xl font-bold text-green-500">Terapô.pro</span>
        <h2 className="font-serif text-2xl font-semibold text-ink mt-4">Crie sua conta grátis</h2>
        <p className="text-ink-4 text-sm mt-1">14 dias gratuitos, sem cartão de crédito</p>
      </div>

      <Button variant="google" fullWidth onClick={handleGoogle} type="button">
        Continuar com Google
      </Button>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-ink-5">ou continue com e-mail</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Nome completo" placeholder="Sua nome" value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
        <Input label="E-mail" type="email" placeholder="seu@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
        <div className="relative">
          <Input label="Senha (mín. 8 caracteres)" type={showPwd ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => set('password', e.target.value)} minLength={8} required />
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-9 text-ink-4">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Input label="Confirmar senha" type="password" placeholder="Repita a senha" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
        <Input label="CRF/TO (opcional)" placeholder="ex: TO-SP 12345" value={form.crfTo} onChange={e => set('crfTo', e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink-2">Estado</label>
          <select
            className="h-12 px-4 rounded-xl border border-gray-200 bg-white text-ink text-sm outline-none focus:border-green-500 transition-colors"
            value={form.state}
            onChange={e => set('state', e.target.value)}
          >
            <option value="">Selecione seu estado</option>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={form.agreed} onChange={e => set('agreed', e.target.checked)} className="mt-0.5 accent-green-500" />
          <span className="text-sm text-ink-4">
            Concordo com os{' '}
            <Link to="/termos" target="_blank" className="text-green-600 underline" onClick={e => e.stopPropagation()}>
              Termos de uso
            </Link>{' '}
            e a{' '}
            <Link to="/privacidade" target="_blank" className="text-green-600 underline" onClick={e => e.stopPropagation()}>
              Política de privacidade
            </Link>
          </span>
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" fullWidth loading={loading}>
          Criar minha conta
        </Button>
      </form>

      <p className="text-center text-sm text-ink-4 mt-4">
        Já tem conta?{' '}
        <Link to="/login" className="text-green-600 font-medium hover:underline">Entrar</Link>
      </p>
    </AuthCard>
  )
}
