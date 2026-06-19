import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { formatPhone } from '../../lib/masks'

const AVATARS = [
  { id: 'folha', emoji: '🌿', bg: 'bg-green-100' },
  { id: 'coracao', emoji: '💚', bg: 'bg-green-50' },
  { id: 'sol', emoji: '☀️', bg: 'bg-amber-50' },
  { id: 'estrela', emoji: '⭐', bg: 'bg-cream' },
  { id: 'flor', emoji: '🌸', bg: 'bg-rose-50' },
]

const SUPPORT_CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
]

export function OnboardingModal() {
  const { user, refreshProfile } = useAuth()
  const [avatarChoice, setAvatarChoice] = useState(AVATARS[0].id)
  const [supportChannel, setSupportChannel] = useState(SUPPORT_CHANNELS[0].value)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_choice: avatarChoice,
        support_channel: supportChannel,
        phone,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      setError('Não foi possível salvar suas preferências. Tente novamente.')
      setLoading(false)
      return
    }
    await refreshProfile()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <span className="font-serif text-2xl font-bold text-green-500">Terapô.pro</span>
          <h2 className="font-serif text-xl font-bold text-ink mt-3">Torne a Terapô sua</h2>
          <p className="text-ink-4 text-sm mt-1">Vamos personalizar sua experiência antes de começar</p>
        </div>

        <div className="mb-6">
          <label className="text-sm font-semibold text-ink-2 mb-2 block">Escolha seu avatar</label>
          <div className="flex gap-3">
            {AVATARS.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatarChoice(a.id)}
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${a.bg} border-2 transition-all ${
                  avatarChoice === a.id ? 'border-green-500 scale-105' : 'border-transparent'
                }`}
              >
                {a.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-semibold text-ink-2 mb-2 block">Escolha sua preferência de suporte</label>
          <select
            className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-ink text-sm outline-none focus:border-green-500 focus:bg-white transition-all"
            value={supportChannel}
            onChange={e => setSupportChannel(e.target.value)}
          >
            {SUPPORT_CHANNELS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <Input
            label="Número de telefone"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <Button fullWidth loading={loading} onClick={handleSubmit}>
          Próximo
        </Button>
      </div>
    </div>
  )
}
