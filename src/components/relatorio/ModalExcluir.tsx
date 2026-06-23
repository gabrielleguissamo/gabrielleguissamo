import { Trash2, AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface Props {
  nomePaciente: string
  dataGeracao: string
  onConfirmar: () => void
  onCancelar: () => void
}

export function ModalExcluir({ nomePaciente, dataGeracao, onConfirmar, onCancelar }: Props) {
  return (
    <Modal onClose={onCancelar} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-semibold text-ink mb-1">Excluir relatório</h3>
          <p className="text-sm text-ink-4">
            Tem certeza que deseja excluir o relatório de{' '}
            <strong className="text-ink-2">{nomePaciente}</strong>{' '}
            gerado em <strong className="text-ink-2">{dataGeracao}</strong>?
          </p>
        </div>
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-left w-full">
          <AlertTriangle size={15} className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            Esta ação não pode ser desfeita. O relatório será removido permanentemente.
          </p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <Button variant="outline" fullWidth onClick={onCancelar}>
            Cancelar
          </Button>
          <Button variant="danger" fullWidth onClick={onConfirmar}>
            Sim, excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
