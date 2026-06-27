export interface EdicaoRelatorio {
  data: string
  hora: string
  autor: string
  descricao: string
}

export interface RelatorioGerado {
  id: string
  patient_name: string
  patient_id: string
  tipo: 'evolucao' | 'avaliacao' | 'alta' | 'encaminhamento'
  financiamento: 'convenio' | 'particular'
  cid_principal: string
  cid_secundario?: string
  cif?: string
  tuss?: string
  conteudo: string
  conteudo_original: string
  resumo_familiar?: string
  data_geracao: string
  hora_geracao: string
  periodo_inicio: string
  periodo_fim: string
  validado: boolean
  historico_edicoes: EdicaoRelatorio[]
}

export interface Profile {
  id: string
  full_name: string
  email: string
  crf_to?: string
  specialty: 'terapeuta_ocupacional' | 'holistico'
  bio?: string
  phone?: string
  city?: string
  state?: string
  email_envio?: string
  logo_url?: string
  plan: 'inicial' | 'profissional' | 'business'
  free_reports_used: number
  stripe_customer_id?: string
  avatar_url?: string
  notif_lembretes?: boolean
  notif_confirmacoes?: boolean
  notif_relatorio_semanal?: boolean
  notif_atualizacoes?: boolean
  created_at: string
}

export interface Patient {
  id: string
  user_id: string
  name: string
  birth_date: string
  cpf?: string
  diagnosis?: string
  guardian_name?: string
  phone?: string
  email?: string
  insurance?: string
  status: 'ativo' | 'em_espera' | 'inativo'
  session_value?: number
  created_at: string
}

export interface AppSession {
  id: string
  user_id: string
  patient_id: string
  date: string
  time: string
  duration: 30 | 45 | 60 | 90
  type: 'domiciliar' | 'online' | 'escola' | 'presencial'
  status: 'confirmado' | 'pendente' | 'cancelado'
  notes?: string
  value?: number | null
  google_event_id?: string | null
  created_at: string
}

export interface MedicalRecord {
  id: string
  patient_id: string
  session_id?: string
  date: string
  content: string
  assessment_type?: string
  record_type?: 'evolucao' | 'avaliacao' | 'anamnese'
  created_at: string
}

export interface PatientDocument {
  id: string
  user_id: string
  patient_id: string
  name: string
  file_path: string
  file_type?: string
  size?: number
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  patient_id?: string
  session_id?: string | null
  date: string
  amount: number
  type: 'sessao' | 'avaliacao' | 'material' | 'mensalidade'
  payment_method?: string
  status: 'pago' | 'pendente' | 'cancelado'
  created_at: string
}
