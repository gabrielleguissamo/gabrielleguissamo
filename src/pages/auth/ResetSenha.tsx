import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AuthCard } from '../../components/auth/AuthCard'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function ResetSenha() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('A senha precisa ter no mínimo 8 caracteres.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError('Não foi possível redefinir a senha. Solicite um novo link de redefinição.')
    else navigate('/login')
    setLoading(false)
  }

  if (hasSession === false) {
    return (
      <AuthCard>
        <div className="text-center space-y-4">
          <span className="font-serif text-3xl font-bold text-green-500">Terapô.pro</span>
          <p className="text-ink-4 text-sm">
            Este link de redefinição de senha é inválido ou expirou. Solicite um novo link.
          </p>
          <Link to="/recuperar-senha" className="text-green-600 font-medium hover:underline">Solicitar novo link</Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="text-center mb-8">
        <span className="font-serif text-3xl font-bold text-green-500">Terapô.pro</span>
        <h2 className="font-serif text-2xl font-semibold text-ink mt-4">Nova senha</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nova senha" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
        <Input label="Confirmar nova senha" type="password" placeholder="Repita a senha" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" fullWidth loading={loading} disabled={hasSession === null}>Salvar nova senha</Button>
      </form>
    </AuthCard>
  )
}
