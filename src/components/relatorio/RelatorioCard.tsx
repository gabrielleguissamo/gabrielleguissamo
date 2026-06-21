import { FileText, Download, Mail, MessageCircle, Trash2, Clock } from 'lucide-react'
import type { RelatorioGerado } from '../../types'

interface Props {
  relatorio: RelatorioGerado
  onVisualizar: () => void
  onDownload: () => void
  onEmail: () => void
  onWhatsApp: () => void
  onExcluir: () => void
}

const TIPO_LABEL: Record<string, string> = {
  evolucao: 'Evolução', avaliacao: 'Avaliação', alta: 'Alta', encaminhamento: 'Encaminhamento',
}
const TIPO_COR: Record<string, string> = {
  evolucao: 'bg-green-50 text-green-700 border-green-100',
  avaliacao: 'bg-blue-50 text-blue-700 border-blue-100',
  alta: 'bg-purple-50 text-purple-700 border-purple-100',
  encaminhamento: 'bg-orange-50 text-orange-700 border-orange-100',
}

export function RelatorioCard({ relatorio, onVisualizar, onDownload, onEmail, onWhatsApp, onExcluir }: Props) {
  const ultimaEdicao = relatorio.historico_edicoes?.at(-1)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all hover:border-green-100 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-green-25 border border-green-100 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm truncate">{relatorio.patient_name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIPO_COR[relatorio.tipo]}`}>
                {TIPO_LABEL[relatorio.tipo]}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                relatorio.financiamento === 'convenio'
                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {relatorio.financiamento === 'convenio' ? 'Convênio' : 'Particular'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {relatorio.data_geracao} às {relatorio.hora_geracao}
              {relatorio.cid_principal && <span className="ml-2">· {relatorio.cid_principal.split(' ')[0]}</span>}
            </p>
            {ultimaEdicao && (
              <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                <Clock size={10} /> Editado {ultimaEdicao.data} às {ultimaEdicao.hora}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onExcluir}
          aria-label="Excluir relatório"
          className="opacity-0 group-hover:opacity-100 transition-opacity w-11 h-11 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50"
          title="Excluir"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
        <button
          onClick={onVisualizar}
          className="flex-1 py-2 text-xs font-semibold text-green-700 bg-green-25 border border-green-100 rounded-full hover:bg-green-50 transition-all"
        >
          Visualizar
        </button>
        <button onClick={onDownload} aria-label="Baixar PDF" className="w-11 h-11 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-400 transition-all flex-shrink-0" title="Download PDF">
          <Download size={14} />
        </button>
        <button onClick={onEmail} aria-label="Enviar por e-mail" className="w-11 h-11 rounded-full border border-gray-200 text-gray-500 flex items-center justify-center hover:border-green-300 hover:text-green-600 transition-all flex-shrink-0" title="E-mail">
          <Mail size={14} />
        </button>
        <button onClick={onWhatsApp} aria-label="Enviar por WhatsApp" className="w-11 h-11 rounded-full border border-gray-200 text-gray-500 flex items-center justify-center hover:border-green-300 hover:text-green-600 transition-all flex-shrink-0" title="WhatsApp">
          <MessageCircle size={14} />
        </button>
      </div>
    </div>
  )
}
