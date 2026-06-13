import { Trash2, AlertTriangle } from 'lucide-react'

interface Props {
  nomePaciente: string
  dataGeracao: string
  onConfirmar: () => void
  onCancelar: () => void
}

export function ModalExcluir({ nomePaciente, dataGeracao, onConfirmar, onCancelar }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <Trash2 size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Excluir relatório</h3>
            <p className="text-sm text-gray-500">
              Tem certeza que deseja excluir o relatório de{' '}
              <strong className="text-gray-700">{nomePaciente}</strong>{' '}
              gerado em <strong className="text-gray-700">{dataGeracao}</strong>?
            </p>
          </div>
          <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-left w-full">
            <AlertTriangle size={15} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700">
              Esta ação não pode ser desfeita. O relatório será removido permanentemente.
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancelar}
              className="flex-1 py-3 border border-gray-200 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              className="flex-1 py-3 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 transition-all"
            >
              Sim, excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
