export type PlanKey = 'inicial' | 'profissional' | 'business'

export const PLAN_LIMITS: Record<PlanKey, { patients: number; reportsPerMonth: number }> = {
  inicial: { patients: 15, reportsPerMonth: 20 },
  profissional: { patients: 150, reportsPerMonth: 200 },
  business: { patients: Infinity, reportsPerMonth: Infinity },
}

// Relatórios gratuitos vitalícios para quem ainda não assinou nenhum plano.
export const FREE_REPORT_LIMIT = 5
