const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const PROXY_URL = `${SUPABASE_URL}/functions/v1/gerar-relatorio`

export async function gerarRelatorio(params: {
  briefing: string
  tipoRelatorio: string
  nomePaciente: string
  financiamento: 'convenio' | 'particular'
  cidPrincipal: string
  cidSecundario?: string
  cif?: string
  tuss?: string
  periodoInicio: string
  periodoFim: string
  nomeTerapeuta: string
  crfto: string
}): Promise<string> {
  const { briefing, tipoRelatorio, nomePaciente, financiamento,
    cidPrincipal, cidSecundario, cif, tuss,
    periodoInicio, periodoFim, nomeTerapeuta, crfto } = params

  const cabecalhoDados = `DADOS DO DOCUMENTO:
- Paciente: ${nomePaciente}
- Terapeuta Responsável: ${nomeTerapeuta} | CRF/TO: ${crfto}
- Tipo de Relatório: ${tipoRelatorio.toUpperCase()}
- Período de Referência: ${periodoInicio} a ${periodoFim}
- CID-10 Principal: ${cidPrincipal}
${cidSecundario ? `- CID-10 Secundário: ${cidSecundario}` : ''}
${cif ? `- Classificação CIF: ${cif}` : ''}
- Financiamento: ${financiamento === 'convenio' ? `Convênio/Plano de Saúde | Código TUSS: ${tuss || 'não informado'}` : 'Particular'}`

  const secoesPorTipo: Record<string, string> = {
    evolucao: `SEÇÕES OBRIGATÓRIAS:
1. IDENTIFICAÇÃO
2. PERÍODO DE REFERÊNCIA
3. DIAGNÓSTICO (CID-10)
4. PERFIL DE FUNCIONALIDADE
5. OBJETIVOS TERAPÊUTICOS DO PERÍODO
6. ATIVIDADES E INTERVENÇÕES REALIZADAS
7. EVOLUÇÃO CLÍNICA E FUNCIONAL
8. ANÁLISE TÉCNICA
${financiamento === 'convenio' ? '9. JUSTIFICATIVA DE CONTINUIDADE\n10. METAS PARA O PRÓXIMO PERÍODO\n11. CONCLUSÃO' : '9. RECOMENDAÇÕES\n10. METAS PARA O PRÓXIMO PERÍODO\n11. CONCLUSÃO'}`,

    avaliacao: `SEÇÕES OBRIGATÓRIAS:
1. IDENTIFICAÇÃO
2. MOTIVO DA AVALIAÇÃO
3. DIAGNÓSTICO (CID-10)
4. HISTÓRICO CLÍNICO E OCUPACIONAL
5. INSTRUMENTOS APLICADOS E RESULTADOS
6. ANÁLISE DAS ÁREAS DE OCUPAÇÃO
7. HABILIDADES DE DESEMPENHO
8. FATORES CONTEXTUAIS
9. HIPÓTESE DIAGNÓSTICA OCUPACIONAL
10. PROGNÓSTICO
${financiamento === 'convenio' ? '11. PLANO TERAPÊUTICO COM JUSTIFICATIVA\n12. FREQUÊNCIA E DURAÇÃO\n13. CONCLUSÃO' : '11. PLANO TERAPÊUTICO\n12. CONCLUSÃO'}`,

    alta: `SEÇÕES OBRIGATÓRIAS:
1. IDENTIFICAÇÃO
2. PERÍODO TOTAL DE ACOMPANHAMENTO
3. DIAGNÓSTICO (CID-10)
4. RESUMO DO PROCESSO TERAPÊUTICO
5. OBJETIVOS INICIAIS E RESULTADOS ALCANÇADOS
6. EVOLUÇÃO GLOBAL DO PACIENTE
7. CONDIÇÃO FUNCIONAL NA ALTA
8. CRITÉRIO DE ALTA
9. ORIENTAÇÕES PARA MANUTENÇÃO DOS GANHOS
10. RECOMENDAÇÕES PÓS-ALTA
11. CONCLUSÃO`,

    encaminhamento: `SEÇÕES OBRIGATÓRIAS:
1. IDENTIFICAÇÃO
2. DIAGNÓSTICO (CID-10)
3. MOTIVO DO ENCAMINHAMENTO
4. RESUMO DO QUADRO CLÍNICO
5. INTERVENÇÕES DE TO REALIZADAS
6. EVOLUÇÃO OBSERVADA
7. LIMITAÇÕES ATUAIS E NECESSIDADES
8. JUSTIFICATIVA TÉCNICA
9. ESPECIALIDADE/SERVIÇO DE DESTINO
10. INFORMAÇÕES PARA O PROFISSIONAL RECEPTOR
11. CONCLUSÃO`,
  }

  const instrucaoFinanciamento = financiamento === 'convenio'
    ? 'Este relatório é para CONVÊNIO. Use terminologia ANS/TISS, linguagem objetiva para auditores médicos e justificativa robusta para autorização de procedimentos.'
    : 'Este relatório é para PARTICULAR. Use linguagem técnica clara e acessível ao paciente e família.'

  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    system: 'Você é especialista em Terapia Ocupacional com domínio em documentação clínica, CID-10, CIF e normas do COFFITO. Gera relatórios clínicos profissionais prontos para uso após validação do terapeuta.',
    messages: [{
      role: 'user',
      content: `Gere um relatório clínico de Terapia Ocupacional.

${cabecalhoDados}

${instrucaoFinanciamento}

BRIEFING DO TERAPEUTA:
${briefing}

${secoesPorTipo[tipoRelatorio] ?? secoesPorTipo.evolucao}

REGRAS: Português formal, terminologia COFFITO/AOTA, conteúdo real baseado no briefing, sem placeholders, começar direto pelo conteúdo.

FORMATAÇÃO DO TEXTO:
- Use ## para títulos de seção (ex: ## 2. DIAGNÓSTICO)
- Use **texto** apenas para dados importantes como nome do paciente, diagnóstico e datas
- Use - para listas quando necessário
- Separe seções com uma linha em branco
- NÃO use --- como separador
- NÃO use # com apenas um sustenido
- NÃO repita o título "RELATÓRIO CLÍNICO DE TERAPIA OCUPACIONAL" no corpo
- NÃO inclua a seção 1. IDENTIFICAÇÃO com dados do paciente — esses dados já aparecem no cabeçalho
- Comece o conteúdo diretamente a partir da seção 2`,
    }],
  }

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json() as { error?: string; content?: { text: string }[] }

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Erro ${response.status}`)
  }

  return data.content![0].text
}

export async function gerarResumoFamiliar(params: {
  relatorioTecnico: string
  nomePaciente: string
  nomeTerapeuta: string
  tipoRelatorio: string
}): Promise<string> {
  const { relatorioTecnico, nomePaciente, nomeTerapeuta, tipoRelatorio } = params

  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: 'Você é um terapeuta ocupacional que sabe explicar situações clínicas complexas de forma simples, carinhosa e clara para famílias e responsáveis.',
    messages: [{
      role: 'user',
      content: `Com base no relatório técnico abaixo, crie um RESUMO PARA FAMÍLIA do(a) paciente ${nomePaciente}, referente ao relatório de ${tipoRelatorio}.

