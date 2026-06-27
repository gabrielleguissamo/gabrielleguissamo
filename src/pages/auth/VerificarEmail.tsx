import { useRef, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { track } from '../../lib/analytics'
import { AuthCard } from '../../components/auth/AuthCard'
import { Button } from '../../components/ui/Button'

export function VerificarEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const stateEmail = (location.state as { email?: string } | null)?.email
  if (stateEmail) {
    sessionStorage.setItem('verificarEmail', stateEmail)
  }
  const email = stateEmail || sessionStorage.getItem('verificarEmail') || ''

  const CODE_LENGTH = 8

  const [codigo, setCodigo] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  if (!email) {
    return (
      <AuthCard>
        <div className="text-center space-y-4">
          <span className="font-serif text-3xl font-bold text-green-500">Terapô.pro</span>
          <p className="text-ink-4 text-sm">
            Não encontramos um e-mail para verificar. Volte para o cadastro e tente novamente.
          </p>
          <Link to="/cadastro" className="text-green-600 font-medium hover:underline">Voltar ao cadastro</Link>
        </div>
      </AuthCard>
    )
  }

  function handleChange(i: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setCodigo(c => {
      const next = [...c]
      next[i] = digit
      return next
    })
    if (digit && i < CODE_LENGTH - 1) inputsRef.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !codigo[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!text) return
    e.preventDefault()
    setCodigo(c => {
      const next = [...c]
      for (let i = 0; i < CODE_LENGTH; i++) next[i] = text[i] || ''
      return next
    })
    inputsRef.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus()
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const token = codigo.join('')
    if (token.length !== CODE_LENGTH) {
      setError(`Digite o código completo de ${CODE_LENGTH} dígitos.`)
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    if (error) {
      setError('Código inválido ou expirado. Tente novamente ou reenvie o código.')
    } else {
      track('signup_completed')
      sessionStorage.removeItem('verificarEmail')
      navigate('/dashboard')
    }
    setLoading(false)
  }

  async function handleResend() {
    setResending(true)
    setError('')
    setInfo('')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      setError('Não foi possível reenviar o código. Tente novamente em alguns instantes.')
    } else {
      setInfo('Novo código enviado! Confira sua caixa de entrada.')
    }
    setResending(false)
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <span className="font-serif text-3xl font-bold text-green-500">Terapô.pro</span>
        <h2 className="font-serif text-2xl font-semibold text-ink mt-4">Confirme seu e-mail</h2>
        <p className="text-ink-4 text-sm mt-1">
          Enviamos um código de {CODE_LENGTH} dígitos para <span className="font-medium text-ink">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="flex justify-center gap-1.5">
          {codigo.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputsRef.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-9 h-12 text-center text-lg font-bold rounded-xl border border-gray-200 outline-none focus:border-green-500 transition-colors"
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {info && <p className="text-green-600 text-sm text-center">{info}</p>}

        <Button type="submit" fullWidth loading={loading}>
          Confirmar e-mail
        </Button>
      </form>

      <p className="text-center text-sm text-ink-4 mt-6">
        Não recebeu o código?{' '}
        <button onClick={handleResend} disabled={resending} className="text-green-600 font-medium hover:underline disabled:opacity-50">
          {resending ? 'Enviando...' : 'Reenviar código'}
        </button>
      </p>
    </AuthCard>
  )
}
