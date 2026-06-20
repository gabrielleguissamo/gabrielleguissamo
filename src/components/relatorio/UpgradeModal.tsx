import { Lock, Check, X } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { getStripeCheckoutUrl, getWhatsappCeoUrl } from '../../lib/stripeConfig'

const PLANOS = [
  {
    key: 'inicial' as const,
    label: 'Plano Inicial',
    price: 'R$ 19,90/mês',
    features: ['Até 15 pacientes ativos', '20 relatórios com IA por mês', 'Agenda e prontuários', 'Relatórios básicos'],
  },
  {
    key: 'profissional' as const,
    label: 'Plano Profissional',
    price: 'R$ 49,90/mês',
    features: ['Até 150 pacientes ativos', '200 relatórios com IA por mês', 'Relatórios avançados', 'Financeiro completo', 'Suporte prioritário'],
    destaque: true,
  },
  {
    key: 'business' as const,
    label: 'Plano Business',
    price: 'Fale com o time',
    features: ['Pacientes ilimitados', 'Relatórios ilimitados', 'Multiusuário', 'Relatórios personalizados', 'Atendimento dedicado'],
  },
]

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()

  function handleUpgrade(plan: 'inicial' | 'profissional') {
    if (!user) return
    window.open(getStripeCheckoutUrl(plan, user.id, user.email), '_blank')
  }

  function handleWhatsappCeo() {
    window.open(getWhatsappCeoUrl('Olá! Tenho interesse no plano Business do Terapô.pro.'), '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-4xl w-full text-center bg-cream rounded-2xl p-6 md:p-10 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-ink-4 hover:text-ink" aria-label="Fechar">
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-ink mb-2">Seus 5 relatórios gratuitos acabaram</h1>
        <p className="text-ink-4 mb-8">
          Escolha um plano para continuar gerando relatórios e ter acesso completo aos seus pacientes, agenda, prontuários e financeiro.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {PLANOS.map(p => (
            <Card key={p.key} className={`p-6 flex flex-col ${p.destaque ? 'border-2 border-green-500' : ''}`}>
              <p className="font-serif font-semibold text-ink">{p.label}</p>
              <p className="text-lg font-semibold text-green-600 mb-4">{p.price}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {p.key === 'business' ? (
                <Button variant="outline" fullWidth onClick={handleWhatsappCeo}>Falar com o time</Button>
              ) : (
                <Button fullWidth onClick={() => handleUpgrade(p.key)}>Assinar agora</Button>
              )}
            </Card>
          ))}
        </div>

        <button onClick={onClose} className="text-sm text-ink-4 hover:underline mt-8">
          Continuar sem assinar
        </button>
      </div>
    </div>
  )
}
