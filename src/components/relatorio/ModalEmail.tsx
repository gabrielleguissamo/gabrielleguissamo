import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

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
  enviando?: boolean
}

const tiposLabel: Record<string, string> = {
  evolucao: 'Evolução', avaliacao: 'Avaliação', alta: 'Alta', encaminhamento: 'Encaminhamento',
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function ModalEmail({
  nomePaciente, emailPaciente = '', emailTerapeuta = '',
  nomeTerapeuta, crfto, tipoRelatorio, dataGeracao,
  onEnviar, onFechar, enviando = false,
}: Props) {
  const tipo = tiposLabel[tipoRelatorio] || tipoRelatorio
  const [para, setPara] = useState(emailPaciente)
  const [cc, setCc] = useState('')
  const paraInvalido = para.trim().length > 0 && !isValidEmail(para)
  const ccInvalido = cc.trim().length > 0 && !isValidEmail(cc)
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
    <Modal onClose={onFechar} maxWidth="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
            <Mail size={16} className="text-green-600" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-ink">Enviar por e-mail</h3>
        </div>

        {emailTerapeuta && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
            📤 Enviado a partir de: <strong>{emailTerapeuta}</strong>
          </div>
        )}

        <div className="space-y-4">
          {[
            { label: 'Para', value: para, set: setPara, placeholder: 'email@destinatario.com', invalido: paraInvalido },
            { label: 'CC (opcional)', value: cc, set: setCc, placeholder: 'outro@email.com', invalido: ccInvalido },
            { label: 'Assunto', value: assunto, set: setAssunto, placeholder: '', invalido: false },
          ].map(({ label, value, set, placeholder, invalido }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
              <input
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className={`w-full h-11 px-4 text-sm border rounded-xl focus:outline-none ${invalido ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-green-400'}`}
              />
              {invalido && <p className="text-xs text-red-500 mt-1">Digite um e-mail válido.</p>}
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
          <p className="text-xs text-ink-4">📎 O PDF do relatório será anexado automaticamente</p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" fullWidth onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            fullWidth
            onClick={() => onEnviar({ para, cc, assunto, mensagem })}
            disabled={!para || paraInvalido || ccInvalido}
            loading={enviando}
          >
            Enviar e-mail
          </Button>
        </div>
    </Modal>
  )
}
