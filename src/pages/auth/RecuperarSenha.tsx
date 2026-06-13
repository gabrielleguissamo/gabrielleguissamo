import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AuthCard } from '../../components/auth/AuthCard'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <AuthCard>
      <Link to="/login" className="flex items-center gap-1 text-ink-4 hover:text-ink text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="text-center mb-8">
        <span className="font-serif text-3xl font-bold text-green-500">Terapô.pro</span>
        <h2 className="font-serif text-2xl font-semibold text-ink mt-4">Recuperar senha</h2>
        <p className="text-ink-4 text-sm mt-1">Enviaremos as instruções por e-mail</p>
      </div>

      {sent ? (
        <div className="text-center py-6">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-medium text-ink">E-mail enviado!</p>
          <p className="text-sm text-ink-4 mt-1">Verifique sua caixa de entrada e siga as instruções.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="E-mail" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Button type="submit" fullWidth loading={loading}>Enviar instruções</Button>
        </form>
      )}
    </AuthCard>
  )
}
