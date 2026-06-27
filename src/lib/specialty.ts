export type Specialty = 'terapeuta_ocupacional' | 'holistico'

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  terapeuta_ocupacional: 'Terapeuta Ocupacional',
  holistico: 'Terapeuta Holístico',
}

export const SPECIALTY_OPTIONS: { key: Specialty; label: string; desc: string }[] = [
  { key: 'terapeuta_ocupacional', label: 'Terapeuta Ocupacional', desc: 'Relatórios clínicos com CID-10, CIF e normas COFFITO' },
  { key: 'holistico', label: 'Terapeuta Holístico / Terapias Alternativas', desc: 'Relatórios de sessão focados em bem-estar, sem diagnóstico clínico' },
]

export function isClinicalSpecialty(specialty?: string): boolean {
  return specialty !== 'holistico'
}

export function getSpecialtyLabel(specialty?: string): string {
  return SPECIALTY_LABELS[(specialty as Specialty) ?? 'terapeuta_ocupacional'] ?? SPECIALTY_LABELS.terapeuta_ocupacional
}
