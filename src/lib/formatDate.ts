export function formatarData(data: string | Date): string {
  // Handle YYYY-MM-DD strings without timezone shift
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [year, month, day] = data.split('-')
    return `${day}/${month}/${year.slice(-2)}`
  }
  const d = typeof data === 'string' ? new Date(data) : data
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = String(d.getFullYear()).slice(-2)
  return `${dia}/${mes}/${ano}`
}

export function calcAge(birthDate: string): number {
  // Parse manual evita o bug de new Date('YYYY-MM-DD') interpretar como UTC
  // e desalinhar a idade perto do aniversario em fusos atras de UTC.
  const [y, m, d] = birthDate.split('-').map(Number)
  const hoje = new Date()
  let idade = hoje.getFullYear() - y
  const diffMes = (hoje.getMonth() + 1) - m
  if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < d)) idade--
  return idade
}

export function formatarDataElegante(data: string | Date): string {
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [year, month, day] = data.split('-')
    return `${day}/${month}/${year.slice(-2)}`
  }
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
