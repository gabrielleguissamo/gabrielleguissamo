import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-ink mb-2">Página não encontrada</h1>
        <p className="text-ink-4 mb-6">
          O endereço acessado não existe ou foi movido. Volte para o painel para continuar.
        </p>
        <Button onClick={() => navigate('/dashboard')}>Voltar ao painel</Button>
      </div>
    </div>
  )
}
