import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro inesperado capturado pelo ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink mb-2">Algo deu errado</h1>
            <p className="text-ink-4 mb-6">
              Ocorreu um erro inesperado ao carregar esta página. Tente recarregar — se o problema continuar,
              entre em contato com o suporte.
            </p>
            <Button onClick={() => window.location.reload()}>Recarregar página</Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
