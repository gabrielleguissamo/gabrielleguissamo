import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { formatPhone } from '../../lib/masks'

export function OnboardingModal() {
  const { user, refreshProfile } = useAuth()
  const [preferredName, setPreferredName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!preferredName.trim()) return setError('Diga como você prefere ser chamado.')
    if (phone.replace(/\D/g, '').length < 10) return setError('Informe um WhatsApp válido.')

    setLoading(true)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({
        preferred_name: preferredName.trim(),
        phone,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      setError('Não foi possível salvar suas informações. Tente novamente.')
      setLoading(false)
      return
    }
    await refreshProfile()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <span className="font-serif text-2xl font-bold text-green-500">Terapô.pro</span>
          <h2 className="font-serif text-xl font-bold text-ink mt-3">Antes de começar</h2>
          <p className="text-ink-4 text-sm mt-1">Só precisamos de duas informações rápidas</p>
        </div>

        <div className="space-y-4 mb-6">
          <Input
            label="Como você prefere ser chamado?"
            placeholder="Seu nome ou apelido"
            value={preferredName}
            onChange={e => setPreferredName(e.target.value)}
            required
          />
          <Input
            label="WhatsApp"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <Button type="submit" fullWidth loading={loading}>
          Continuar
        </Button>
      </form>
    </div>
  )
}
