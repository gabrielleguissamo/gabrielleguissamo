import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AuthCard } from '../../components/auth/AuthCard'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        await supabase.auth.resend({ type: 'signup', email })
        navigate('/verificar-email', { state: { email } })
      } else {
        setError('E-mail ou senha inválidos. Tente novamente.')
      }
    } else {
      navigate('/dashboard')
    }
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
      <div className="text-center mb-8">
        <span className="font-serif text-3xl font-bold text-green-500">Terapô.pro</span>
        <h2 className="font-serif text-2xl font-semibold text-ink mt-4">Bem-vindo de volta</h2>
        <p className="text-ink-4 text-sm mt-1">Entre na sua conta para continuar</p>
      </div>

      <Button variant="google" fullWidth onClick={handleGoogle} type="button">
        Continuar com Google
      </Button>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-ink-5">ou continue com e-mail</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <div className="relative">
          <Input
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            placeholder="Sua senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-ink-4 hover:text-ink"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link to="/recuperar-senha" className="text-sm text-green-600 hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" fullWidth loading={loading}>
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-ink-4 mt-6">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="text-green-600 font-medium hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </AuthCard>
  )
}
