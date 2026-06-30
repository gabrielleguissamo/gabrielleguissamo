import { supabase } from './supabase'

function removerCabecalhoDuplicado(texto: string): string {
  const linhas = texto.split('\n')
  const idx = linhas.findIndex(l => /^#{1,3}\s+/.test(l.trim()))
  if (idx <= 0) return texto
  const antes = linhas.slice(0, idx).join('\n')
  // So remove se o bloco antes do primeiro titulo parecer um cabecalho de
  // identificacao repetido (curto e contendo "Paciente:"), nunca conteudo real.
  if (/Paciente:/i.test(antes) && antes.length < 600) {
    return linhas.slice(idx).join('\n').trim()
  }
  return texto
}

async function callAI(system: string, user: string, maxTokens = 3000): Promise<string> {
  const { data, error: invokeError } = await supabase.functions.invoke('gerar-relatorio', {
    body: {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    },
  })
  if (invokeError) throw new Error(invokeError.message ?? 'Erro ao chamar a IA')
  if (data?.error) throw new Error(data.error)
  if (!data?.content?.[0]?.text) throw new Error('Resposta vazia da IA')
  return data.content[0].text
}

export interface ParamsRelatorio {
  briefing: string
  tipoRelatorio: 'evolucao' | 'avaliacao' | 'alta' | 'encaminhamento'
  nomePaciente: string
  dataNascimento?: string
  isClinical?: boolean
  especialidadeNome?: string
  financiamento?: 'convenio' | 'particular'
  cidPrincipal?: string
  cidSecundario?: string
  cif?: string
  tuss?: string
  periodoInicio: string
  periodoFim: string
  nomeTerapeuta: string
  crfto: string
}

async function gerarRelatorioHolistico(p: ParamsRelatorio): Promise<string> {
  const nomeEspecialidade = p.especialidadeNome?.trim() || 'Terapeuta Holístico'
  const secoes: Record<string, string> = {
    evolucao: `SEÇÕES OBRIGATÓRIAS:
2. PERÍODO DE REFERÊNCIA
3. OBJETIVOS DA SESSÃO
4. PRÁTICAS E TÉCNICAS UTILIZADAS
5. PERCEPÇÕES E OBSERVAÇÕES
6. EVOLUÇÃO E ESTADO ATUAL
7. RECOMENDAÇÕES
8. CONCLUSÃO`,
    avaliacao: `SEÇÕES OBRIGATÓRIAS:
2. MOTIVO DA BUSCA
3. HISTÓRICO RELATADO
4. OBSERVAÇÕES INICIAIS
5. OBJETIVOS PROPOSTOS
6. PLANO DE ACOMPANHAMENTO
7. CONCLUSÃO`,
    alta: `SEÇÕES OBRIGATÓRIAS:
2. RESUMO DO ACOMPANHAMENTO
3. CONQUISTAS E EVOLUÇÃO
4. ORIENTAÇÕES FINAIS
5. CONCLUSÃO`,
    encaminhamento: `SEÇÕES OBRIGATÓRIAS:
2. MOTIVO DO ENCAMINHAMENTO
3. RESUMO DO ACOMPANHAMENTO
4. OBSERVAÇÕES RELEVANTES
5. CONCLUSÃO`,
  }

  const system = `Você é especialista em ${nomeEspecialidade}, com domínio em documentação de sessão acolhedora e profissional adequada a essa prática específica. Gera relatórios de sessão prontos para uso após validação do terapeuta, sem usar linguagem de diagnóstico médico.`

  const user = `Gere relatório de sessão de ${nomeEspecialidade} — tipo: ${p.tipoRelatorio.toUpperCase()}

DADOS:
- Paciente: ${p.nomePaciente}${p.dataNascimento ? ` | Data de nascimento: ${p.dataNascimento}` : ''}
- Terapeuta: ${p.nomeTerapeuta} (${nomeEspecialidade})${p.crfto ? ` | Registro: ${p.crfto}` : ''}
- Período: ${p.periodoInicio} a ${p.periodoFim}

BRIEFING DO TERAPEUTA:
${p.briefing}

${secoes[p.tipoRelatorio]}

REGRAS:
- Português brasileiro formal, tom acolhedor e respeitoso
- Foco em bem-estar, autoconhecimento e percepções da sessão, com vocabulário e conceitos coerentes especificamente com a prática de ${nomeEspecialidade} — NUNCA usar linguagem de diagnóstico médico, CID ou termos clínicos
- Conteúdo real baseado no briefing — sem texto genérico
- NUNCA usar placeholders entre colchetes (ex: "[descrever aqui]", "[data da sessão]"). Se um dado não foi fornecido, OMITA a frase ou o dado inteiro — não invente e não deixe lacunas visíveis
- Usar ## para títulos de seção
- Usar **negrito** apenas para dados importantes
- NÃO usar --- como separador
- NÃO repita o cabeçalho de identificação (paciente, data de nascimento, terapeuta, registro, período, data) — esses dados já aparecem no cabeçalho do documento
- Começar diretamente pela seção 2`

  const resposta = await callAI(system, user, 3000)
  return removerCabecalhoDuplicado(resposta)
}

export async function gerarRelatorio(p: ParamsRelatorio): Promise<string> {
  if (p.isClinical === false) return gerarRelatorioHolistico(p)

  const secoes: Record<string, string> = {
    evolucao: secoesEvolucao(p.financiamento ?? 'particular'),
    avaliacao: secoesAvaliacao(p.financiamento ?? 'particular'),
    alta: secoesAlta(),
    encaminhamento: secoesEncaminhamento(),
  }

  const system = `Você é especialista em Terapia Ocupacional com domínio em documentação clínica, CID-10, CIF e normas COFFITO. Gera relatórios clínicos profissionais prontos para uso após validação do terapeuta.`

  const user = `Gere relatório clínico de TO — tipo: ${p.tipoRelatorio.toUpperCase()}

DADOS:
- Paciente: ${p.nomePaciente}${p.dataNascimento ? ` | Data de nascimento: ${p.dataNascimento}` : ''}
- Terapeuta: ${p.nomeTerapeuta}${p.crfto ? ` | CRF/TO: ${p.crfto}` : ''}
- Período: ${p.periodoInicio} a ${p.periodoFim}
- CID-10: ${p.cidPrincipal}${p.cidSecundario ? ` / ${p.cidSecundario}` : ''}
${p.cif ? `- CIF: ${p.cif}` : ''}
- Financiamento: ${p.financiamento === 'convenio' ? `Convênio | TUSS: ${p.tuss || 'não informado'}` : 'Particular'}

${p.financiamento === 'convenio'
  ? 'Use terminologia ANS/TISS. Inclua justificativa robusta para auditores médicos.'
  : 'Linguagem técnica com clareza acessível ao paciente e família.'}

BRIEFING DO TERAPEUTA:
${p.briefing}

${secoes[p.tipoRelatorio]}

REGRAS:
- Português brasileiro formal
- Terminologia COFFITO/AOTA
- Conteúdo real baseado no briefing — sem texto genérico
- NUNCA usar placeholders entre colchetes (ex: "[descrever aqui]", "[data da sessão]", "[tempo de sessão]", "[A inserir]", "[a definir]"). Se um dado não foi fornecido (duração, frequência, CRF, data de nascimento etc.), OMITA a frase ou o dado inteiro — não invente e não deixe lacunas visíveis
- Usar ## para títulos de seção
- Usar **negrito** apenas para dados importantes
- NÃO usar --- como separador
- NÃO repita o cabeçalho de identificação (paciente, data de nascimento, idade, terapeuta, CRF, período, diagnóstico, financiamento, data) — esses dados já aparecem no cabeçalho do documento
- Começar diretamente pela seção 2`

  const resposta = await callAI(system, user, 3000)
  return removerCabecalhoDuplicado(resposta)
}

export async function gerarResumoFamiliar(params: {
  relatorioTecnico: string
  nomePaciente: string
  nomeTerapeuta: string
  tipoRelatorio: string
  especialidade?: string
}): Promise<string> {
  const especialidadeLabel = params.especialidade?.trim() || 'Terapeuta Ocupacional'
  const system = `Você é ${especialidadeLabel} que explica situações de atendimento de forma simples, acolhedora e clara para famílias e responsáveis.`

  const user = `Com base no relatório técnico abaixo, crie um RESUMO PARA FAMÍLIA de ${params.nomePaciente} — relatório de ${params.tipoRelatorio}.

RELATÓRIO TÉCNICO:
${params.relatorioTecnico}

ESTRUTURA (linguagem simples, sem jargões, ~600 palavras):

## Como está ${params.nomePaciente} hoje

## O que trabalhamos juntos

## Avanços e conquistas

## O que ainda estamos desenvolvendo

## Como a família pode ajudar em casa

## Próximos passos

Assine: ${params.nomeTerapeuta} — ${especialidadeLabel}
Comece direto pelo conteúdo.`

  return callAI(system, user, 1500)
}

function secoesEvolucao(f: string) {
  return `SEÇÕES OBRIGATÓRIAS:
2. PERÍODO DE REFERÊNCIA
3. DIAGNÓSTICO (CID-10)
4. PERFIL DE FUNCIONALIDADE
5. OBJETIVOS TERAPÊUTICOS DO PERÍODO
6. ATIVIDADES E INTERVENÇÕES REALIZADAS
7. EVOLUÇÃO CLÍNICA E FUNCIONAL
8. ANÁLISE TÉCNICA
${f === 'convenio' ? '9. JUSTIFICATIVA DE CONTINUIDADE\n10. METAS PARA O PRÓXIMO PERÍODO\n11. CONCLUSÃO' : '9. RECOMENDAÇÕES\n10. METAS PARA O PRÓXIMO PERÍODO\n11. CONCLUSÃO'}`
}

function secoesAvaliacao(f: string) {
  return `SEÇÕES OBRIGATÓRIAS:
2. MOTIVO DA AVALIAÇÃO
3. DIAGNÓSTICO (CID-10)
4. HISTÓRICO CLÍNICO E OCUPACIONAL
5. INSTRUMENTOS APLICADOS E RESULTADOS
6. ÁREAS DE OCUPAÇÃO
7. HABILIDADES DE DESEMPENHO
8. FATORES CONTEXTUAIS
9. HIPÓTESE DIAGNÓSTICA OCUPACIONAL
10. PROGNÓSTICO
${f === 'convenio' ? '11. PLANO TERAPÊUTICO COM JUSTIFICATIVA\n12. FREQUÊNCIA E DURAÇÃO PROPOSTAS\n13. CONCLUSÃO' : '11. PLANO TERAPÊUTICO PROPOSTO\n12. CONCLUSÃO'}`
}

function secoesAlta() {
  return `SEÇÕES OBRIGATÓRIAS:
2. PERÍODO TOTAL DE ACOMPANHAMENTO
3. DIAGNÓSTICO (CID-10)
4. RESUMO DO PROCESSO TERAPÊUTICO
5. OBJETIVOS INICIAIS E RESULTADOS ALCANÇADOS
6. EVOLUÇÃO GLOBAL
7. CONDIÇÃO FUNCIONAL NA ALTA
8. CRITÉRIO DE ALTA
9. ORIENTAÇÕES PARA MANUTENÇÃO DOS GANHOS
10. RECOMENDAÇÕES PÓS-ALTA
11. CONCLUSÃO`
}

function secoesEncaminhamento() {
  return `SEÇÕES OBRIGATÓRIAS:
2. DIAGNÓSTICO (CID-10)
3. MOTIVO DO ENCAMINHAMENTO
4. RESUMO DO QUADRO CLÍNICO
5. INTERVENÇÕES DE TO REALIZADAS
6. EVOLUÇÃO OBSERVADA
7. LIMITAÇÕES ATUAIS
8. JUSTIFICATIVA TÉCNICA
9. ESPECIALIDADE/SERVIÇO DE DESTINO
10. INFORMAÇÕES PARA O PROFISSIONAL RECEPTOR
11. CONCLUSÃO`
}

export async function gerarResumoPaciente(params: {
  nomePaciente: string
  diagnostico?: string
  registros: { data: string; tipo: string; conteudo: string }[]
}): Promise<string> {
  const system = `Você é terapeuta ocupacional experiente, sintetizando o histórico clínico de um paciente para consulta rápida do próprio terapeuta antes de uma sessão.`

  const historico = params.registros
    .slice(0, 20)
    .map(r => `[${r.data} — ${r.tipo}] ${r.conteudo}`)
    .join('\n\n')

  const user = `Paciente: ${params.nomePaciente}
${params.diagnostico ? `Diagnóstico: ${params.diagnostico}` : ''}

HISTÓRICO DE REGISTROS (evoluções, avaliações, anamnese):
${historico || 'Nenhum registro encontrado ainda.'}

Gere um resumo objetivo (máx. 200 palavras) com:
- Quadro geral do paciente
- Principais avanços observados
- Pontos de atenção atuais
- Sugestão de foco para a próxima sessão

Português brasileiro, direto, sem placeholders. Se não houver histórico suficiente, diga isso claramente em vez de inventar.`

  return callAI(system, user, 600)
}

export function traduzirErroAPI(erro: Error): string {
  const m = erro.message.toLowerCase()
  if (m.includes('401') || m.includes('invalid x-api-key')) return 'Chave da API inválida. Verifique as configurações no Supabase.'
  if (m.includes('429') || m.includes('rate limit')) return 'Limite de requisições atingido. Aguarde alguns segundos.'
  if (m.includes('billing') || m.includes('credit')) return 'Créditos esgotados. Acesse console.anthropic.com para recarregar.'
  if (m.includes('não configurado') || m.includes('api key')) return 'API não configurada. Verifique o .env.local.'
  if (m.includes('network') || m.includes('fetch')) return 'Erro de conexão. Verifique sua internet.'
  return 'Erro ao gerar. Tente novamente ou refaça o briefing.'
}
