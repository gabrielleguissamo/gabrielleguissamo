export const DEFAULT_SPECIALTY_NAME = 'Terapeuta Ocupacional'

export function getSpecialtyLabel(specialtyName?: string | null): string {
  return specialtyName?.trim() || DEFAULT_SPECIALTY_NAME
}
