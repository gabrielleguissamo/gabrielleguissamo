import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return setError('As senhas não coincidem.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else navigate('/login')
    setLoading(false)
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
        <Button type="submit" fullWidth loading={loading}>Salvar nova senha</Button>
      </form>
    </AuthCard>
  )
}