RELATÓRIO TÉCNICO:
${relatorioTecnico}

INSTRUÇÕES:
- Escreva em linguagem simples, sem termos técnicos
- Se precisar usar algum termo técnico, explique entre parênteses
- Tom acolhedor, positivo e encorajador
- Máximo 3 páginas (aproximadamente 600 palavras)
- Use ## para títulos de seção
- NÃO inclua seção de identificação — os dados já aparecem no cabeçalho
- Estrutura:

## Como está ${nomePaciente} hoje
## O que trabalhamos juntos
## Avanços e conquistas
## O que ainda estamos desenvolvendo
## Como a família pode ajudar em casa
## Próximos passos

Assine no final: ${nomeTerapeuta} — Terapeuta Ocupacional

Comece direto pelo conteúdo, sem introduções.`,
    }],
  }

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json() as { error?: string; content?: { text: string }[] }
  if (!response.ok || data.error) throw new Error(data.error ?? `Erro ${response.status}`)
  return data.content![0].text
}

export function traduzirErroAPI(erro: Error): string {
  const msg = erro.message.toLowerCase()
  if (msg.includes('authentication') || msg.includes('401') || msg.includes('invalid x-api-key'))
    return 'Chave da API inválida. Verifique as configurações no Supabase.'
  if (msg.includes('rate limit') || msg.includes('429'))
    return 'Limite de requisições atingido. Aguarde alguns segundos e tente novamente.'
  if (msg.includes('quota') || msg.includes('billing') || msg.includes('credit'))
    return 'Créditos da API esgotados. Acesse console.anthropic.com para adicionar créditos.'
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  return `Erro ao gerar relatório: ${erro.message}`
}
