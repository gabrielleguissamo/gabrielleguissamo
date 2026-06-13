import { useState } from 'react'
import { Mail, X } from 'lucide-react'

interface Props {
  nomePaciente: string
  emailPaciente?: string
  emailTerapeuta?: string
  nomeTerapeuta: string
  crfto: string
  tipoRelatorio: string
  dataGeracao: string
  onEnviar: (dados: { para: string; cc: string; assunto: string; mensagem: string }) => void
  onFechar: () => void
}

const tiposLabel: Record<string, string> = {
  evolucao: 'Evolução', avaliacao: 'Avaliação', alta: 'Alta', encaminhamento: 'Encaminhamento',
}

export function ModalEmail({
  nomePaciente, emailPaciente = '', emailTerapeuta = '',
  nomeTerapeuta, crfto, tipoRelatorio, dataGeracao,
  onEnviar, onFechar,
}: Props) {
  const tipo = tiposLabel[tipoRelatorio] || tipoRelatorio
  const [para, setPara] = useState(emailPaciente)
  const [cc, setCc] = useState('')
  const [assunto, setAssunto] = useState(`Relatório de ${tipo} — ${nomePaciente} — ${dataGeracao}`)
  const [mensagem, setMensagem] = useState(
`Prezado(a) responsável,

Segue em anexo o relatório de ${tipo} do(a) paciente ${nomePaciente}, gerado em ${dataGeracao}.

Em caso de dúvidas, estou à disposição.

Atenciosamente,
${nomeTerapeuta}
Terapeuta Ocupacional | CRF/TO: ${crfto}`
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
              <Mail size={16} className="text-green-600" />
            </div>
            <h3 className="font-bold text-gray-800">Enviar por e-mail</h3>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {emailTerapeuta && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
            📤 Enviado a partir de: <strong>{emailTerapeuta}</strong>
          </div>
        )}

        <div className="space-y-4">
          {[
            { label: 'Para', value: para, set: setPara, placeholder: 'email@destinatario.com' },
            { label: 'CC (opcional)', value: cc, set: setCc, placeholder: 'outro@email.com' },
            { label: 'Assunto', value: assunto, set: setAssunto, placeholder: '' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
              <input
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className="w-full h-11 px-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-green-400"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Mensagem</label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={7}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-green-400 resize-none"
            />
          </div>
          <p className="text-xs text-gray-400">📎 O PDF do relatório será anexado automaticamente</p>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onFechar} className="flex-1 py-3 border border-gray-200 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => onEnviar({ para, cc, assunto, mensagem })}
            disabled={!para}
            className="flex-1 py-3 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enviar e-mail
          </button>
        </div>
      </div>
    </div>
  )
}
