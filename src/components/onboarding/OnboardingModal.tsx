import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { formatPhone } from '../../lib/masks'
import { track } from '../../lib/analytics'
import { DEFAULT_SPECIALTY_NAME } from '../../lib/specialty'

function isValidBrazilianPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 10 && digits.length !== 11) return false
  const ddd = parseInt(digits.slice(0, 2), 10)
  if (ddd < 11 || ddd > 99) return false
  if (digits.length === 11 && digits[2] !== '9') return false
  if (/^(\d)\1+$/.test(digits.slice(2))) return false
  return true
}

export function OnboardingModal() {
  const { user, refreshProfile } = useAuth()
  const [preferredName, setPreferredName] = useState('')
  const [phone, setPhone] = useState('')
  const [isClinical, setIsClinical] = useState(true)
  const [specialtyName, setSpecialtyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!preferredName.trim()) return setError('Diga como você prefere ser chamado.')
    if (!isValidBrazilianPhone(phone)) return setError('Informe um número de WhatsApp válido, com DDD.')

    setLoading(true)
    setError('')
    if (!isClinical && !specialtyName.trim()) return setError('Digite o nome da sua especialidade.')

    const { error } = await supabase
      .from('profiles')
      .update({
        preferred_name: preferredName.trim(),
        phone,
        is_clinical: isClinical,
        specialty_name: isClinical ? DEFAULT_SPECIALTY_NAME : specialtyName.trim(),
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      setError('Não foi possível salvar suas informações. Tente novamente.')
      setLoading(false)
      return
    }
    track('onboarding_completed')
    await refreshProfile()
    setLoading(false)
  }

  return (
    <Modal dismissible={false} maxWidth="max-w-md" zIndex="z-[100]">
      <form onSubmit={handleSubmit}>
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
            label="WhatsApp para suporte"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            required
          />
          <div>
            <label className="text-sm font-medium text-ink-2 block mb-2">Qual sua especialidade?</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsClinical(true)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${isClinical ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
              >
                <p className="font-medium text-sm text-ink">Terapeuta Ocupacional</p>
                <p className="text-xs text-ink-4">Relatórios clínicos com CID-10, CIF e normas COFFITO</p>
              </button>
              <button
                type="button"
                onClick={() => setIsClinical(false)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${!isClinical ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
              >
                <p className="font-medium text-sm text-ink">Outra especialidade</p>
                <p className="text-xs text-ink-4">Terapeuta holístico, hertz, vibracional e outras práticas — sem diagnóstico clínico</p>
              </button>
            </div>
            {!isClinical && (
              <div className="mt-3">
                <Input
                  label="Digite sua especialidade"
                  placeholder="ex: Terapeuta Hertz"
                  value={specialtyName}
                  onChange={e => setSpecialtyName(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <Button type="submit" fullWidth loading={loading}>
          Continuar
        </Button>
      </form>
    </Modal>
  )
}
